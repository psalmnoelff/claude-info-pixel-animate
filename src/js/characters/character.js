// Base character class: position, movement, animation
class Character {
  constructor(type, x, y) {
    this.type = type; // 'leader' or 'worker'
    this.x = x;
    this.y = y;
    this.animator = new Animator();
    this.tween = null;
    this.state = 'idle'; // idle, walking, sitting, typing, sleeping, drawing, phone
    this.facingRight = true;
    this.deskIndex = -1;
    this.tintColor = -1; // palette index for worker tinting
    this.visible = true;
    this.id = Character._nextId++;
  }

  static _nextId = 0;

  setAnimation(animName) {
    this.animator.play(animName);
  }

  // Cancel any in-progress movement
  stopMovement() {
    this.tween = null;
    this.moveCallback = null;
  }

  // Move to a target position with tweening
  moveTo(target, speed, callback) {
    // Cancel any existing movement first
    this.stopMovement();

    const T = CONFIG.TILE;
    const dx = Math.abs(target.x - this.x);
    const dy = Math.abs(target.y - this.y);

    // Safe horizontal corridor above all desk furniture
    const SAFE_Y = 2 * T; // y=32
    // Desk furniture zone (top-row desks start at y=48, bottom-row ends ~y=120)
    const DESK_ZONE_TOP = 3 * T; // y=48
    const DESK_ZONE_BOT = 8 * T; // y=128

    const startInDesks = this.y >= DESK_ZONE_TOP && this.y <= DESK_ZONE_BOT;
    const endInDesks = target.y >= DESK_ZONE_TOP && target.y <= DESK_ZONE_BOT;

    const waypoints = [{ x: this.x, y: this.y }];

    // Route through safe corridor above desks when:
    // - Significant horizontal movement AND either endpoint is in the desk zone
    // - OR significant vertical movement through the desk zone with horizontal offset
    const needsRouting = dx > T && (startInDesks || endInDesks);

    if (needsRouting) {
      // 1. Go up to safe corridor (if not already above desks)
      if (this.y > SAFE_Y) {
        waypoints.push({ x: this.x, y: SAFE_Y });
      }
      // 2. Walk horizontally at safe Y
      waypoints.push({ x: target.x, y: SAFE_Y });
      // 3. Walk down to destination
      waypoints.push({ x: target.x, y: target.y });
    } else if (dx > 1 && dy > 1) {
      // Simple L-path for short moves (within same desk column)
      // Use Y-first to go up before horizontal when in desk zone
      if (startInDesks && target.y < this.y) {
        waypoints.push({ x: this.x, y: target.y });
        waypoints.push({ x: target.x, y: target.y });
      } else {
        waypoints.push({ x: target.x, y: this.y });
        waypoints.push({ x: target.x, y: target.y });
      }
    } else {
      waypoints.push({ x: target.x, y: target.y });
    }

    this.tween = new TweenPath(waypoints, speed || CONFIG.MOVE_SPEED);
    this.state = 'walking';
    this.moveCallback = callback || null;
  }

  update(dt) {
    this.animator.update(dt);

    if (this.tween && !this.tween.done) {
      this.tween.update(dt);
      this.x = this.tween.currentX;
      this.y = this.tween.currentY;

      // Update walk animation direction
      const dir = this.tween.getDirection();
      const prefix = this.type;
      if (dir === 'left') {
        this.setAnimation(prefix + '_walk_right');
        this.facingRight = false;
      } else if (dir === 'right') {
        this.setAnimation(prefix + '_walk_right');
        this.facingRight = true;
      } else if (dir === 'up') {
        this.setAnimation(prefix + '_walk_up');
      } else {
        this.setAnimation(prefix + '_walk_down');
      }

      if (this.tween.done) {
        this.tween = null;
        if (this.moveCallback) {
          const cb = this.moveCallback;
          this.moveCallback = null;
          cb();
        }
      }
    }
  }

  draw(renderer) {
    if (!this.visible) return;

    const spriteName = this.animator.getCurrentSprite();
    if (!spriteName) return;

    let sprite;
    if (this.tintColor >= 0 && this.type === 'worker') {
      sprite = SpriteRenderer.getTinted(spriteName, this.tintColor);
    } else {
      sprite = SpriteRenderer.get(spriteName);
    }

    if (sprite) {
      if (!this.facingRight) {
        // Draw flipped horizontally
        const bufCtx = renderer.getBufferContext();
        bufCtx.save();
        bufCtx.translate(Math.floor(this.x) + 16, Math.floor(this.y));
        bufCtx.scale(-1, 1);
        bufCtx.drawImage(sprite, 0, 0);
        bufCtx.restore();
      } else {
        renderer.drawImage(sprite, Math.floor(this.x), Math.floor(this.y));
      }
    }
  }

  // Position for sitting at a desk (offset from desk tile)
  getSitPosition(deskIndex) {
    const desk = CONFIG.DESKS[deskIndex];
    return { x: desk.x * CONFIG.TILE, y: desk.y * CONFIG.TILE + CONFIG.TILE - 8 };
  }

  // Start sitting at assigned desk
  sitDown() {
    this.state = 'sitting';
    this.setAnimation(this.type + '_sit');
  }

  // Start typing
  startTyping() {
    this.state = 'typing';
    this.setAnimation(this.type === 'leader' ? 'leader_sit' : 'worker_type');
  }

  // Start sleeping
  startSleeping() {
    this.state = 'sleeping';
    this.setAnimation(this.type === 'leader' ? 'leader_idle' : 'worker_sleep');
  }

  // Start idle
  setIdle() {
    this.state = 'idle';
    this.setAnimation(this.type + '_idle');
    this.facingRight = true;
  }
}
