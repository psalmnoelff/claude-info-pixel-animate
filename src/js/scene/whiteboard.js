class Whiteboard {
  constructor(renderer) {
    this.renderer = renderer;
    this.scribbles = []; // Array of {x, y, color} for drawn marks
    this.drawProgress = 0; // 0-1, how much is drawn
  }

  // Pixel bounds of the whiteboard interior (for scribble placement)
  _getBounds() {
    const T = CONFIG.TILE;
    const wb = CONFIG.WHITEBOARD;
    const bx = wb.x * T;
    const by = 4; // floating offset from top of wall
    const bw = wb.w * T;
    const bh = 24;
    return { bx, by, bw, bh };
  }

  // Add scribble marks when leader draws
  addScribble() {
    const { bx, by, bw, bh } = this._getBounds();
    const innerX = bx + 3;
    const innerY = by + 3;
    const innerW = bw - 6;
    const innerH = bh - 6;

    // Add a few random colored pixels as "writing"
    for (let i = 0; i < 3; i++) {
      this.scribbles.push({
        x: innerX + Math.floor(Math.random() * innerW),
        y: innerY + Math.floor(Math.random() * innerH),
        color: [CONFIG.COL.BLUE, CONFIG.COL.RED, CONFIG.COL.DARK_GREEN][Math.floor(Math.random() * 3)]
      });
    }

    // Cap scribbles
    if (this.scribbles.length > 60) {
      this.scribbles = this.scribbles.slice(-60);
    }
  }

  clearBoard() {
    this.scribbles = [];
    this.drawProgress = 0;
  }

  draw() {
    const r = this.renderer;
    const { bx, by, bw, bh } = this._getBounds();

    // Black frame (2px border)
    r.fillRect(bx, by, bw, bh, CONFIG.COL.BLACK);

    // White interior
    r.fillRect(bx + 2, by + 2, bw - 4, bh - 4, CONFIG.COL.WHITE);

    // Draw scribbles
    for (const s of this.scribbles) {
      r.pixel(s.x, s.y, s.color);
      r.pixel(s.x + 1, s.y, s.color);
    }

    // Pen holder tray (bottom-right, below board)
    const trayX = bx + bw - 16;
    const trayY = by + bh;
    r.fillRect(trayX, trayY, 14, 3, CONFIG.COL.LIGHT_GREY);
    // Marker caps (red, blue, green)
    r.fillRect(trayX + 2, trayY, 2, 2, CONFIG.COL.RED);
    r.fillRect(trayX + 6, trayY, 2, 2, CONFIG.COL.BLUE);
    r.fillRect(trayX + 10, trayY, 2, 2, CONFIG.COL.GREEN);
  }
}
