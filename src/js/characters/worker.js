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

    // Death animation state
    this.dying = false;
    this.deathTimer = 0;
    this.deathCallback = null;
    this.bodyAlpha = 1;
    this.soulAlpha = 1;
    this.soulY = 0;
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

  // Start phone-walking in the overflow area (right side, vertical pacing)
  startPhoneWalk() {
    this.state = 'phone';
    this.setAnimation('worker_phone');
    this.x = CONFIG.OVERFLOW_X + (Math.random() * 8 - 4);
    this.y = CONFIG.OVERFLOW_Y_MIN + Math.random() * (CONFIG.OVERFLOW_Y_MAX - CONFIG.OVERFLOW_Y_MIN);
    this.phoneDir = Math.random() > 0.5 ? 1 : -1; // +1 = down, -1 = up
    this.facingRight = true;
  }

  // Leave through door
  leave(callback) {
    this.moveTo(CONFIG.DOOR_POS, CONFIG.MOVE_SPEED, () => {
      this.visible = false;
      if (callback) callback();
    });
  }

  // Die animation: fall over, soul floats up, fade out
  die(callback) {
    this.dying = true;
    this.deathTimer = 0;
    this.deathCallback = callback;
    this.bodyAlpha = 1;
    this.soulAlpha = 1;
    this.soulY = 0;
    this.state = 'dead';
    this.stopMovement();
  }

  draw(renderer) {
    if (this.dying && this.visible) {
      this._drawDeath(renderer);
      return;
    }

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

  _drawDeath(renderer) {
    const cx = Math.floor(this.x);
    const cy = Math.floor(this.y);

    // Draw lying body (rotated 90 degrees - fallen over)
    const spriteName = this.animator.getCurrentSprite();
    let sprite;
    if (this.tintColor >= 0) {
      sprite = SpriteRenderer.getTinted(spriteName, this.tintColor);
    } else {
      sprite = SpriteRenderer.get(spriteName);
    }

    if (sprite && this.bodyAlpha > 0.01) {
      renderer.drawImageTransformed(sprite, cx + 8, cy + 14, Math.PI / 2, this.bodyAlpha, 8, 8);
    }

    // Draw soul floating up (after 0.8 seconds)
    if (this.deathTimer >= 0.8 && this.soulAlpha > 0.01) {
      renderer.setAlpha(this.soulAlpha);

      const sx = cx + 4;
      const sy = cy - this.soulY;

      // Ghost shape (small white figure)
      renderer.fillRect(sx + 2, sy, 4, 1, CONFIG.COL.WHITE);
      renderer.fillRect(sx + 1, sy + 1, 6, 1, CONFIG.COL.WHITE);
      renderer.fillRect(sx + 1, sy + 2, 6, 1, CONFIG.COL.WHITE);
      renderer.fillRect(sx + 1, sy + 3, 6, 1, CONFIG.COL.WHITE);
      // Wavy bottom edge
      renderer.fillRect(sx, sy + 4, 2, 1, CONFIG.COL.WHITE);
      renderer.fillRect(sx + 3, sy + 4, 2, 1, CONFIG.COL.WHITE);
      renderer.fillRect(sx + 6, sy + 4, 2, 1, CONFIG.COL.WHITE);
      // Eyes
      renderer.pixel(sx + 2, sy + 2, CONFIG.COL.BLACK);
      renderer.pixel(sx + 5, sy + 2, CONFIG.COL.BLACK);

      renderer.resetAlpha();
    }
  }

  update(dt) {
    // Death animation update
    if (this.dying) {
      this.deathTimer += dt;

      if (this.deathTimer < 0.8) {
        // Phase 1: lying still
      } else if (this.deathTimer < 3.0) {
        // Phase 2: soul rises, body and soul fade
        this.soulY = (this.deathTimer - 0.8) * 25;
        this.bodyAlpha = Math.max(0, 1 - (this.deathTimer - 0.8) / 2.0);
        this.soulAlpha = Math.max(0, 1 - (this.deathTimer - 1.5) / 1.5);
      } else {
        // Phase 3: done
        this.visible = false;
        this.dying = false;
        if (this.deathCallback) {
          const cb = this.deathCallback;
          this.deathCallback = null;
          cb();
        }
      }
      return; // Skip normal update while dying
    }

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

    // Phone walking behavior (vertical pacing on right side)
    if (this.state === 'phone') {
      this.y += this.phoneDir * CONFIG.WALK_SPEED * 0.5;
      this.facingRight = true;
      this.phoneTalkTimer += dt;

      // Bounce at vertical edges
      if (this.y < CONFIG.OVERFLOW_Y_MIN) {
        this.phoneDir = 1;
      } else if (this.y > CONFIG.OVERFLOW_Y_MAX) {
        this.phoneDir = -1;
      }
    }
  }
}
