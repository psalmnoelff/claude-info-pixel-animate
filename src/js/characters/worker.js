// Agent worker character - color-tinted, can type, phone-walk
class Worker extends Character {
  constructor(deskIndex, tintColor) {
    const pos = deskIndex >= 0 && deskIndex < CONFIG.DESKS.length
      ? { x: CONFIG.DOOR_POS.x, y: CONFIG.DOOR_POS.y }
      : { x: CONFIG.DOOR_POS.x, y: CONFIG.DOOR_POS.y };

    super('worker', pos.x, pos.y);
    this.deskIndex = deskIndex;
    this.tintColor = tintColor;
    this.isOverflow = deskIndex < 0; // No desk assigned = overflow
    this.phoneDir = 1; // Direction for phone walking
    this.setAnimation('worker_idle');
  }

  // Enter through door and walk to assigned desk
  enterAndSit(callback) {
    if (this.isOverflow) {
      this.startPhoneWalk();
      if (callback) callback();
      return;
    }

    const sitPos = this.getSitPosition(this.deskIndex);
    this.moveTo(sitPos, CONFIG.MOVE_SPEED, () => {
      this.sitDown();
      if (callback) callback();
    });
  }

  // Walk to whiteboard area for briefing
  goToWhiteboard(callback) {
    // Stand near whiteboard in a row
    const offset = (this.deskIndex % 3) * 20 - 20;
    const row = this.deskIndex < 3 ? 0 : 1;
    const target = {
      x: CONFIG.WHITEBOARD_POS.x + offset,
      y: CONFIG.WHITEBOARD_POS.y + CONFIG.TILE + row * 12
    };

    this.moveTo(target, CONFIG.MOVE_SPEED, () => {
      this.setIdle();
      if (callback) callback();
    });
  }

  // Walk to assigned desk and start typing
  goToDeskAndType(callback) {
    if (this.isOverflow) {
      this.startPhoneWalk();
      if (callback) callback();
      return;
    }

    const sitPos = this.getSitPosition(this.deskIndex);
    this.moveTo(sitPos, CONFIG.MOVE_SPEED, () => {
      this.startTyping();
      if (callback) callback();
    });
  }

  // Start phone-walking in the overflow area (front of office)
  startPhoneWalk() {
    this.state = 'phone';
    this.setAnimation('worker_phone');
    this.y = CONFIG.OVERFLOW_Y_MIN + Math.random() * (CONFIG.OVERFLOW_Y_MAX - CONFIG.OVERFLOW_Y_MIN);
    this.phoneDir = Math.random() > 0.5 ? 1 : -1;
    this.facingRight = this.phoneDir > 0;
  }

  // Leave through door
  leave(callback) {
    this.moveTo(CONFIG.DOOR_POS, CONFIG.MOVE_SPEED, () => {
      this.visible = false;
      if (callback) callback();
    });
  }

  update(dt) {
    super.update(dt);

    // Phone walking behavior (pacing back and forth)
    if (this.state === 'phone') {
      this.x += this.phoneDir * CONFIG.WALK_SPEED * 0.5;
      this.facingRight = this.phoneDir > 0;

      // Bounce at edges
      if (this.x < 8) {
        this.phoneDir = 1;
        this.facingRight = true;
      } else if (this.x > CONFIG.WIDTH - 24) {
        this.phoneDir = -1;
        this.facingRight = false;
      }
    }
  }
}
