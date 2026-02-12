// Entry point - wires everything together
(function () {
  const canvas = document.getElementById('game-canvas');
  const settingsOverlay = document.getElementById('settings-overlay');
  const statusPopupOverlay = document.getElementById('status-popup-overlay');

  // Core systems
  const renderer = new CanvasRenderer(canvas);
  const whiteboard = new Whiteboard(renderer);
  const desks = CONFIG.DESKS.map((d, i) => new Desk(renderer, d.x, d.y, i));
  const leaderDesk = new Desk(renderer, CONFIG.LEADER_DESK_POS.x, CONFIG.LEADER_DESK_POS.y, -1, true);
  const door = new Door(renderer);
  const particles = new ParticleSystem();
  const appState = new AppState();
  const charMgr = new CharacterManager();
  const stateMachine = new StateMachine(charMgr, whiteboard, door, particles, appState);
  const fireStatus = new FireStatus(renderer);
  const office = new Office(renderer, stateMachine, fireStatus);
  const statusPopup = new StatusPopup(statusPopupOverlay);
  const hud = new HUD(renderer, appState);

  // Claude integration
  const streamParser = new StreamParser();
  const tokenTracker = new TokenTracker(appState);
  const eventClassifier = new EventClassifier(stateMachine, tokenTracker);
  const connector = new ClaudeConnector(streamParser, eventClassifier);

  // Settings screen
  const settings = new SettingsScreen(settingsOverlay, connector, appState);

  // Demo mode cycling
  let demoMode = false;
  let demoTimer = 0;
  const demoSequence = [STATES.THINKING, STATES.DELEGATING, STATES.CODING, STATES.MULTI_AGENT, STATES.CODING, STATES.DONE, STATES.IDLE];
  let demoStep = 0;

  settings.onDemo = () => {
    demoMode = true;
    demoStep = 0;
    demoTimer = 0;
    stateMachine.transition(demoSequence[0]);
  };

  // Connect to Claude IPC if available
  connector.connect();

  // Wire RSS status updates
  if (window.claude && window.claude.onStatusRSS) {
    window.claude.onStatusRSS((data) => {
      fireStatus.updateStatus(data);
      if (statusPopup.visible) {
        statusPopup.updateIncidents(data.hasActiveIncident ? data.activeIncidents : data.recentIncidents);
      }
    });
  }

  // Wire usage updates from session log scanning to appState
  connector.onUsageUpdate = (data) => {
    appState.updateFromUsageData(data);
  };

  // Wire session list updates
  connector.onSessionsList = (sessions) => {
    appState.availableSessions = sessions;
    settings.updateSessionList(sessions);
  };

  // Auto-start listening for active Claude Code sessions
  connector.watch();

  // Update function (called at fixed timestep)
  function update(dt) {
    // Demo mode auto-cycling
    if (demoMode) {
      demoTimer += dt;
      if (demoTimer > 4) {
        demoTimer = 0;
        demoStep = (demoStep + 1) % demoSequence.length;
        stateMachine.transition(demoSequence[demoStep]);
      }
    }

    // Update all systems
    door.update(dt);
    stateMachine.update(dt);
    charMgr.update(dt, whiteboard);
    particles.update(dt);
    fireStatus.update(dt);

    // Update desk glow for worker desks (only when worker is actually seated)
    for (const desk of desks) {
      const worker = charMgr.workers.find(w => w.deskIndex === desk.index);
      desk.occupied = worker && (worker.state === 'sitting' || worker.state === 'typing' || worker.state === 'sleeping');
      desk.sleeping = worker && worker.state === 'sleeping';
      desk.update(dt);
    }
    // Update leader desk glow
    leaderDesk.occupied = charMgr.leader.state === 'typing' || charMgr.leader.state === 'sitting';
    leaderDesk.update(dt);
  }

  // Draw function (called every frame)
  function draw() {
    // Clear
    renderer.clear(CONFIG.COL.BLACK);

    // Background
    office.draw();

    // Whiteboard (on wall)
    whiteboard.draw();

    // Door
    door.draw();

    // Y-sorted rendering: desks (with chairs) + characters interleaved by depth
    const drawList = [];

    // Add all desks
    const allDesks = [...desks, leaderDesk];
    for (const desk of allDesks) {
      drawList.push({
        sortY: (desk.tileY + 1) * CONFIG.TILE,
        isChar: false,
        draw: () => { desk.draw(); desk.drawChair(); },
      });
    }

    // Add visible characters
    const allChars = [charMgr.leader, ...charMgr.workers].filter(c => c.visible);
    for (const c of allChars) {
      drawList.push({
        sortY: c.y + CONFIG.TILE,
        isChar: true,
        draw: () => c.draw(renderer),
      });
    }

    // Add janitor if visible
    if (stateMachine.janitor && stateMachine.janitor.visible) {
      const j = stateMachine.janitor;
      drawList.push({
        sortY: j.y + CONFIG.TILE,
        isChar: true,
        draw: () => j.draw(renderer),
      });
    }

    // Sort by Y; on ties desks draw first (characters appear in front)
    drawList.sort((a, b) => {
      if (a.sortY !== b.sortY) return a.sortY - b.sortY;
      return (a.isChar ? 1 : 0) - (b.isChar ? 1 : 0);
    });

    for (const item of drawList) {
      item.draw();
    }

    // Particles (on top)
    particles.draw(renderer);

    // Snow accumulation (after scene + particles, before overlays)
    office.drawSnow();

    // Dim overlay (after scene, before HUD)
    office.drawDimOverlay();

    // HUD
    hud.draw();

    // Screen flash overlay (white flash that fades)
    if (appState.screenFlashTimer > 0) {
      appState.screenFlashTimer -= 1 / 60;
      const alpha = Math.min(1, appState.screenFlashTimer / 0.1) * 0.8;
      renderer.fillRectAlpha(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT, '#ffffff', alpha);
    }

    // Screen shake
    if (appState.screenShakeTimer > 0) {
      appState.screenShakeTimer -= 1 / 60;
      renderer.shakeAmount = Math.max(1, Math.floor(appState.screenShakeTimer * 12));
    } else {
      renderer.shakeAmount = 0;
    }

    // Present to screen
    renderer.present();
  }

  // Game loop
  const loop = new GameLoop(update, draw);
  loop.start();

  // Keyboard handling
  document.addEventListener('keydown', (e) => {
    // ESC: close status popup first, then toggle settings
    if (e.key === 'Escape') {
      if (statusPopup.visible) { statusPopup.hide(); return; }
      settings.toggle();
      return;
    }

    if (settings.visible) return;

    // Test keys (0-9)
    if (e.key >= '0' && e.key <= '9') {
      demoMode = false;
      stateMachine.handleTestKey(e.key);
    }

    // T = toggle always on top
    if (e.key === 't' || e.key === 'T') {
      window.appWindow.toggleAlwaysOnTop().then((isOnTop) => {
        console.log(`Always on top: ${isOnTop ? 'ON' : 'OFF'}`);
        hud.flashMessage(`PIN ON TOP: ${isOnTop ? 'ON' : 'OFF'}`);
      });
    }

    // D = demo mode
    if (e.key === 'd' || e.key === 'D') {
      demoMode = !demoMode;
      if (demoMode) {
        demoStep = 0;
        demoTimer = 0;
        stateMachine.transition(demoSequence[0]);
      }
    }

    // R = reset to initial state and re-listen
    if (e.key === 'r' || e.key === 'R') {
      demoMode = false;
      stateMachine.reset();
      appState.reset();
      connector.watch();
      hud.flashMessage('RESET');
    }

    // E = trigger worker exit sequence (one by one)
    if (e.key === 'e' || e.key === 'E') {
      demoMode = false;
      if (charMgr.getWorkerCount() > 0) {
        stateMachine.startWorkerExitSequence();
        hud.flashMessage('WORKERS EXITING');
      }
    }

    // F = toggle fire test
    if (e.key === 'f' || e.key === 'F') {
      if (fireStatus.targetIntensity > 0) {
        fireStatus.updateStatus({ hasActiveIncident: false, activeIncidents: [], recentIncidents: [] });
        hud.flashMessage('FIRE: OFF');
      } else {
        fireStatus.updateStatus({
          hasActiveIncident: true,
          activeIncidents: [{
            title: 'Test: Elevated API Errors',
            description: 'This is a test incident to preview the fire effect.\nClaude API is experiencing elevated error rates.',
            link: 'https://status.claude.com',
            pubDate: new Date().toUTCString(),
          }],
          recentIncidents: [],
        });
        hud.flashMessage('FIRE: ON');
      }
    }

    // P = toggle panic test
    if (e.key === 'p' || e.key === 'P') {
      demoMode = false;
      if (stateMachine.leaderPanicking) {
        stateMachine.activeWorkTimer = 0;
        charMgr.leader.panicking = false;
        hud.flashMessage('PANIC: OFF');
      } else {
        stateMachine.activeWorkTimer = CONFIG.PANIC_TIMEOUT;
        hud.flashMessage('PANIC: ON');
      }
    }

    // I = toggle snow storm / freeze test
    if (e.key === 'i' || e.key === 'I') {
      demoMode = false;
      if (stateMachine.snowProgress > 0) {
        stateMachine.globalInactivityTimer = 0;
        stateMachine.snowProgress = 0;
        charMgr.leader.freezeProgress = 0;
        for (const w of charMgr.workers) w.freezeProgress = 0;
        hud.flashMessage('SNOW: OFF');
      } else {
        stateMachine.globalInactivityTimer = CONFIG.SNOW_FULL_TIMEOUT;
        hud.flashMessage('SNOW: ON');
      }
    }

    // S = cycle sessions
    if (e.key === 's' || e.key === 'S') {
      if (appState.availableSessions && appState.availableSessions.length > 1) {
        const sessions = appState.availableSessions;
        const currentIdx = sessions.findIndex(s => s.id === appState.selectedSessionId);
        const nextIdx = (currentIdx + 1) % sessions.length;
        appState.selectedSessionId = sessions[nextIdx].id;
        if (window.claude && window.claude.selectSession) {
          window.claude.selectSession(sessions[nextIdx].id);
        }
        hud.flashMessage('SESSION: ' + (sessions[nextIdx].project || sessions[nextIdx].id).substring(0, 16));
      }
    }
  });

  // Click handling for HUD bars
  canvas.addEventListener('click', (e) => {
    if (settings.visible) return;

    // Convert screen coords to buffer coords
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const bufX = (screenX - renderer.offsetX) / renderer.scale;
    const bufY = (screenY - renderer.offsetY) / renderer.scale;

    // Check window clicks for fire status popup
    if (fireStatus.handleClick(bufX, bufY)) {
      const incidents = fireStatus.hasActiveIncident ? fireStatus.activeIncidents : fireStatus.recentIncidents;
      if (incidents.length > 0) statusPopup.show(incidents);
      return;
    }

    hud.handleClick(bufX, bufY);
  });

  // Initial state - lights off, leader hidden (enters when activity detected)
  charMgr.leader.visible = false;
  charMgr.leader.x = CONFIG.DOOR_POS.x;
  charMgr.leader.y = CONFIG.DOOR_POS.y;
  charMgr.leader.setIdle();
})();
