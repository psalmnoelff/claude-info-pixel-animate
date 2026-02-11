// Entry point - wires everything together
(function () {
  const canvas = document.getElementById('game-canvas');
  const settingsOverlay = document.getElementById('settings-overlay');

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
  const office = new Office(renderer, stateMachine);
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

    // Update desk glow for worker desks (only when worker is actually seated)
    for (const desk of desks) {
      const worker = charMgr.workers.find(w => w.deskIndex === desk.index);
      desk.occupied = worker && (worker.state === 'sitting' || worker.state === 'typing' || worker.state === 'sleeping');
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
        sortY: c.y + 16,
        isChar: true,
        draw: () => c.draw(renderer),
      });
    }

    // Add janitor if visible
    if (stateMachine.janitor && stateMachine.janitor.visible) {
      const j = stateMachine.janitor;
      drawList.push({
        sortY: j.y + 16,
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

    // Dim overlay (after scene, before HUD)
    office.drawDimOverlay();

    // HUD
    hud.draw();

    // Present to screen
    renderer.present();
  }

  // Game loop
  const loop = new GameLoop(update, draw);
  loop.start();

  // Keyboard handling
  document.addEventListener('keydown', (e) => {
    if (settings.visible) return;

    // Test keys (0-6)
    if (e.key >= '0' && e.key <= '6') {
      demoMode = false;
      stateMachine.handleTestKey(e.key);
    }

    // ESC = settings
    if (e.key === 'Escape') {
      settings.toggle();
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

    hud.handleClick(bufX, bufY);
  });

  // Initial state - lights off, leader hidden (enters when activity detected)
  charMgr.leader.visible = false;
  charMgr.leader.x = CONFIG.DOOR_POS.x;
  charMgr.leader.y = CONFIG.DOOR_POS.y;
  charMgr.leader.setIdle();
})();
