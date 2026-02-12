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

    // Graceful worker walk-out (workers walk to door and leave)
    this.walkingOutWorkers = false;
    this.workerWalkOutQueue = [];
    this.workerWalkOutTimer = 0;

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

    // Roaming behavior (IDLE/DONE: characters wander and sleep)
    this.roamingChars = new Map(); // character -> { phase, timer }

    // Activity timer - auto-transition to DONE after inactivity
    this.lastActivityTime = 0;

    // Leader panic (long active work session)
    this.activeWorkTimer = 0;
    this.leaderPanicking = false;

    // Snow storm (extended inactivity)
    this.globalInactivityTimer = 0;
    this.snowProgress = 0; // 0 to 1
    this.snowSpawnTimer = 0;
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

    // Cancel worker walk-out if interrupted
    if (this.walkingOutWorkers) {
      this._cancelWorkerWalkOut();
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
        this._stopAllRoaming();
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
        leader.stopMovement();
        this._startRoaming(leader);
        this.sleepParticleTimer = 0;
        this.activeWorkTimer = 0;
        leader.panicking = false;
        // Walk workers out through the door instead of clearing instantly
        if (this.charMgr.getWorkerCount() > 0) {
          this._startWorkerWalkOut();
        } else {
          this.door.close();
        }
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
        // Everyone roams: walk around, sleep at random spots, repeat
        leader.stopMovement();
        this._startRoaming(leader);
        for (const w of this.charMgr.workers) {
          if (w.isOverflow) continue;
          w.stopMovement();
          this._startRoaming(w);
        }
        this.sleepParticleTimer = 0;
        this.activeWorkTimer = 0;
        leader.panicking = false;
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
        this._startRoaming(leader);
        break;
      case STATES.IDLE:
        this._startRoaming(leader);
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
    this._stopAllRoaming();

    const workers = this.charMgr.workers.filter(w => w.visible && !w.dying);
    if (workers.length === 0) {
      this.transition(STATES.IDLE);
      return;
    }

    this.workersExiting = true;
    this.workerExitQueue = [...workers];
    this.workerExitTimer = 0;
    this.exitPhase = 'approaching';
    this.gunDrawn = false;

    // Stop all characters and begin the sequence
    const leader = this.charMgr.leader;
    leader.stopMovement();
    for (const w of workers) w.stopMovement();
    this._approachNextWorker();
  }

  _approachNextWorker() {
    if (this.workerExitQueue.length === 0) {
      // All workers eliminated - leader returns to desk
      // Keep workersExiting=true so updateWorkerExitSequence processes the 'returning' phase
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
      leader.state = 'idle';
      this.workerExitTimer = 0;
      if (!this.gunDrawn) {
        // First worker: draw the shotgun
        leader.setAnimation('leader_gun_draw');
        this.exitPhase = 'gun_draw';
      } else {
        // Already drawn: cock and aim
        leader.setAnimation('leader_gun_cock');
        this.exitPhase = 'gun_cock';
      }
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

    const leader = this.charMgr.leader;

    if (this.exitPhase === 'gun_draw' && this.workerExitTimer >= 0.5) {
      this.workerExitTimer = 0;
      leader.setAnimation('leader_gun_cock');
      this.exitPhase = 'gun_cock';
    }

    if (this.exitPhase === 'gun_cock' && this.workerExitTimer >= 0.5) {
      this.workerExitTimer = 0;
      this.gunDrawn = true;
      leader.setAnimation('leader_gun_aim');
      this.exitPhase = 'gun_aim';
    }

    if (this.exitPhase === 'gun_aim' && this.workerExitTimer >= 0.3) {
      this.workerExitTimer = 0;
      leader.setAnimation('leader_gun_fire');
      this.exitPhase = 'shooting';
    }

    if (this.exitPhase === 'shooting' && this.workerExitTimer >= 0.15) {
      this._executeShot(this.currentExitTarget);
    }

    if (this.exitPhase === 'next' && this.workerExitTimer >= 0.3) {
      this._approachNextWorker();
    }

    if (this.exitPhase === 'returning' && this.workerExitTimer >= 1.0) {
      this.workersExiting = false;
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
    this.gunDrawn = false;
  }

  // --- Graceful Worker Walk-Out (workers walk to door and leave) ---

  _startWorkerWalkOut() {
    const workers = this.charMgr.workers.filter(w => w.visible && !w.dying);
    if (workers.length === 0) {
      this.charMgr.clearWorkers();
      this.door.close();
      return;
    }

    this.door.open();
    this.walkingOutWorkers = true;
    this.workerWalkOutQueue = [...workers];
    this.workerWalkOutTimer = 0;

    // Send the first worker immediately
    this._sendNextWorkerOut();
  }

  _sendNextWorkerOut() {
    if (this.workerWalkOutQueue.length === 0) return;

    const w = this.workerWalkOutQueue.shift();
    w.stopMovement();
    w.setIdle();
    w.moveTo(CONFIG.DOOR_POS, CONFIG.MOVE_SPEED, () => {
      w.visible = false;
      this.charMgr.removeWorker(w);
      this.appState.agentCount = this.charMgr.getWorkerCount();
      // Close door after last worker leaves
      if (this.charMgr.getWorkerCount() === 0) {
        this.walkingOutWorkers = false;
        this.door.close();
      }
    });
    this.workerWalkOutTimer = 0;
  }

  _updateWorkerWalkOut(dt) {
    if (!this.walkingOutWorkers) return;
    this.workerWalkOutTimer += dt;
    if (this.workerWalkOutTimer >= CONFIG.WORKER_EXIT_STAGGER && this.workerWalkOutQueue.length > 0) {
      this._sendNextWorkerOut();
    }
  }

  _cancelWorkerWalkOut() {
    this.walkingOutWorkers = false;
    this.workerWalkOutQueue = [];
    this.workerWalkOutTimer = 0;
    // Stop workers mid-walk
    for (const w of this.charMgr.workers) {
      if (w.visible && w.state === 'walking') {
        w.stopMovement();
        w.setIdle();
      }
    }
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

  // --- Roaming Behavior (IDLE/DONE: wander and sleep at random spots) ---

  _getCharDeskPos(char) {
    if (char.type === 'leader') return char.getLeaderSitPosition();
    if (char.deskIndex >= 0) return char.getSitPosition(char.deskIndex);
    return null;
  }

  _startRoaming(char) {
    const target = this._getRandomWalkablePos();
    const roamState = { phase: 'walking', timer: 0 };
    this.roamingChars.set(char, roamState);
    char.moveTo(target, CONFIG.MOVE_SPEED * 0.6, () => {
      char.setIdle();
      roamState.phase = 'idle';
      roamState.timer = 2 + Math.random() * 3;
    });
  }

  _stopAllRoaming() {
    for (const [char] of this.roamingChars) {
      char.stopMovement();
    }
    this.roamingChars.clear();
  }

  _getRandomWalkablePos() {
    const T = CONFIG.TILE;
    const minX = T;
    const maxX = CONFIG.WIDTH - 2 * T;
    const minY = 3 * T + 4;
    const maxY = (CONFIG.ROWS - 2) * T;

    // Build desk bounding boxes to avoid (with padding)
    const deskBoxes = [];
    for (const d of CONFIG.DESKS) {
      deskBoxes.push({
        x1: d.x * T - 4, y1: d.y * T - 4,
        x2: (d.x + 2) * T + 4, y2: (d.y + 2) * T + 4,
      });
    }
    // Leader desk (2 tiles wide)
    const ld = CONFIG.LEADER_DESK_POS;
    deskBoxes.push({
      x1: ld.x * T - 4, y1: ld.y * T - 4,
      x2: (ld.x + 2) * T + 4, y2: (ld.y + 2) * T + 4,
    });

    for (let i = 0; i < 30; i++) {
      const x = minX + Math.random() * (maxX - minX);
      const y = minY + Math.random() * (maxY - minY);

      // Check desk collision
      let blocked = false;
      for (const box of deskBoxes) {
        if (x + CONFIG.TILE > box.x1 && x < box.x2 && y + CONFIG.TILE > box.y1 && y < box.y2) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;

      // Check distance from other roaming characters
      let tooClose = false;
      for (const [otherChar] of this.roamingChars) {
        if (Math.abs(x - otherChar.x) < 20 && Math.abs(y - otherChar.y) < 20) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;

      return { x, y };
    }

    // Fallback: open area below desks
    return { x: CONFIG.WIDTH / 2, y: (CONFIG.ROWS - 3) * T };
  }

  updateRoaming(dt) {
    for (const [char, roamState] of this.roamingChars) {
      if (!char.visible || char.dying) continue;

      // Don't interfere if character is mid-walk from a moveTo
      if (roamState.phase === 'walking') continue;

      roamState.timer -= dt;
      if (roamState.timer > 0) continue;

      // Decide next action
      const deskPos = this._getCharDeskPos(char);

      if (roamState.phase === 'sleeping') {
        // Was sleeping at desk -> walk to a random spot and idle
        const target = this._getRandomWalkablePos();
        roamState.phase = 'walking';
        char.moveTo(target, CONFIG.MOVE_SPEED * 0.6, () => {
          char.setIdle();
          roamState.phase = 'idle';
          roamState.timer = 2 + Math.random() * 3;
        });
      } else {
        // Was idling at a random spot -> either wander more or go back to desk to sleep
        if (deskPos && Math.random() < 0.35) {
          // Go back to desk and sleep
          roamState.phase = 'walking';
          char.moveTo(deskPos, CONFIG.MOVE_SPEED * 0.6, () => {
            char.sitDown();
            char.startSleeping();
            roamState.phase = 'sleeping';
            roamState.timer = 4 + Math.random() * 5;
          });
        } else {
          // Wander to another random spot
          const target = this._getRandomWalkablePos();
          roamState.phase = 'walking';
          char.moveTo(target, CONFIG.MOVE_SPEED * 0.6, () => {
            char.setIdle();
            roamState.phase = 'idle';
            roamState.timer = 2 + Math.random() * 3;
          });
        }
      }
    }
  }

  // --- Lights-Out Sequence (IDLE timeout) ---

  startLightsOutSequence() {
    if (this.lightsOutSequenceActive) return;
    this._stopAllRoaming();
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

    // Worker walk-out update
    this._updateWorkerWalkOut(dt);

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

    // Roaming update (IDLE/DONE: characters wander and sleep)
    if (this.state === STATES.DONE || this.state === STATES.IDLE) {
      this.updateRoaming(dt);
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

    // --- Leader panic (long active work session) ---
    const activeStatesForPanic = [STATES.CODING, STATES.THINKING, STATES.DELEGATING, STATES.MULTI_AGENT, STATES.OVERFLOW, STATES.PLANNING];
    if (activeStatesForPanic.includes(this.state)) {
      this.activeWorkTimer += dt;
    }
    this.leaderPanicking = this.activeWorkTimer >= CONFIG.PANIC_TIMEOUT;
    this.charMgr.leader.panicking = this.leaderPanicking;

    // Sweat drop particles when panicking
    if (this.leaderPanicking && this.charMgr.leader.visible) {
      if (Math.random() < 0.08) {
        const lx = this.charMgr.leader.x;
        const ly = this.charMgr.leader.y;
        this.particles.spawnSweat(lx + 6 + Math.random() * 4, ly + 2);
      }
    }

    // --- Snow storm (extended inactivity) ---
    this.globalInactivityTimer += dt;
    if (this.globalInactivityTimer >= CONFIG.SNOW_START_TIMEOUT) {
      // Snow builds up
      const snowRange = CONFIG.SNOW_FULL_TIMEOUT - CONFIG.SNOW_START_TIMEOUT;
      const elapsed = this.globalInactivityTimer - CONFIG.SNOW_START_TIMEOUT;
      this.snowProgress = Math.min(1, elapsed / snowRange);
    } else if (this.snowProgress > 0) {
      // Snow melting (activity resumed but still fading)
      this.snowProgress = Math.max(0, this.snowProgress - CONFIG.SNOW_MELT_SPEED * dt);
    }

    // Apply freeze to all characters
    const freezeThreshold = 0.2;
    const freeze = this.snowProgress > freezeThreshold ? this.snowProgress : 0;
    this.charMgr.leader.freezeProgress = freeze;
    for (const w of this.charMgr.workers) {
      w.freezeProgress = freeze;
    }
    if (this.janitor) this.janitor.freezeProgress = freeze;

    // Spawn snow particles
    if (this.snowProgress > 0) {
      this.snowSpawnTimer += dt;
      const spawnRate = 0.02 + this.snowProgress * 0.08; // faster as storm intensifies
      if (this.snowSpawnTimer > spawnRate) {
        this.snowSpawnTimer = 0;
        const count = Math.ceil(this.snowProgress * 4);
        for (let i = 0; i < count; i++) {
          this.particles.spawnSnow(this.snowProgress);
        }
      }
    }
  }

  // --- Janitor Sequence (context full/compacted -> clean whiteboard) ---

  startJanitorSequence() {
    if (this.janitorActive) return;
    if (this.whiteboard.elements.length === 0) {
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

      // Gradually remove elements during the 2-second mop
      if (this.janitorEraseTimer > 0.15 && this.whiteboard.elements.length > 0) {
        this.janitorEraseTimer = 0;
        const removeCount = Math.min(5, this.whiteboard.elements.length);
        this.whiteboard.elements.splice(0, removeCount);
      }

      // After 2 seconds of mopping, finish up
      if (this.janitorMopTimer >= 2.0) {
        // Clear any remaining elements
        this.whiteboard.elements.length = 0;
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
    this._stopAllRoaming();
    this._cancelWorkerExit();
    this._cancelWorkerWalkOut();
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

    // Reset panic and snow
    this.activeWorkTimer = 0;
    this.leaderPanicking = false;
    this.globalInactivityTimer = 0;
    this.snowProgress = 0;
    this.snowSpawnTimer = 0;

    const leader = this.charMgr.leader;
    leader.stopMovement();
    leader.visible = false;
    leader.panicking = false;
    leader.freezeProgress = 0;
    leader.x = CONFIG.DOOR_POS.x;
    leader.y = CONFIG.DOOR_POS.y;
    leader.setIdle();

    this.door.close();
  }

  // Signal that new events are arriving (resets inactivity timer and snow)
  signalActivity() {
    this.lastActivityTime = 0;
    this.globalInactivityTimer = 0;
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
