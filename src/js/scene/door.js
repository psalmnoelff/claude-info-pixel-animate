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
      // Open door - 2 tiles tall x 2 tiles wide
      const tl = SpriteRenderer.get('door_open_tl');
      const tr = SpriteRenderer.get('door_open_tr');
      const bl = SpriteRenderer.get('door_open_bl');
      const br = SpriteRenderer.get('door_open_br');
      if (tl && tr && bl && br) {
        r.drawImage(tl, px, py);
        r.drawImage(tr, px + T, py);
        r.drawImage(bl, px, py + T);
        r.drawImage(br, px + T, py + T);
      } else {
        // Fallback: dark opening with depth and frame
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
      }
    } else {
      // Closed door - 2 tiles tall x 2 tiles wide
      const tl = SpriteRenderer.get('door_closed_tl');
      const tr = SpriteRenderer.get('door_closed_tr');
      const bl = SpriteRenderer.get('door_closed_bl');
      const br = SpriteRenderer.get('door_closed_br');
      if (tl && tr && bl && br) {
        r.drawImage(tl, px, py);
        r.drawImage(tr, px + T, py);
        r.drawImage(bl, px, py + T);
        r.drawImage(br, px + T, py + T);
      } else {
        // Fallback: detailed closed door
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
        r.fillRect(px + 5, py + 4, w - 10, 9, CONFIG.COL.DARK_GREY);
        r.fillRect(px + 5, py + 4, w - 10, 8, CONFIG.COL.ORANGE);
        r.fillRect(px + 5, py + 4, w - 10, 1, CONFIG.COL.YELLOW);

        // Lower recessed panel
        r.fillRect(px + 5, py + 16, w - 10, 10, CONFIG.COL.DARK_GREY);
        r.fillRect(px + 5, py + 16, w - 10, 9, CONFIG.COL.ORANGE);
        r.fillRect(px + 5, py + 16, w - 10, 1, CONFIG.COL.YELLOW);

        // Doorknob (yellow circle with shadow)
        r.fillRect(px + w - 8, py + 16, 3, 3, CONFIG.COL.YELLOW);
        r.pixel(px + w - 8, py + 18, CONFIG.COL.DARK_GREY);

        // Threshold strip at bottom
        r.fillRect(px, py + h - 1, w, 1, CONFIG.COL.BLACK);
      }
    }
  }
}
