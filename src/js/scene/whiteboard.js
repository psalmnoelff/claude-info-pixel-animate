class Whiteboard {
  constructor(renderer) {
    this.renderer = renderer;
    this.elements = []; // Structured elements drawn on the board
    this.drawProgress = 0;
  }

  _getBounds() {
    const T = CONFIG.TILE;
    const wb = CONFIG.WHITEBOARD;
    const bx = wb.x * T;
    const by = 12;
    const bw = wb.w * T;
    const bh = 24;
    return { bx, by, bw, bh };
  }

  // Add a structured element when leader draws
  addScribble() {
    const { bx, by, bw, bh } = this._getBounds();
    const ix = bx + 4;
    const iy = by + 4;
    const iw = bw - 8;
    const ih = bh - 8;

    const colors = [CONFIG.COL.BLUE, CONFIG.COL.RED, CONFIG.COL.DARK_GREEN];
    const col = colors[Math.floor(Math.random() * colors.length)];

    const type = Math.floor(Math.random() * 6);
    const x = ix + Math.floor(Math.random() * (iw - 12));
    const y = iy + Math.floor(Math.random() * (ih - 6));

    if (type === 0) {
      // Small box
      const w = 4 + Math.floor(Math.random() * 8);
      const h = 3 + Math.floor(Math.random() * 4);
      this.elements.push({ type: 'box', x, y, w, h, col });
    } else if (type === 1) {
      // Horizontal line / arrow
      const len = 5 + Math.floor(Math.random() * 10);
      this.elements.push({ type: 'line', x, y: y + 2, len, col });
    } else if (type === 2) {
      // Number or short label
      const labels = ['1', '2', '3', 'A', 'B', '?', '#', '%', 'OK', 'v2'];
      const text = labels[Math.floor(Math.random() * labels.length)];
      this.elements.push({ type: 'text', x, y, text, col });
    } else if (type === 3) {
      // Filled circle / dot
      const r = 1 + Math.floor(Math.random() * 2);
      this.elements.push({ type: 'dot', x: x + 3, y: y + 2, r, col });
    } else if (type === 4) {
      // Underline with text above
      const labels = ['API', 'DB', 'UI', 'v3'];
      const text = labels[Math.floor(Math.random() * labels.length)];
      this.elements.push({ type: 'heading', x, y, text, col });
    } else {
      // Bullet point line
      this.elements.push({ type: 'bullet', x, y, len: 4 + Math.floor(Math.random() * 8), col });
    }

    // Cap elements
    if (this.elements.length > 18) {
      this.elements = this.elements.slice(-18);
    }
  }

  clearBoard() {
    this.elements = [];
    this.drawProgress = 0;
  }

  draw() {
    const r = this.renderer;
    const { bx, by, bw, bh } = this._getBounds();

    // Black frame
    r.fillRect(bx, by, bw, bh, CONFIG.COL.BLACK);

    // White interior
    r.fillRect(bx + 2, by + 2, bw - 4, bh - 4, CONFIG.COL.WHITE);

    // Clip bounds for elements
    const cx1 = bx + 3;
    const cy1 = by + 3;
    const cx2 = bx + bw - 3;
    const cy2 = by + bh - 3;

    // Draw elements
    for (const el of this.elements) {
      switch (el.type) {
        case 'box':
          // Outlined rectangle
          r.fillRect(el.x, el.y, Math.min(el.w, cx2 - el.x), 1, el.col);
          r.fillRect(el.x, el.y + el.h - 1, Math.min(el.w, cx2 - el.x), 1, el.col);
          r.fillRect(el.x, el.y, 1, Math.min(el.h, cy2 - el.y), el.col);
          r.fillRect(el.x + el.w - 1, el.y, 1, Math.min(el.h, cy2 - el.y), el.col);
          break;

        case 'line':
          r.fillRect(el.x, el.y, Math.min(el.len, cx2 - el.x), 1, el.col);
          // Arrow head
          if (el.x + el.len < cx2) {
            r.pixel(el.x + el.len - 1, el.y - 1, el.col);
            r.pixel(el.x + el.len - 1, el.y + 1, el.col);
          }
          break;

        case 'text':
          PixelFont.draw(r, el.text, el.x, el.y, el.col);
          break;

        case 'dot':
          // Filled circle approximation
          if (el.r === 1) {
            r.fillRect(el.x, el.y, 2, 2, el.col);
          } else {
            r.fillRect(el.x - 1, el.y, 3, 1, el.col);
            r.fillRect(el.x - 2, el.y + 1, 5, 1, el.col);
            r.fillRect(el.x - 1, el.y + 2, 3, 1, el.col);
          }
          break;

        case 'heading': {
          PixelFont.draw(r, el.text, el.x, el.y, el.col);
          // Underline
          const tw = el.text.length * 4;
          r.fillRect(el.x, el.y + 6, tw, 1, el.col);
          break;
        }

        case 'bullet':
          // Bullet dot + line
          r.fillRect(el.x, el.y + 1, 2, 2, el.col);
          r.fillRect(el.x + 3, el.y + 2, Math.min(el.len, cx2 - el.x - 3), 1, el.col);
          break;
      }
    }

    // Pen holder tray
    const trayX = bx + bw - 16;
    const trayY = by + bh;
    r.fillRect(trayX, trayY, 14, 3, CONFIG.COL.LIGHT_GREY);
    r.fillRect(trayX + 2, trayY, 2, 2, CONFIG.COL.RED);
    r.fillRect(trayX + 6, trayY, 2, 2, CONFIG.COL.BLUE);
    r.fillRect(trayX + 10, trayY, 2, 2, CONFIG.COL.GREEN);
  }
}
