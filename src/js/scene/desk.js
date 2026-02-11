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
    this.screenColor = CONFIG.COL.BLUE;
    this.screenColorTimer = 0;
  }

  update(dt) {
    if (this.occupied) {
      this.glowTimer += dt * 3;
      this.screenGlow = 0.5 + 0.5 * Math.sin(this.glowTimer);

      // Cycle screen color to simulate code changes
      this.screenColorTimer += dt;
      if (this.screenColorTimer > 0.4) {
        this.screenColorTimer = 0;
        const brightColors = [
          CONFIG.COL.BLUE, CONFIG.COL.GREEN, CONFIG.COL.RED,
          CONFIG.COL.ORANGE, CONFIG.COL.YELLOW, CONFIG.COL.PINK,
          CONFIG.COL.WHITE, CONFIG.COL.LIGHT_GREY, CONFIG.COL.INDIGO,
          CONFIG.COL.PEACH, CONFIG.COL.DARK_GREEN, CONFIG.COL.DARK_PURPLE,
        ];
        this.screenColor = brightColors[Math.floor(Math.random() * brightColors.length)];
      }
    } else {
      this.screenGlow = 0;
      this.screenColor = CONFIG.COL.BLUE;
      this.screenColorTimer = 0;
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
    const px = this.tileX * T - 4; // center 24px desk on 16px tile
    const py = this.tileY * T;
    const sc = this.occupied ? this.screenColor : CONFIG.COL.BLUE;

    // Desk surface (24px wide)
    r.fillRect(px + 1, py + 2, 22, T - 4, CONFIG.COL.BROWN);
    // Desk edge highlight
    r.fillRect(px + 1, py + 2, 22, 1, CONFIG.COL.ORANGE);

    // Monitor (centered)
    r.fillRect(px + 7, py, 10, 7, CONFIG.COL.DARK_GREY);
    r.fillRect(px + 8, py + 1, 8, 5, sc);

    // Keyboard (centered on desk)
    r.fillRect(px + 7, py + 8, 9, 3, CONFIG.COL.DARK_GREY);
    r.pixel(px + 8, py + 9, CONFIG.COL.LIGHT_GREY);
    r.pixel(px + 10, py + 9, CONFIG.COL.LIGHT_GREY);
    r.pixel(px + 12, py + 9, CONFIG.COL.LIGHT_GREY);
    r.pixel(px + 14, py + 9, CONFIG.COL.LIGHT_GREY);

    // Mouse (right of keyboard)
    r.fillRect(px + 18, py + 9, 2, 2, CONFIG.COL.LIGHT_GREY);

    // Screen glow when occupied
    if (this.screenGlow > 0.3 && this.occupied) {
      r.pixel(px + 10, py - 1, sc);
      r.pixel(px + 11, py - 1, sc);
      r.pixel(px + 12, py - 1, sc);
      r.pixel(px + 13, py - 1, sc);
    }
  }

  _drawWide() {
    const r = this.renderer;
    const T = CONFIG.TILE;
    const px = this.tileX * T;
    const py = this.tileY * T;
    const w = T * 2; // 2 tiles wide
    const sc = this.occupied ? this.screenColor : CONFIG.COL.BLUE;

    // Single desk surface spanning 2 tiles
    r.fillRect(px + 1, py + 2, w - 2, T - 4, CONFIG.COL.BROWN);
    // Desk edge highlight
    r.fillRect(px + 1, py + 2, w - 2, 1, CONFIG.COL.ORANGE);

    // Left monitor (larger)
    r.fillRect(px + 2, py, 10, 7, CONFIG.COL.DARK_GREY);
    r.fillRect(px + 3, py + 1, 8, 5, sc);

    // Right monitor (larger)
    r.fillRect(px + T + 4, py, 10, 7, CONFIG.COL.DARK_GREY);
    r.fillRect(px + T + 5, py + 1, 8, 5, sc);

    // Keyboard (centered between monitors)
    r.fillRect(px + 11, py + 8, 9, 3, CONFIG.COL.DARK_GREY);
    r.pixel(px + 12, py + 9, CONFIG.COL.LIGHT_GREY);
    r.pixel(px + 14, py + 9, CONFIG.COL.LIGHT_GREY);
    r.pixel(px + 16, py + 9, CONFIG.COL.LIGHT_GREY);
    r.pixel(px + 18, py + 9, CONFIG.COL.LIGHT_GREY);

    // Mouse (right of keyboard)
    r.fillRect(px + 21, py + 9, 2, 2, CONFIG.COL.LIGHT_GREY);

    // Screen glow when occupied
    if (this.screenGlow > 0.3 && this.occupied) {
      // Left monitor glow
      r.pixel(px + 5, py - 1, sc);
      r.pixel(px + 6, py - 1, sc);
      r.pixel(px + 7, py - 1, sc);
      // Right monitor glow
      r.pixel(px + T + 7, py - 1, sc);
      r.pixel(px + T + 8, py - 1, sc);
      r.pixel(px + T + 9, py - 1, sc);
    }
  }

  // Draw the chair in front of the desk
  drawChair() {
    const r = this.renderer;
    const T = CONFIG.TILE;
    let px = this.tileX * T;
    if (this.wide) {
      px = this.tileX * T + T / 2; // center on 2-tile wide desk
    }
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
