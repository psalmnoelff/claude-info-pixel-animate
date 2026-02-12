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
    this.errorTimer = 0;
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

  // Check if a desk column has a blocking desk between two Y positions
  // Excludes the desk at nearY (the desk the character is leaving/arriving at)
  _columnHasBlockingDesk(tileX, startY, endY, nearY) {
    const T = CONFIG.TILE;
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);
    return CONFIG.DESKS.some(d => {
      if (d.x !== tileX) return false;
      const deskTop = d.y * T;
      const deskBot = (d.y + 1) * T;
      // Exclude the desk the character is at/going to
      if (nearY >= deskTop && nearY < deskBot + T) return false;
      // Does the desk overlap with the vertical path?
      return deskTop < maxY && deskBot > minY;
    });
  }

  // Move to a target position with tweening
  moveTo(target, speed, callback) {
    // Cancel any existing movement first
    this.stopMovement();

    const T = CONFIG.TILE;
    const dx = Math.abs(target.x - this.x);
    const dy = Math.abs(target.y - this.y);

    // Already at destination - fire callback immediately
    if (dx < 1 && dy < 1) {
      if (callback) callback();
      return;
    }

    // Safe horizontal corridor above all desk furniture
    const SAFE_Y = 2 * T; // y=32
    // Desk furniture zone (top-row desks start at y=48, bottom-row ends ~y=120)
    const DESK_ZONE_TOP = 3 * T; // y=48
    const DESK_ZONE_BOT = 8 * T; // y=128

    const startInDesks = this.y >= DESK_ZONE_TOP && this.y <= DESK_ZONE_BOT;
    const endInDesks = target.y >= DESK_ZONE_TOP && target.y <= DESK_ZONE_BOT;

    const waypoints = [{ x: this.x, y: this.y }];

    // Route through safe corridor above desks when either endpoint is in the desk zone
    // and there's significant movement in any direction
    const needsRouting = (dx > T || dy > T) && (startInDesks || endInDesks);

    if (needsRouting) {
      const startTileX = Math.round(this.x / T);
      const targetTileX = Math.round(target.x / T);

      // Always use aisle when leaving/entering a desk column to avoid walking
      // through desk furniture. Characters approach desks from the side.
      const lx = CONFIG.LEADER_DESK_POS.x;
      const hasDeskAt = (tx) => CONFIG.DESKS.some(d => d.x === tx) || tx === lx || tx === lx + 1;
      const startHasDesk = hasDeskAt(startTileX);
      const targetHasDesk = hasDeskAt(targetTileX);

      // 1. Go up to safe corridor, stepping into aisle first if in a desk column
      if (this.y > SAFE_Y) {
        if (startHasDesk) {
          const aisleX = (startTileX + 1) * T;
          waypoints.push({ x: aisleX, y: this.y });
          waypoints.push({ x: aisleX, y: SAFE_Y });
        } else {
          waypoints.push({ x: this.x, y: SAFE_Y });
        }
      }

      // 2. Walk horizontally at safe Y, then descend via aisle if target is a desk column
      if (targetHasDesk && endInDesks) {
        const aisleX = (targetTileX + 1) * T;
        waypoints.push({ x: aisleX, y: SAFE_Y });
        waypoints.push({ x: aisleX, y: target.y });
        waypoints.push({ x: target.x, y: target.y });
      } else {
        waypoints.push({ x: target.x, y: SAFE_Y });
        waypoints.push({ x: target.x, y: target.y });
      }
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

  triggerError() {
    this.errorTimer = 2.0;
  }

  update(dt) {
    this.animator.update(dt);
    if (this.errorTimer > 0) this.errorTimer -= dt;

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
        renderer.drawImageFlipped(sprite, this.x, this.y);
      } else {
        renderer.drawImage(sprite, this.x, this.y);
      }
    }

    // Error overlay (smoke bubble + red eyes)
    if (this.errorTimer > 0) {
      this._drawErrorOverlay(renderer);
    }
  }

  _drawErrorOverlay(renderer) {
    const cx = Math.floor(this.x);
    const cy = Math.floor(this.y);

    // Red angry eyes (rapid blink)
    if (Math.floor(this.errorTimer * 6) % 2 === 0) {
      renderer.pixel(cx + 6, cy + 5, CONFIG.COL.RED);
      renderer.pixel(cx + 9, cy + 5, CONFIG.COL.RED);
    }

    // Smoke/anger bubble above head
    const bx = cx + 4;
    const by = cy - 11;
    const wobble = Math.floor(Math.sin(this.errorTimer * 8));

    // Bubble background (rounded rect)
    renderer.fillRect(bx + wobble + 1, by, 6, 7, CONFIG.COL.DARK_GREY);
    renderer.fillRect(bx + wobble, by + 1, 8, 5, CONFIG.COL.DARK_GREY);
    // Tail
    renderer.pixel(bx + wobble + 3, by + 7, CONFIG.COL.DARK_GREY);
    renderer.pixel(bx + wobble + 2, by + 8, CONFIG.COL.DARK_GREY);

    // "!" symbol in red (centered in bubble)
    PixelFont.draw(renderer, '!', bx + wobble + 2, by + 1, CONFIG.COL.RED);

    // Smoke wisps above bubble (animated)
    const sp = Math.floor(this.errorTimer * 3) % 3;
    if (sp >= 0) renderer.pixel(bx + wobble + 1, by - 1, CONFIG.COL.LIGHT_GREY);
    if (sp >= 1) renderer.pixel(bx + wobble + 5, by - 2, CONFIG.COL.LIGHT_GREY);
    if (sp >= 2) renderer.pixel(bx + wobble + 3, by - 3, CONFIG.COL.LIGHT_GREY);
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
    this.setAnimation(this.type === 'leader' ? 'leader_type' : 'worker_type');
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
