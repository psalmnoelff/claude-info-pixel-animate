// Global scene state machine driven by Claude Code events
const STATES = {
  IDLE: 'IDLE',
  THINKING: 'THINKING',
  DELEGATING: 'DELEGATING',
  CODING: 'CODING',
  DONE: 'DONE',
  MULTI_AGENT: 'MULTI_AGENT',
  OVERFLOW: 'OVERFLOW',
};

class StateMachine {
  constructor(characterManager, whiteboard, door, particles, appState) {
    this.charMgr = characterManager;
    this.whiteboard = whiteboard;
    this.door = door;
    this.particles = particles;
    this.appState = appState;
    this.state = STATES.IDLE;
    this.stateTimer = 0;
    this.sleepParticleTimer = 0;
    this.onStateChange = null; // callback
  }

  getState() {
    return this.state;
  }

  transition(newState) {
    if (this.state === newState) return;

    const oldState = this.state;
    this.state = newState;
    this.stateTimer = 0;
    this.appState.statusText = newState;

    this._onExit(oldState);
    this._onEnter(newState);

    if (this.onStateChange) {
      this.onStateChange(oldState, newState);
    }
  }

  _onExit(state) {
    switch (state) {
      case STATES.IDLE:
      case STATES.DONE:
        this.particles.clear();
        break;
    }
  }

  _onEnter(state) {
    const leader = this.charMgr.leader;

    switch (state) {
      case STATES.IDLE:
        this.whiteboard.clearBoard();
        this.charMgr.clearWorkers();
        leader.goToOwnDesk(() => leader.startSleeping());
        this.door.close();
        this.sleepParticleTimer = 0;
        break;

      case STATES.THINKING:
        leader.goToWhiteboard(this.whiteboard);
        break;

      case STATES.DELEGATING: {
        // Spawn a worker if we don't have any
        if (this.charMgr.getWorkerCount() === 0) {
          this.door.open();
          const worker = this.charMgr.spawnWorker();
          worker.visible = true;
          worker.goToWhiteboard();
          this.appState.agentCount = this.charMgr.getWorkerCount();
        } else {
          // Existing workers gather around whiteboard
          for (const w of this.charMgr.workers) {
            if (!w.isOverflow) {
              w.goToWhiteboard();
            }
          }
        }
        break;
      }

      case STATES.CODING:
        // All workers go to their desks and type
        leader.goToDesk(() => leader.startTyping());
        for (const w of this.charMgr.workers) {
          if (!w.isOverflow) {
            w.goToDeskAndType();
          }
        }
        this.door.close();
        break;

      case STATES.DONE:
        // Everyone sleeps
        leader.goToOwnDesk(() => leader.startSleeping());
        for (const w of this.charMgr.workers) {
          if (w.isOverflow) continue;
          w.goToDeskAndType(() => w.startSleeping());
        }
        this.sleepParticleTimer = 0;
        break;

      case STATES.MULTI_AGENT: {
        // Spawn another worker
        this.door.open();
        const newWorker = this.charMgr.spawnWorker();
        newWorker.visible = true;
        this.appState.agentCount = this.charMgr.getWorkerCount();

        if (newWorker.isOverflow) {
          // Overflow worker phone-walks
          newWorker.startPhoneWalk();
        } else {
          newWorker.enterAndSit();
        }

        // Check if we should be in overflow
        if (this.charMgr.getWorkerCount() > 5) {
          this.state = STATES.OVERFLOW;
          this.appState.statusText = 'OVERFLOW';
        }
        break;
      }

      case STATES.OVERFLOW:
        // Just a visual marker, same as MULTI_AGENT
        break;
    }
  }

  update(dt) {
    this.stateTimer += dt;

    // Sleep ZZZ particles (for both IDLE and DONE states)
    if (this.state === STATES.DONE || this.state === STATES.IDLE) {
      this.sleepParticleTimer += dt;
      if (this.sleepParticleTimer > 1.5) {
        this.sleepParticleTimer = 0;
        // Spawn ZZZ above leader when sleeping
        const leader = this.charMgr.leader;
        if (leader.state === 'sleeping') {
          this.particles.spawnZZZ(leader.x + 4, leader.y);
        }
        // And above sleeping workers (DONE state)
        for (const w of this.charMgr.workers) {
          if (w.state === 'sleeping' && w.visible) {
            this.particles.spawnZZZ(w.x + 4, w.y);
          }
        }
      }
    }

    // Typing sparkles
    if (this.state === STATES.CODING) {
      if (Math.random() < 0.05) {
        for (const w of this.charMgr.workers) {
          if (w.state === 'typing' && Math.random() < 0.3) {
            const desk = CONFIG.DESKS[w.deskIndex];
            if (desk) {
              this.particles.spawnSparkle(
                desk.x * CONFIG.TILE + 8,
                desk.y * CONFIG.TILE + 2,
                CONFIG.COL.YELLOW
              );
            }
          }
        }
      }
    }
  }

  // Handle keyboard testing (1-5 keys)
  handleTestKey(key) {
    switch (key) {
      case '1': this.transition(STATES.THINKING); break;
      case '2': this.transition(STATES.DELEGATING); break;
      case '3': this.transition(STATES.CODING); break;
      case '4': this.transition(STATES.DONE); break;
      case '5': this.transition(STATES.MULTI_AGENT); break;
      case '0': this.transition(STATES.IDLE); break;
    }
  }
}
