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
    this.panicking = false;
    this.freezeProgress = 0; // 0 = normal, 1 = fully frozen
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
    this.stopMovement();

    const dx = Math.abs(target.x - this.x);
    const dy = Math.abs(target.y - this.y);

    if (dx < 1 && dy < 1) {
      if (callback) callback();
      return;
    }

    // Use pathfinding grid to plot route around desks
    const pathWaypoints = Character.pathGrid
      ? Character.pathGrid.findPath(this.x, this.y, target.x, target.y)
      : [{ x: target.x, y: target.y }];

    const waypoints = [{ x: this.x, y: this.y }, ...pathWaypoints];

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

    // Freeze: pause movement when frozen
    if (this.freezeProgress > 0.2 && this.tween && !this.tween.done) {
      // Don't update tween - character is frozen in place
      return;
    }

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

    // Apply shiver offset when frozen
    let drawX = this.x;
    let drawY = this.y;
    if (this.freezeProgress > 0.2) {
      drawX += (Math.random() - 0.5) * 2 * this.freezeProgress;
      drawY += (Math.random() - 0.5) * 1 * this.freezeProgress;
    }

    // Apply erratic head movement when panicking
    if (this.panicking) {
      drawX += (Math.random() - 0.5) * 2;
      drawY += (Math.random() - 0.5) * 1;
    }

    if (sprite) {
      if (!this.facingRight) {
        renderer.drawImageFlipped(sprite, drawX, drawY);
      } else {
        renderer.drawImage(sprite, drawX, drawY);
      }
    }

    // Panic overlay (pale skin)
    if (this.panicking) {
      this._drawPanicOverlay(renderer, drawX, drawY);
    }

    // Freeze overlay (white frost on body)
    if (this.freezeProgress > 0.2) {
      this._drawFreezeOverlay(renderer, drawX, drawY);
    }

    // Error overlay (speech bubble + red eyes)
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

    // Error bubble above head (bigger, white bg, black frame, red text)
    const bx = cx + 1;
    const by = cy - 16;
    const bw = 14;
    const bh = 12;
    const wobble = Math.floor(Math.sin(this.errorTimer * 8));

    // Black frame (rounded rect outline)
    renderer.fillRect(bx + wobble + 1, by, bw - 2, bh, CONFIG.COL.BLACK);
    renderer.fillRect(bx + wobble, by + 1, bw, bh - 2, CONFIG.COL.BLACK);

    // White interior
    renderer.fillRect(bx + wobble + 2, by + 1, bw - 4, bh - 2, CONFIG.COL.WHITE);
    renderer.fillRect(bx + wobble + 1, by + 2, bw - 2, bh - 4, CONFIG.COL.WHITE);

    // Tail (speech bubble pointer)
    renderer.fillRect(bx + wobble + 4, by + bh, 2, 1, CONFIG.COL.BLACK);
    renderer.pixel(bx + wobble + 5, by + bh + 1, CONFIG.COL.BLACK);

    // "!" symbol in red (centered in bubble)
    PixelFont.draw(renderer, '!!', bx + wobble + 3, by + 3, CONFIG.COL.RED);
  }

  _drawPanicOverlay(renderer, drawX, drawY) {
    const cx = Math.floor(drawX);
    const cy = Math.floor(drawY);

    // Pale skin overlay (semi-transparent white over face area)
    renderer.fillRectAlpha(cx + 4, cy + 3, 8, 6, '#fff', 0.35);

    // Wide panicked eyes
    renderer.pixel(cx + 6, cy + 5, CONFIG.COL.WHITE);
    renderer.pixel(cx + 9, cy + 5, CONFIG.COL.WHITE);
    renderer.pixel(cx + 6, cy + 4, CONFIG.COL.BLACK);
    renderer.pixel(cx + 9, cy + 4, CONFIG.COL.BLACK);
  }

  _drawFreezeOverlay(renderer, drawX, drawY) {
    const cx = Math.floor(drawX);
    const cy = Math.floor(drawY);
    const fp = this.freezeProgress;

    // Frost overlay on body (white pixels, density proportional to freeze)
    renderer.fillRectAlpha(cx + 2, cy + 2, 12, 12, '#fff', fp * 0.5);

    // Ice crystal pixels scattered on the character
    if (fp > 0.4) {
      renderer.pixel(cx + 3, cy + 3, CONFIG.COL.WHITE);
      renderer.pixel(cx + 11, cy + 5, CONFIG.COL.WHITE);
      renderer.pixel(cx + 7, cy + 10, CONFIG.COL.LIGHT_GREY);
    }
    if (fp > 0.6) {
      renderer.pixel(cx + 5, cy + 2, CONFIG.COL.WHITE);
      renderer.pixel(cx + 10, cy + 8, CONFIG.COL.WHITE);
      renderer.pixel(cx + 4, cy + 7, CONFIG.COL.LIGHT_GREY);
      renderer.pixel(cx + 9, cy + 3, CONFIG.COL.WHITE);
    }
    if (fp > 0.8) {
      // Nearly fully frozen - heavy frost
      renderer.fillRectAlpha(cx + 3, cy + 1, 10, 3, '#c2c3c7', 0.4);
      renderer.pixel(cx + 6, cy + 1, CONFIG.COL.WHITE);
      renderer.pixel(cx + 8, cy + 12, CONFIG.COL.WHITE);
    }

    // Snow pile at feet
    const pileH = Math.floor(fp * 4);
    if (pileH > 0) {
      renderer.fillRect(cx + 2, cy + 16 - pileH, 12, pileH, CONFIG.COL.WHITE);
      renderer.fillRect(cx + 1, cy + 16 - Math.floor(pileH * 0.6), 14, Math.floor(pileH * 0.6), CONFIG.COL.LIGHT_GREY);
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
