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

    // Worker exit sequence (DONE -> workers leave one by one)
    this.workersExiting = false;
    this.workerExitQueue = [];
    this.workerExitTimer = 0;

    // Lights-out sequence (extended IDLE -> leader exits, lights dim)
    // Start with lights off - leader enters when activity is detected
    this.lightsOn = false;
    this.lightsDimProgress = 0.75; // start fully dimmed
    this.lightsOutSequenceActive = false;
    this.leaderExiting = false;

    // Janitor sequence (context full or compacted -> janitor cleans whiteboard)
    this.janitorActive = false;
    this.janitor = null;
    this.janitorEraseTimer = 0;
    this.janitorEraseCount = 0;
  }

  getState() {
    return this.state;
  }

  transition(newState) {
    if (this.state === newState) return;

    const oldState = this.state;

    // Cancel worker exit sequence if active
    if (this.workersExiting) {
      this._cancelWorkerExit();
    }

    // Cancel lights-out if interrupted
    if (this.lightsOutSequenceActive || !this.lightsOn) {
      this._cancelLightsOut();
    }

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
      case STATES.THINKING:
        // Stop drawing on whiteboard when leaving THINKING
        this.charMgr.leader.isDrawing = false;
        break;
    }
  }

  _onEnter(state) {
    const leader = this.charMgr.leader;

    // If lights were off, re-enter leader through door first
    if (!this.lightsOn && state !== STATES.IDLE) {
      this._reenterLeader(state);
      return;
    }

    switch (state) {
      case STATES.IDLE:
        this.whiteboard.clearBoard();
        this.charMgr.clearWorkers();
        leader.stopMovement();
        leader.goToOwnDesk(() => leader.startSleeping());
        this.door.close();
        this.sleepParticleTimer = 0;
        break;

      case STATES.THINKING:
        leader.stopMovement();
        leader.goToWhiteboard(this.whiteboard);
        break;

      case STATES.DELEGATING: {
        // Leader goes back to desk while workers gather at whiteboard
        leader.stopMovement();
        leader.goToDesk(() => leader.sitDown());
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
        leader.stopMovement();
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
        leader.stopMovement();
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

  // Re-enter leader through door when lights were off and new activity starts
  _reenterLeader(targetState) {
    this.lightsOn = true;
    this.lightsOutSequenceActive = false;
    this.leaderExiting = false;

    const leader = this.charMgr.leader;
    leader.visible = true;
    leader.x = CONFIG.DOOR_POS.x;
    leader.y = CONFIG.DOOR_POS.y;

    this.door.open();

    // Walk to the target position for the new state, then run normal entry
    const target = this._getLeaderTargetForState(targetState);
    leader.moveTo(target, CONFIG.MOVE_SPEED, () => {
      this.door.close();
      this._runLeaderStateAction(targetState);
    });

    // Also handle workers/whiteboard for the new state (non-leader parts)
    this._enterNonLeaderActions(targetState);
  }

  // Get where the leader should go for a given state
  _getLeaderTargetForState(state) {
    switch (state) {
      case STATES.THINKING:
        return CONFIG.WHITEBOARD_POS;
      case STATES.DELEGATING:
        return CONFIG.WHITEBOARD_POS;
      case STATES.CODING:
        return this.charMgr.leader.getLeaderSitPosition();
      case STATES.DONE:
        return this.charMgr.leader.getLeaderSitPosition();
      case STATES.IDLE:
        return this.charMgr.leader.getLeaderSitPosition();
      default:
        return this.charMgr.leader.getLeaderSitPosition();
    }
  }

  // Run leader-specific action after reaching position
  _runLeaderStateAction(state) {
    const leader = this.charMgr.leader;
    switch (state) {
      case STATES.THINKING:
        leader.state = 'drawing';
        leader.setAnimation('leader_draw');
        leader.isDrawing = true;
        leader.drawTimer = 0;
        break;
      case STATES.DELEGATING:
        leader.state = 'drawing';
        leader.setAnimation('leader_draw');
        leader.isDrawing = true;
        leader.drawTimer = 0;
        break;
      case STATES.CODING:
        leader.startTyping();
        break;
      case STATES.DONE:
        leader.startSleeping();
        break;
      case STATES.IDLE:
        leader.startSleeping();
        break;
    }
  }

  // Handle non-leader actions when re-entering from lights-out
  _enterNonLeaderActions(state) {
    switch (state) {
      case STATES.DELEGATING:
        if (this.charMgr.getWorkerCount() === 0) {
          const worker = this.charMgr.spawnWorker();
          worker.visible = true;
          worker.goToWhiteboard();
          this.appState.agentCount = this.charMgr.getWorkerCount();
        }
        break;
      case STATES.CODING:
        for (const w of this.charMgr.workers) {
          if (!w.isOverflow) {
            w.goToDeskAndType();
          }
        }
        break;
      case STATES.MULTI_AGENT: {
        const newWorker = this.charMgr.spawnWorker();
        newWorker.visible = true;
        this.appState.agentCount = this.charMgr.getWorkerCount();
        if (newWorker.isOverflow) {
          newWorker.startPhoneWalk();
        } else {
          newWorker.enterAndSit();
        }
        break;
      }
    }
  }

  // --- Worker Exit Sequence (DONE timeout) ---

  startWorkerExitSequence() {
    const workers = this.charMgr.workers.filter(w => w.visible);
    if (workers.length === 0) {
      // No workers to exit, go straight to IDLE
      this.transition(STATES.IDLE);
      return;
    }

    this.workersExiting = true;
    this.workerExitQueue = [...workers];
    this.workerExitTimer = 0;
    this.door.open();
  }

  updateWorkerExitSequence(dt) {
    if (!this.workersExiting) return;

    this.workerExitTimer += dt;

    if (this.workerExitTimer >= CONFIG.WORKER_EXIT_STAGGER && this.workerExitQueue.length > 0) {
      this.workerExitTimer = 0;
      const worker = this.workerExitQueue.shift();
      worker.leave(() => {
        this.charMgr.removeWorker(worker);
        this.appState.agentCount = this.charMgr.getWorkerCount();

        // All workers exited?
        if (this.charMgr.getWorkerCount() === 0 && this.workerExitQueue.length === 0) {
          this.workersExiting = false;
          this.door.close();
          this.transition(STATES.IDLE);
        }
      });
    }

    // Safety: if queue is empty but workers still walking out, wait
    if (this.workerExitQueue.length === 0 && this.charMgr.getWorkerCount() === 0) {
      this.workersExiting = false;
      this.door.close();
      this.transition(STATES.IDLE);
    }
  }

  _cancelWorkerExit() {
    this.workersExiting = false;
    this.workerExitQueue = [];
    this.workerExitTimer = 0;
  }

  // --- Lights-Out Sequence (IDLE timeout) ---

  startLightsOutSequence() {
    if (this.lightsOutSequenceActive) return;
    this.lightsOutSequenceActive = true;
    this.leaderExiting = true;

    const leader = this.charMgr.leader;
    leader.stopMovement();
    this.door.open();

    leader.moveTo(CONFIG.DOOR_POS, CONFIG.MOVE_SPEED, () => {
      leader.visible = false;
      this.lightsOn = false;
      this.leaderExiting = false;
      this.door.close();
    });
  }

  _cancelLightsOut() {
    this.lightsOutSequenceActive = false;
    this.leaderExiting = false;

    const leader = this.charMgr.leader;
    if (!leader.visible) {
      // Leader was already hidden - bring back
      leader.visible = true;
      leader.x = CONFIG.DOOR_POS.x;
      leader.y = CONFIG.DOOR_POS.y;
    }
    this.lightsOn = true;
  }

  update(dt) {
    this.stateTimer += dt;

    // Lerp lights dim progress toward target
    const dimTarget = this.lightsOn ? 0 : 0.75;
    if (Math.abs(this.lightsDimProgress - dimTarget) > 0.001) {
      const lerpSpeed = 0.5; // per second
      if (this.lightsDimProgress < dimTarget) {
        this.lightsDimProgress = Math.min(this.lightsDimProgress + lerpSpeed * dt, dimTarget);
      } else {
        this.lightsDimProgress = Math.max(this.lightsDimProgress - lerpSpeed * dt, dimTarget);
      }
    } else {
      this.lightsDimProgress = dimTarget;
    }

    // Worker exit sequence update
    if (this.workersExiting) {
      this.updateWorkerExitSequence(dt);
    }

    // DONE timeout: after DONE_TIMEOUT seconds, start worker exit
    if (this.state === STATES.DONE && !this.workersExiting && this.stateTimer > CONFIG.DONE_TIMEOUT) {
      this.startWorkerExitSequence();
    }

    // IDLE timeout: after IDLE_TIMEOUT seconds, start lights-out
    if (this.state === STATES.IDLE && this.lightsOn && !this.lightsOutSequenceActive && this.stateTimer > CONFIG.IDLE_TIMEOUT) {
      this.startLightsOutSequence();
    }

    // Sleep ZZZ particles (for both IDLE and DONE states)
    if (this.state === STATES.DONE || this.state === STATES.IDLE) {
      this.sleepParticleTimer += dt;
      if (this.sleepParticleTimer > 1.5) {
        this.sleepParticleTimer = 0;
        // Spawn ZZZ above leader when sleeping
        const leader = this.charMgr.leader;
        if (leader.state === 'sleeping' && leader.visible) {
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

    // Janitor sequence update
    if (this.janitorActive) {
      this.updateJanitorSequence(dt);
    }

    // Check if janitor is needed (context full or compacted)
    if (this.appState.janitorNeeded && !this.janitorActive && this.lightsOn) {
      this.startJanitorSequence();
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

  // --- Janitor Sequence (context full/compacted -> clean whiteboard) ---

  startJanitorSequence() {
    if (this.janitorActive) return;
    if (this.whiteboard.scribbles.length === 0) {
      // Nothing to clean
      this.appState.janitorNeeded = false;
      return;
    }

    this.janitorActive = true;
    this.appState.janitorNeeded = false;

    // Create janitor as a character (yellow tint = hi-vis vest)
    this.janitor = new Character('worker', CONFIG.DOOR_POS.x, CONFIG.DOOR_POS.y);
    this.janitor.tintColor = CONFIG.COL.YELLOW;
    this.janitor.visible = true;

    this.door.open();

    // Walk to whiteboard
    this.janitor.moveTo(CONFIG.WHITEBOARD_POS, CONFIG.MOVE_SPEED, () => {
      // Start erasing
      this.janitor.state = 'drawing';
      this.janitor.setAnimation('worker_type');
      this.janitorEraseTimer = 0;
      this.janitorEraseCount = 0;
    });
  }

  updateJanitorSequence(dt) {
    if (!this.janitorActive || !this.janitor) return;

    this.janitor.update(dt);

    // Erasing phase: gradually remove scribbles
    if (this.janitor.state === 'drawing') {
      this.janitorEraseTimer += dt;
      if (this.janitorEraseTimer > 0.15) {
        this.janitorEraseTimer = 0;
        // Remove a batch of scribbles
        const removeCount = Math.min(5, this.whiteboard.scribbles.length);
        this.whiteboard.scribbles.splice(0, removeCount);
        this.janitorEraseCount += removeCount;

        // Done erasing?
        if (this.whiteboard.scribbles.length === 0) {
          this.whiteboard.drawProgress = 0;
          // Walk back to door and exit
          this.janitor.moveTo(CONFIG.DOOR_POS, CONFIG.MOVE_SPEED, () => {
            this.janitor.visible = false;
            this.janitor = null;
            this.janitorActive = false;
            this.door.close();
          });
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
      case '6': this.appState.janitorNeeded = true; break; // test janitor
    }
  }
}
