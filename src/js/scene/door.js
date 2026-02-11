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
      // Open door - 3 tiles tall (top, middle, bottom) x 2 tiles wide
      const tl = SpriteRenderer.get('door_open_tl');
      const tr = SpriteRenderer.get('door_open_tr');
      const ml = SpriteRenderer.get('door_open_ml');
      const mr = SpriteRenderer.get('door_open_mr');
      const bl = SpriteRenderer.get('door_open_bl');
      const br = SpriteRenderer.get('door_open_br');
      if (tl && tr && ml && mr && bl && br) {
        r.drawImage(tl, px, py);
        r.drawImage(tr, px + T, py);
        r.drawImage(ml, px, py + T);
        r.drawImage(mr, px + T, py + T);
        r.drawImage(bl, px, py + 2 * T);
        r.drawImage(br, px + T, py + 2 * T);
      } else {
        // Fallback: dark opening with frame
        r.fillRect(px, py, w, h, CONFIG.COL.BLACK);
        r.fillRect(px, py, 1, h, CONFIG.COL.BROWN);
        r.fillRect(px + w - 1, py, 1, h, CONFIG.COL.BROWN);
        r.fillRect(px, py, w, 1, CONFIG.COL.BROWN);
        r.fillRect(px, py + h - 1, w, 1, CONFIG.COL.BROWN);
      }
    } else {
      // Closed door - 3 tiles tall (top, middle, bottom) x 2 tiles wide
      const tl = SpriteRenderer.get('door_closed_tl');
      const tr = SpriteRenderer.get('door_closed_tr');
      const ml = SpriteRenderer.get('door_closed_ml');
      const mr = SpriteRenderer.get('door_closed_mr');
      const bl = SpriteRenderer.get('door_closed_bl');
      const br = SpriteRenderer.get('door_closed_br');
      if (tl && tr && ml && mr && bl && br) {
        r.drawImage(tl, px, py);
        r.drawImage(tr, px + T, py);
        r.drawImage(ml, px, py + T);
        r.drawImage(mr, px + T, py + T);
        r.drawImage(bl, px, py + 2 * T);
        r.drawImage(br, px + T, py + 2 * T);
      } else {
        // Fallback: brown door with panels
        r.fillRect(px, py, w, h, CONFIG.COL.BROWN);
        r.fillRect(px + 3, py + 3, w - 6, h / 3 - 4, CONFIG.COL.ORANGE);
        r.fillRect(px + 3, py + h / 3 + 1, w - 6, h / 3 - 4, CONFIG.COL.ORANGE);
        r.fillRect(px + 3, py + 2 * h / 3 + 1, w - 6, h / 3 - 4, CONFIG.COL.ORANGE);
        r.fillRect(px + w - 6, py + h / 2 - 1, 2, 3, CONFIG.COL.YELLOW);
      }
    }
  }
}
