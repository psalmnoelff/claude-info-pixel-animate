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
    this.lookTimer = 0; // Timer for looking left/right while typing
    this.lookInterval = 2 + Math.random() * 4; // Randomized per worker
    this.phoneTalkTimer = Math.random() * 2; // Blink timer for phone talking
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
    // Stand near whiteboard in a row (above desk zone)
    const offset = (this.deskIndex % 3) * 20 - 20;
    const row = this.deskIndex < 3 ? 0 : 1;
    const target = {
      x: CONFIG.WHITEBOARD_POS.x + offset,
      y: CONFIG.WHITEBOARD_POS.y + row * 8 // y=32 or y=40, stays above desks
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

  draw(renderer) {
    super.draw(renderer);

    // Blinking speech dots when on the phone
    if (this.state === 'phone' && this.visible) {
      const blink = Math.floor(this.phoneTalkTimer * 3) % 3; // cycle 0,1,2
      const bx = Math.floor(this.x) + (this.facingRight ? 14 : -2);
      const by = Math.floor(this.y) - 2;
      const col = CONFIG.COL.WHITE;
      if (blink >= 0) renderer.pixel(bx, by + 2, col);
      if (blink >= 1) renderer.pixel(bx + 2, by + 1, col);
      if (blink >= 2) renderer.pixel(bx + 4, by, col);
    }
  }

  update(dt) {
    super.update(dt);

    // Look left/right while typing at desk
    if (this.state === 'typing') {
      this.lookTimer += dt;
      if (this.lookTimer >= this.lookInterval) {
        this.lookTimer = 0;
        this.lookInterval = 2 + Math.random() * 4;
        this.facingRight = !this.facingRight;
      }
    }

    // Phone walking behavior (pacing back and forth)
    if (this.state === 'phone') {
      this.x += this.phoneDir * CONFIG.WALK_SPEED * 0.5;
      this.facingRight = this.phoneDir > 0;
      this.phoneTalkTimer += dt;

      // Bounce at edges (stop before leader desk area on the right)
      const rightLimit = CONFIG.LEADER_DESK_POS.x * CONFIG.TILE - 8;
      if (this.x < 8) {
        this.phoneDir = 1;
        this.facingRight = true;
      } else if (this.x > rightLimit) {
        this.phoneDir = -1;
        this.facingRight = false;
      }
    }
  }
}
