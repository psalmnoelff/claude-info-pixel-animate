class Whiteboard {
  constructor(renderer) {
    this.renderer = renderer;
    this.scribbles = []; // Array of {x, y, color} for drawn marks
    this.drawProgress = 0; // 0-1, how much is drawn
  }

  // Add scribble marks when leader draws
  addScribble() {
    const wb = CONFIG.WHITEBOARD;
    const baseX = wb.x * CONFIG.TILE + 4;
    const baseY = wb.y * CONFIG.TILE + 4;
    const maxW = wb.w * CONFIG.TILE - 8;
    const maxH = wb.h * CONFIG.TILE - 8;

    // Add a few random colored pixels as "writing"
    for (let i = 0; i < 3; i++) {
      this.scribbles.push({
        x: baseX + Math.floor(Math.random() * maxW),
        y: baseY + Math.floor(Math.random() * maxH),
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
    const T = CONFIG.TILE;
    const wb = CONFIG.WHITEBOARD;

    // Draw whiteboard as one solid rectangle
    const bx = wb.x * T;
    const by = wb.y * T;
    const bw = wb.w * T;
    const bh = wb.h * T;
    r.fillRect(bx + 1, by + 1, bw - 2, bh - 2, CONFIG.COL.WHITE);

    // Border
    r.fillRect(bx, by, bw, 1, CONFIG.COL.DARK_GREY);
    r.fillRect(bx, by + bh - 1, bw, 1, CONFIG.COL.DARK_GREY);
    r.fillRect(bx, by, 1, bh, CONFIG.COL.DARK_GREY);
    r.fillRect(bx + bw - 1, by, 1, bh, CONFIG.COL.DARK_GREY);

    // Draw scribbles
    for (const s of this.scribbles) {
      r.pixel(s.x, s.y, s.color);
      r.pixel(s.x + 1, s.y, s.color);
    }

    // Whiteboard tray (bottom edge)
    r.fillRect(wb.x * T + 2, (wb.y + wb.h) * T - 2, wb.w * T - 4, 2, CONFIG.COL.LIGHT_GREY);
  }
}
