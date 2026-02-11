class Desk {
  constructor(renderer, tileX, tileY, index) {
    this.renderer = renderer;
    this.tileX = tileX;
    this.tileY = tileY;
    this.index = index;
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
    const r = this.renderer;
    const T = CONFIG.TILE;
    const px = this.tileX * T;
    const py = this.tileY * T;

    // Draw desk sprite or fallback
    const deskSprite = SpriteRenderer.get('desk');
    if (deskSprite) {
      r.drawImage(deskSprite, px, py);
    } else {
      // Fallback: desk surface
      r.fillRect(px + 1, py + 2, T - 2, T - 4, CONFIG.COL.BROWN);
      // Monitor
      r.fillRect(px + 5, py + 1, 6, 5, CONFIG.COL.DARK_GREY);
      r.fillRect(px + 6, py + 2, 4, 3, CONFIG.COL.BLUE);
    }

    // Screen glow overlay when occupied
    if (this.screenGlow > 0.3 && this.occupied) {
      const glowColor = CONFIG.COL.BLUE;
      // Subtle glow pixel above monitor
      r.pixel(px + 7, py, glowColor);
      r.pixel(px + 8, py, glowColor);
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
