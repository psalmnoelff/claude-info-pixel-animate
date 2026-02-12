// Screen color themes: [background, text]
const SCREEN_THEMES = [
  [CONFIG.COL.BLACK, CONFIG.COL.GREEN],        // terminal green
  [CONFIG.COL.WHITE, CONFIG.COL.BLACK],         // light mode
  [CONFIG.COL.DARK_BLUE, CONFIG.COL.YELLOW],   // blue/yellow
  [CONFIG.COL.BLACK, CONFIG.COL.BLUE],          // blue on black
  [CONFIG.COL.DARK_PURPLE, CONFIG.COL.PEACH],   // purple/peach
  [CONFIG.COL.BLACK, CONFIG.COL.WHITE],         // white on black
  [CONFIG.COL.DARK_GREEN, CONFIG.COL.GREEN],    // matrix
  [CONFIG.COL.DARK_BLUE, CONFIG.COL.LIGHT_GREY], // IDE dark
];

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
    this.sleeping = false;
    this.chairOffset = 0;   // 0 = pushed in, 5 = pulled back
    this.chairTarget = 0;

    // Random screen color theme per desk
    const theme = SCREEN_THEMES[Math.floor(Math.random() * SCREEN_THEMES.length)];
    this.screenBg = theme[0];
    this.screenFg = theme[1];

    // Generate random code lines for scrolling effect
    this.codeLines = this._generateCodeLines(24);
    this.scrollOffset = 0;
    // Second set for wide desk right monitor
    if (this.wide) {
      this.codeLinesR = this._generateCodeLines(24);
    }
  }

  _generateCodeLines(count) {
    const lines = [];
    for (let i = 0; i < count; i++) {
      if (Math.random() < 0.15) {
        lines.push(null); // blank line
      } else {
        const indent = Math.floor(Math.random() * 3);
        const len = 1 + Math.floor(Math.random() * (7 - indent));
        lines.push({ indent, len });
      }
    }
    return lines;
  }

  update(dt) {
    if (this.sleeping) {
      this.screenGlow = 0;
    } else if (this.occupied) {
      this.glowTimer += dt * 3;
      this.screenGlow = 0.5 + 0.5 * Math.sin(this.glowTimer);
      // Scroll code lines upward
      this.scrollOffset += dt * 3;
    } else {
      this.screenGlow = 0;
    }

    // Chair push-in/pull-back animation
    this.chairTarget = this.occupied ? 1 : 0;
    const chairSpeed = 40;
    if (Math.abs(this.chairOffset - this.chairTarget) > 0.1) {
      if (this.chairOffset < this.chairTarget) {
        this.chairOffset = Math.min(this.chairOffset + chairSpeed * dt, this.chairTarget);
      } else {
        this.chairOffset = Math.max(this.chairOffset - chairSpeed * dt, this.chairTarget);
      }
    } else {
      this.chairOffset = this.chairTarget;
    }
  }

  draw() {
    if (this.wide) {
      this._drawWide();
    } else {
      this._drawNormal();
    }
  }

  // Draw code lines scrolling on a screen area
  _drawCodeScreen(r, sx, sy, sw, sh, lines) {
    r.fillRect(sx, sy, sw, sh, this.screenBg);
    const startLine = Math.floor(this.scrollOffset);
    for (let row = 0; row < sh; row++) {
      const lineIdx = (startLine + row) % lines.length;
      const line = lines[lineIdx];
      if (!line) continue;
      const len = Math.min(line.len, sw - line.indent);
      if (len > 0) {
        r.fillRect(sx + line.indent, sy + row, len, 1, this.screenFg);
      }
    }
  }

  _drawNormal() {
    const r = this.renderer;
    const T = CONFIG.TILE;
    const px = this.tileX * T - 4; // center 24px desk on 16px tile
    const py = this.tileY * T;

    // Desk frame (black outline with rounded corners)
    r.fillRect(px + 1, py + 1, 22, T - 2, CONFIG.COL.BLACK);
    r.fillRect(px, py + 2, 24, T - 4, CONFIG.COL.BLACK);
    // Desk surface (24px wide)
    r.fillRect(px + 1, py + 2, 22, T - 4, CONFIG.COL.BROWN);
    // Desk edge highlight
    r.fillRect(px + 1, py + 2, 22, 1, CONFIG.COL.ORANGE);

    // Monitor (centered)
    r.fillRect(px + 7, py, 10, 7, CONFIG.COL.DARK_GREY);
    if (this.sleeping) {
      r.fillRect(px + 8, py + 1, 8, 5, CONFIG.COL.BLACK);
    } else if (this.occupied) {
      this._drawCodeScreen(r, px + 8, py + 1, 8, 5, this.codeLines);
    } else {
      r.fillRect(px + 8, py + 1, 8, 5, CONFIG.COL.BLUE);
    }

    // Keyboard (rounded outline)
    r.fillRect(px + 8, py + 8, 7, 3, CONFIG.COL.DARK_GREY);
    r.fillRect(px + 7, py + 9, 9, 1, CONFIG.COL.DARK_GREY);
    r.pixel(px + 8, py + 9, CONFIG.COL.LIGHT_GREY);
    r.pixel(px + 10, py + 9, CONFIG.COL.LIGHT_GREY);
    r.pixel(px + 12, py + 9, CONFIG.COL.LIGHT_GREY);
    r.pixel(px + 14, py + 9, CONFIG.COL.LIGHT_GREY);

    // Mouse (right of keyboard)
    r.fillRect(px + 18, py + 9, 2, 2, CONFIG.COL.LIGHT_GREY);

    // Screen glow when occupied and not sleeping
    if (this.screenGlow > 0.3 && this.occupied && !this.sleeping) {
      r.pixel(px + 10, py - 1, this.screenFg);
      r.pixel(px + 11, py - 1, this.screenFg);
      r.pixel(px + 12, py - 1, this.screenFg);
      r.pixel(px + 13, py - 1, this.screenFg);
    }
  }

  _drawWide() {
    const r = this.renderer;
    const T = CONFIG.TILE;
    const px = this.tileX * T + 8; // offset to center 32px desk on middle column
    const py = this.tileY * T;
    const w = T * 2; // 2 tiles wide

    // Desk frame (black outline with rounded corners)
    r.fillRect(px + 1, py + 1, w - 2, T - 2, CONFIG.COL.BLACK);
    r.fillRect(px, py + 2, w, T - 4, CONFIG.COL.BLACK);
    // Single desk surface spanning 2 tiles
    r.fillRect(px + 1, py + 2, w - 2, T - 4, CONFIG.COL.BROWN);
    // Desk edge highlight
    r.fillRect(px + 1, py + 2, w - 2, 1, CONFIG.COL.ORANGE);

    // Left monitor
    r.fillRect(px + 2, py, 10, 7, CONFIG.COL.DARK_GREY);
    if (this.sleeping) {
      r.fillRect(px + 3, py + 1, 8, 5, CONFIG.COL.BLACK);
    } else if (this.occupied) {
      this._drawCodeScreen(r, px + 3, py + 1, 8, 5, this.codeLines);
    } else {
      r.fillRect(px + 3, py + 1, 8, 5, CONFIG.COL.BLUE);
    }

    // Right monitor
    r.fillRect(px + T + 4, py, 10, 7, CONFIG.COL.DARK_GREY);
    if (this.sleeping) {
      r.fillRect(px + T + 5, py + 1, 8, 5, CONFIG.COL.BLACK);
    } else if (this.occupied) {
      this._drawCodeScreen(r, px + T + 5, py + 1, 8, 5, this.codeLinesR);
    } else {
      r.fillRect(px + T + 5, py + 1, 8, 5, CONFIG.COL.BLUE);
    }

    // Keyboard (rounded outline)
    r.fillRect(px + 12, py + 8, 7, 3, CONFIG.COL.DARK_GREY);
    r.fillRect(px + 11, py + 9, 9, 1, CONFIG.COL.DARK_GREY);
    r.pixel(px + 12, py + 9, CONFIG.COL.LIGHT_GREY);
    r.pixel(px + 14, py + 9, CONFIG.COL.LIGHT_GREY);
    r.pixel(px + 16, py + 9, CONFIG.COL.LIGHT_GREY);
    r.pixel(px + 18, py + 9, CONFIG.COL.LIGHT_GREY);

    // Mouse (right of keyboard)
    r.fillRect(px + 21, py + 9, 2, 2, CONFIG.COL.LIGHT_GREY);

    // Screen glow when occupied and not sleeping
    if (this.screenGlow > 0.3 && this.occupied && !this.sleeping) {
      // Left monitor glow
      r.pixel(px + 5, py - 1, this.screenFg);
      r.pixel(px + 6, py - 1, this.screenFg);
      r.pixel(px + 7, py - 1, this.screenFg);
      // Right monitor glow
      r.pixel(px + T + 7, py - 1, this.screenFg);
      r.pixel(px + T + 8, py - 1, this.screenFg);
      r.pixel(px + T + 9, py - 1, this.screenFg);
    }
  }

  // Draw the chair in front of the desk
  drawChair() {
    const r = this.renderer;
    const T = CONFIG.TILE;
    let px = this.tileX * T;
    if (this.wide) {
      px = this.tileX * T + T; // align with middle column worker chairs
    }
    const py = (this.tileY + 1) * T - 3 + Math.round(this.chairOffset);

    const chairSprite = SpriteRenderer.get('chair');
    if (chairSprite) {
      r.drawImage(chairSprite, px, py);
    } else {
      // Fallback chair — white frame, black seat
      r.fillRect(px + 4, py + 2, 8, 6, CONFIG.COL.WHITE);
      r.fillRect(px + 5, py + 3, 6, 4, CONFIG.COL.BLACK);
      r.fillRect(px + 5, py + 8, 2, 3, CONFIG.COL.WHITE);
      r.fillRect(px + 9, py + 8, 2, 3, CONFIG.COL.WHITE);
    }
  }
}
