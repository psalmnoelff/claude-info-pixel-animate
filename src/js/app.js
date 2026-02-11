// Entry point - wires everything together
(function () {
  const canvas = document.getElementById('game-canvas');
  const settingsOverlay = document.getElementById('settings-overlay');

  // Core systems
  const renderer = new CanvasRenderer(canvas);
  const office = new Office(renderer);
  const whiteboard = new Whiteboard(renderer);
  const desks = CONFIG.DESKS.map((d, i) => new Desk(renderer, d.x, d.y, i));
  const leaderDesk = new Desk(renderer, CONFIG.LEADER_DESK_POS.x, CONFIG.LEADER_DESK_POS.y, -1);
  const door = new Door(renderer);
  const particles = new ParticleSystem();
  const appState = new AppState();
  const charMgr = new CharacterManager();
  const stateMachine = new StateMachine(charMgr, whiteboard, door, particles, appState);
  const hud = new HUD(renderer, appState);

  // Claude integration
  const streamParser = new StreamParser();
  const tokenTracker = new TokenTracker(appState);
  const eventClassifier = new EventClassifier(stateMachine, tokenTracker);
  const connector = new ClaudeConnector(streamParser, eventClassifier);

  // Settings screen
  const settings = new SettingsScreen(settingsOverlay, connector);

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

    // Update desk glow for worker desks
    for (const desk of desks) {
      desk.occupied = charMgr.deskOccupancy[desk.index];
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

    // Desks (behind characters)
    for (const desk of desks) {
      desk.draw();
    }
    leaderDesk.draw();

    // Characters (sorted by Y)
    charMgr.draw(renderer);

    // Desk chairs (in front of characters sitting)
    // Only draw chairs for unoccupied desks
    // for (const desk of desks) {
    //   if (!desk.occupied) desk.drawChair();
    // }

    // Particles (on top)
    particles.draw(renderer);

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

    // Test keys
    if (e.key >= '0' && e.key <= '5') {
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
  });

  // Initial state
  charMgr.leader.setIdle();
  charMgr.leader.x = CONFIG.LEADER_START.x;
  charMgr.leader.y = CONFIG.LEADER_START.y;
})();
