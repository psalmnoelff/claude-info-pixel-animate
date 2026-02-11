class Desk {
  constructor(renderer, tileX, tileY, index, wide) {
    this.renderer = renderer;
    this.tileX = tileX;
    this.tileY = tileY;
    this.index = index;
    this.wide = wide || false; // 2-tile wide desk
    this.screenGlow = 0; // 0-1 glow intensity
    this.glowTimer = Math.random() * Math.PI * 2;
    this.occupied = false;
  }

  update(dt) {
    if (this.occupied) {
      this.glowTimer += dt * 3;
      this.screenGlow = 0.5 + 0.5 * Math.sin(this.glowTimer);
    } else {
      this.screenGlow = 0;
    }
  }

  draw() {
    if (this.wide) {
      this._drawWide();
    } else {
      this._drawNormal();
    }
  }

  _drawNormal() {
    const r = this.renderer;
    const T = CONFIG.TILE;
    const px = this.tileX * T;
    const py = this.tileY * T;

    // Desk surface (top-down view matching leader desk style)
    r.fillRect(px + 1, py + 2, T - 2, T - 4, CONFIG.COL.BROWN);
    // Desk edge highlight
    r.fillRect(px + 1, py + 2, T - 2, 1, CONFIG.COL.ORANGE);

    // Monitor (centered, larger)
    r.fillRect(px + 3, py, 10, 7, CONFIG.COL.DARK_GREY);
    r.fillRect(px + 4, py + 1, 8, 5, CONFIG.COL.BLUE);

    // Screen glow when occupied
    if (this.screenGlow > 0.3 && this.occupied) {
      r.pixel(px + 6, py - 1, CONFIG.COL.BLUE);
      r.pixel(px + 7, py - 1, CONFIG.COL.BLUE);
      r.pixel(px + 8, py - 1, CONFIG.COL.BLUE);
      r.pixel(px + 9, py - 1, CONFIG.COL.BLUE);
    }
  }

  _drawWide() {
    const r = this.renderer;
    const T = CONFIG.TILE;
    const px = this.tileX * T;
    const py = this.tileY * T;
    const w = T * 2; // 2 tiles wide

    // Single desk surface spanning 2 tiles
    r.fillRect(px + 1, py + 2, w - 2, T - 4, CONFIG.COL.BROWN);
    // Desk edge highlight
    r.fillRect(px + 1, py + 2, w - 2, 1, CONFIG.COL.ORANGE);

    // Left monitor (larger)
    r.fillRect(px + 2, py, 10, 7, CONFIG.COL.DARK_GREY);
    r.fillRect(px + 3, py + 1, 8, 5, CONFIG.COL.BLUE);

    // Right monitor (larger)
    r.fillRect(px + T + 4, py, 10, 7, CONFIG.COL.DARK_GREY);
    r.fillRect(px + T + 5, py + 1, 8, 5, CONFIG.COL.BLUE);

    // Screen glow when occupied
    if (this.screenGlow > 0.3 && this.occupied) {
      // Left monitor glow
      r.pixel(px + 5, py - 1, CONFIG.COL.BLUE);
      r.pixel(px + 6, py - 1, CONFIG.COL.BLUE);
      r.pixel(px + 7, py - 1, CONFIG.COL.BLUE);
      // Right monitor glow
      r.pixel(px + T + 7, py - 1, CONFIG.COL.BLUE);
      r.pixel(px + T + 8, py - 1, CONFIG.COL.BLUE);
      r.pixel(px + T + 9, py - 1, CONFIG.COL.BLUE);
    }
  }

  // Draw the chair in front of the desk
  drawChair() {
    const r = this.renderer;
    const T = CONFIG.TILE;
    const px = this.tileX * T;
    const py = (this.tileY + 1) * T;

    const chairSprite = SpriteRenderer.get('chair');
    if (chairSprite) {
      r.drawImage(chairSprite, px, py);
    } else {
      // Fallback chair
      r.fillRect(px + 4, py + 2, 8, 6, CONFIG.COL.DARK_GREY);
      r.fillRect(px + 5, py + 8, 2, 3, CONFIG.COL.DARK_GREY);
      r.fillRect(px + 9, py + 8, 2, 3, CONFIG.COL.DARK_GREY);
    }
  }
}
