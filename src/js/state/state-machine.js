// Global scene state machine driven by Claude Code events
const STATES = {
  IDLE: 'IDLE',
  THINKING: 'THINKING',
  DELEGATING: 'DELEGATING',
  CODING: 'CODING',
  DONE: 'DONE',
  MULTI_AGENT: 'MULTI_AGENT',
  OVERFLOW: 'OVERFLOW',
  PLANNING: 'PLANNING',
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
    this.janitorMopTimer = 0;

    // Planning sequence
    this.planningPhase = null; // 'drawing', 'pacing_left', 'pacing_right', 'pausing'
    this.planningTimer = 0;

    // Activity timer - auto-transition to DONE after inactivity
    this.lastActivityTime = 0;
  }

  getState() {
    return this.state;
  }

  transition(newState) {
    // Allow self-transition for MULTI_AGENT so each Task call spawns a new worker
    if (this.state === newState && newState !== STATES.MULTI_AGENT) return;

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
    this.lastActivityTime = 0;
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
      case STATES.PLANNING:
        this.charMgr.leader.isDrawing = false;
        this.planningPhase = null;
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

      case STATES.PLANNING:
        // Leader walks to whiteboard and starts planning cycle
        leader.stopMovement();
        leader.goToWhiteboard(this.whiteboard, () => {
          this.planningPhase = 'drawing';
          this.planningTimer = 0;
        });
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
      case STATES.PLANNING:
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
      case STATES.PLANNING:
        leader.state = 'drawing';
        leader.setAnimation('leader_draw');
        leader.isDrawing = true;
        leader.drawTimer = 0;
        this.planningPhase = 'drawing';
        this.planningTimer = 0;
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

  // --- Worker Exit Sequence (leader shoots workers) ---

  startWorkerExitSequence() {
    const workers = this.charMgr.workers.filter(w => w.visible);
    if (workers.length === 0) {
      this.transition(STATES.IDLE);
      return;
    }

    this.workersExiting = true;
    this.workerExitQueue = [...workers];
    this.workerExitTimer = 0;
    this.exitPhase = 'approaching'; // approaching, shooting, dying, next

    // Leader stops and begins the sequence
    const leader = this.charMgr.leader;
    leader.stopMovement();
    this._approachNextWorker();
  }

  _approachNextWorker() {
    if (this.workerExitQueue.length === 0) {
      // All workers eliminated - leader returns to desk
      this.workersExiting = false;
      const leader = this.charMgr.leader;
      leader.goToOwnDesk(() => leader.startSleeping());
      this.workerExitTimer = 0;
      this.exitPhase = 'returning';
      return;
    }

    const worker = this.workerExitQueue.shift();
    this.currentExitTarget = worker;
    this.exitPhase = 'approaching';

    const leader = this.charMgr.leader;
    // Walk near the worker (offset to the side)
    const offsetX = worker.x > leader.x ? -18 : 18;
    const target = { x: worker.x + offsetX, y: worker.y };
    leader.moveTo(target, CONFIG.MOVE_SPEED * 2.5, () => {
      // Face the worker
      leader.facingRight = worker.x > leader.x;
      leader.setIdle();
      // Brief pause before shooting
      this.workerExitTimer = 0;
      this.exitPhase = 'shooting';
    });
  }

  _executeShot(worker) {
    // Screen flash + shake
    this.appState.screenFlashTimer = 0.15;
    this.appState.screenShakeTimer = 0.3;

    // Muzzle flash particles
    const leader = this.charMgr.leader;
    const flashX = leader.x + (leader.facingRight ? 14 : 2);
    const flashY = leader.y + 8;
    this.particles.spawnMuzzleFlash(flashX, flashY);

    // Worker dies (animation plays independently)
    worker.die(() => {
      this.charMgr.removeWorker(worker);
      this.appState.agentCount = this.charMgr.getWorkerCount();
    });

    // Move to next immediately (don't wait for death anim)
    this.currentExitTarget = null;
    this.workerExitTimer = 0;
    this.exitPhase = 'next';
  }

  updateWorkerExitSequence(dt) {
    if (!this.workersExiting) return;

    this.workerExitTimer += dt;

    if (this.exitPhase === 'shooting' && this.workerExitTimer >= 0.15) {
      this._executeShot(this.currentExitTarget);
    }

    if (this.exitPhase === 'next' && this.workerExitTimer >= 0.3) {
      this._approachNextWorker();
    }

    if (this.exitPhase === 'returning' && this.workerExitTimer >= 1.0) {
      this.exitPhase = null;
      this.transition(STATES.IDLE);
    }

    // Safety: if all workers gone
    if (this.workerExitQueue.length === 0 && this.charMgr.getWorkerCount() === 0 &&
        this.exitPhase !== 'dying' && this.exitPhase !== 'returning') {
      this.workersExiting = false;
      const leader = this.charMgr.leader;
      if (leader.state !== 'walking') {
        leader.goToOwnDesk(() => leader.startSleeping());
      }
      this.workerExitTimer = 0;
      this.exitPhase = 'returning';
    }
  }

  _cancelWorkerExit() {
    this.workersExiting = false;
    this.workerExitQueue = [];
    this.workerExitTimer = 0;
    this.exitPhase = null;
    this.currentExitTarget = null;
  }

  // --- Planning Sequence (whiteboard -> pace -> pause -> repeat) ---

  updatePlanningSequence(dt) {
    if (this.state !== STATES.PLANNING || !this.planningPhase) return;

    const leader = this.charMgr.leader;
    this.planningTimer += dt;

    switch (this.planningPhase) {
      case 'drawing':
        // Draw on whiteboard for ~3s, then pace left
        if (this.planningTimer >= 3.0) {
          leader.isDrawing = false;
          this.planningPhase = 'pacing_left';
          this.planningTimer = 0;
          leader.moveTo({ x: 96, y: CONFIG.WHITEBOARD_POS.y }, CONFIG.MOVE_SPEED, () => {
            this.planningPhase = 'pacing_right';
            this.planningTimer = 0;
          });
        }
        break;

      case 'pacing_right':
        // Walk right to ~x=160, then pause
        if (this.planningTimer < 0.1) {
          leader.moveTo({ x: 160, y: CONFIG.WHITEBOARD_POS.y }, CONFIG.MOVE_SPEED, () => {
            this.planningPhase = 'pausing';
            this.planningTimer = 0;
            leader.setIdle();
          });
          this.planningTimer = 0.1; // prevent re-triggering
        }
        break;

      case 'pausing':
        // Idle/thinking for ~2s, then walk back to whiteboard to draw again
        if (this.planningTimer >= 2.0) {
          this.planningPhase = 'returning';
          this.planningTimer = 0;
          leader.goToWhiteboard(this.whiteboard, () => {
            this.planningPhase = 'drawing';
            this.planningTimer = 0;
          });
        }
        break;

      // 'pacing_left' and 'returning' are handled by moveTo callbacks
    }
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

    // Planning sequence update
    if (this.state === STATES.PLANNING) {
      this.updatePlanningSequence(dt);
    }

    // DONE timeout: after DONE_TIMEOUT seconds, start worker exit
    if (this.state === STATES.DONE && !this.workersExiting && this.stateTimer > CONFIG.DONE_TIMEOUT) {
      this.startWorkerExitSequence();
    }

    // IDLE timeout: after IDLE_TIMEOUT seconds, start lights-out
    if (this.state === STATES.IDLE && this.lightsOn && !this.lightsOutSequenceActive && this.stateTimer > CONFIG.IDLE_TIMEOUT) {
      this.startLightsOutSequence();
    }

    // Inactivity timeout: auto-transition to DONE if no events for 2 minutes
    this.lastActivityTime += dt;
    const activeStates = [STATES.CODING, STATES.THINKING, STATES.DELEGATING, STATES.MULTI_AGENT, STATES.OVERFLOW, STATES.PLANNING];
    if (activeStates.includes(this.state) && this.lastActivityTime > CONFIG.INACTIVITY_TIMEOUT) {
      this.transition(STATES.DONE);
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

    // Create janitor as a character with custom janitor sprites
    this.janitor = new Character('janitor', CONFIG.DOOR_POS.x, CONFIG.DOOR_POS.y);
    this.janitor.setAnimation('janitor_idle');
    this.janitor.visible = true;

    this.door.open();

    // Walk to whiteboard
    this.janitor.moveTo(CONFIG.WHITEBOARD_POS, CONFIG.MOVE_SPEED, () => {
      // Start mopping animation for 2 seconds
      this.janitor.state = 'drawing';
      this.janitor.setAnimation('janitor_mop');
      this.janitorEraseTimer = 0;
      this.janitorMopTimer = 0;
    });
  }

  updateJanitorSequence(dt) {
    if (!this.janitorActive || !this.janitor) return;

    this.janitor.update(dt);

    // Callback may have nulled janitor when walk-back tween completed
    if (!this.janitor) return;

    // Mopping/erasing phase: 2-second mop animation while gradually erasing
    if (this.janitor.state === 'drawing') {
      this.janitorMopTimer += dt;
      this.janitorEraseTimer += dt;

      // Gradually remove scribbles during the 2-second mop
      if (this.janitorEraseTimer > 0.15 && this.whiteboard.scribbles.length > 0) {
        this.janitorEraseTimer = 0;
        const removeCount = Math.min(5, this.whiteboard.scribbles.length);
        this.whiteboard.scribbles.splice(0, removeCount);
      }

      // After 2 seconds of mopping, finish up
      if (this.janitorMopTimer >= 2.0) {
        // Clear any remaining scribbles
        this.whiteboard.scribbles.length = 0;
        this.whiteboard.drawProgress = 0;

        // Walk back to door and exit
        this.janitor.state = 'walking';
        this.janitor.moveTo(CONFIG.DOOR_POS, CONFIG.MOVE_SPEED, () => {
          this.janitor.visible = false;
          this.janitor = null;
          this.janitorActive = false;
          this.door.close();
        });
      }
    }
  }

  // Full reset to initial state (lights off, leader hidden)
  reset() {
    // Cancel any active sequences
    this._cancelWorkerExit();
    if (this.janitorActive && this.janitor) {
      this.janitor.visible = false;
      this.janitor = null;
      this.janitorActive = false;
    }

    // Clear workers and particles
    this.charMgr.clearWorkers();
    this.whiteboard.clearBoard();
    this.particles.clear();

    // Reset state
    this.state = STATES.IDLE;
    this.stateTimer = 0;
    this.appState.statusText = 'IDLE';
    this.appState.agentCount = 0;

    // Lights off, leader hidden at door
    this.lightsOn = false;
    this.lightsDimProgress = 0.75;
    this.lightsOutSequenceActive = false;
    this.leaderExiting = false;

    const leader = this.charMgr.leader;
    leader.stopMovement();
    leader.visible = false;
    leader.x = CONFIG.DOOR_POS.x;
    leader.y = CONFIG.DOOR_POS.y;
    leader.setIdle();

    this.door.close();
  }

  // Signal that new events are arriving (resets inactivity timer)
  signalActivity() {
    this.lastActivityTime = 0;
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
      case '7': { // Error on random worker
        const vis = this.charMgr.workers.filter(w => w.visible && !w.dying);
        if (vis.length > 0) vis[Math.floor(Math.random() * vis.length)].triggerError();
        break;
      }
      case '8': { // Error on leader
        if (this.charMgr.leader.visible) this.charMgr.leader.triggerError();
        break;
      }
      case '9': { // Error on all
        if (this.charMgr.leader.visible) this.charMgr.leader.triggerError();
        for (const w of this.charMgr.workers) {
          if (w.visible && !w.dying) w.triggerError();
        }
        break;
      }
    }
  }
}
