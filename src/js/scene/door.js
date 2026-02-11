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
      // Open door
      const sprite = SpriteRenderer.get('door_open');
      if (sprite) {
        r.drawImage(sprite, px, py);
        r.drawImage(sprite, px + T, py);
      } else {
        // Dark opening
        r.fillRect(px, py, w, h, CONFIG.COL.BLACK);
        // Door frame
        r.fillRect(px, py, 1, h, CONFIG.COL.BROWN);
        r.fillRect(px + w - 1, py, 1, h, CONFIG.COL.BROWN);
        r.fillRect(px, py, w, 1, CONFIG.COL.BROWN);
      }
    } else {
      // Closed door
      const sprite = SpriteRenderer.get('door_closed');
      if (sprite) {
        r.drawImage(sprite, px, py);
        r.drawImage(sprite, px + T, py);
      } else {
        r.fillRect(px, py, w, h, CONFIG.COL.BROWN);
        // Door panels
        r.fillRect(px + 3, py + 3, w - 6, h / 2 - 4, CONFIG.COL.ORANGE);
        r.fillRect(px + 3, py + h / 2 + 1, w - 6, h / 2 - 4, CONFIG.COL.ORANGE);
        // Door handle
        r.fillRect(px + w - 6, py + h / 2 - 1, 2, 3, CONFIG.COL.YELLOW);
      }
    }
  }
}
