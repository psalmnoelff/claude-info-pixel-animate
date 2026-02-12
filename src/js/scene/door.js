class Door {
  constructor(renderer) {
    this.renderer = renderer;
    this.openAmount = 0; // 0 = closed, 1 = fully open
    this.targetOpen = 0;
    this.isAnimating = false;
  }

  open() {
    this.targetOpen = 1;
    this.isAnimating = true;
  }

  close() {
    this.targetOpen = 0;
    this.isAnimating = true;
  }

  update(dt) {
    if (!this.isAnimating) return;

    const speed = 3; // open/close speed
    if (this.openAmount < this.targetOpen) {
      this.openAmount = Math.min(this.openAmount + speed * dt, 1);
    } else if (this.openAmount > this.targetOpen) {
      this.openAmount = Math.max(this.openAmount - speed * dt, 0);
    }

    if (Math.abs(this.openAmount - this.targetOpen) < 0.01) {
      this.openAmount = this.targetOpen;
      this.isAnimating = false;
    }
  }

  draw() {
    const r = this.renderer;
    const T = CONFIG.TILE;
    const door = CONFIG.DOOR;
    const px = door.x * T;
    const py = door.y * T;
    const w = door.w * T;
    const h = door.h * T;

    if (this.openAmount > 0.5) {
      // Open door - dark opening with depth and frame
      r.fillRect(px, py, w, h, CONFIG.COL.BLACK);
      // Depth shading (dark blue at edges)
      r.fillRect(px + 1, py + 1, 2, h - 2, CONFIG.COL.DARK_BLUE);
      r.fillRect(px + w - 3, py + 1, 2, h - 2, CONFIG.COL.DARK_BLUE);
      r.fillRect(px + 1, py + 1, w - 2, 2, CONFIG.COL.DARK_BLUE);
      // Frame on sides and top
      r.fillRect(px, py, 1, h, CONFIG.COL.BROWN);
      r.fillRect(px + w - 1, py, 1, h, CONFIG.COL.BROWN);
      r.fillRect(px, py, w, 1, CONFIG.COL.BROWN);
      // Rounded top corners
      r.pixel(px, py, CONFIG.COL.DARK_BLUE);
      r.pixel(px + w - 1, py, CONFIG.COL.DARK_BLUE);
      // Threshold
      r.fillRect(px, py + h - 1, w, 1, CONFIG.COL.BROWN);
    } else {
      // Closed door - 1.5 tiles wide x 2 tiles tall (24x32px)
      // Door frame (brown outline with lighter inner edge)
      r.fillRect(px, py, w, h, CONFIG.COL.BROWN);
      r.fillRect(px + 1, py + 1, w - 2, h - 2, CONFIG.COL.ORANGE);
      r.fillRect(px + 2, py + 2, w - 4, h - 3, CONFIG.COL.BROWN);

      // Rounded top corners (arched doorway)
      r.pixel(px, py, CONFIG.COL.DARK_BLUE);
      r.pixel(px + 1, py, CONFIG.COL.DARK_BLUE);
      r.pixel(px, py + 1, CONFIG.COL.DARK_BLUE);
      r.pixel(px + w - 1, py, CONFIG.COL.DARK_BLUE);
      r.pixel(px + w - 2, py, CONFIG.COL.DARK_BLUE);
      r.pixel(px + w - 1, py + 1, CONFIG.COL.DARK_BLUE);

      // Upper recessed panel
      r.fillRect(px + 4, py + 4, w - 8, 9, CONFIG.COL.DARK_GREY);
      r.fillRect(px + 4, py + 4, w - 8, 8, CONFIG.COL.ORANGE);
      r.fillRect(px + 4, py + 4, w - 8, 1, CONFIG.COL.YELLOW);

      // Lower recessed panel
      r.fillRect(px + 4, py + 16, w - 8, 10, CONFIG.COL.DARK_GREY);
      r.fillRect(px + 4, py + 16, w - 8, 9, CONFIG.COL.ORANGE);
      r.fillRect(px + 4, py + 16, w - 8, 1, CONFIG.COL.YELLOW);

      // Doorknob (yellow circle with shadow)
      r.fillRect(px + w - 6, py + Math.floor(h / 2), 3, 3, CONFIG.COL.YELLOW);
      r.pixel(px + w - 6, py + Math.floor(h / 2) + 2, CONFIG.COL.DARK_GREY);

      // Threshold strip at bottom
      r.fillRect(px, py + h - 1, w, 1, CONFIG.COL.BLACK);
    }
  }
}
