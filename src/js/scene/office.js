// Office background rendering - floor, walls, furniture
class Office {
  constructor(renderer, stateMachine, fireStatus) {
    this.renderer = renderer;
    this.stateMachine = stateMachine;
    this.fireStatus = fireStatus;
  }

  draw() {
    const r = this.renderer;
    const T = CONFIG.TILE;

    for (let row = 0; row < CONFIG.ROWS; row++) {
      for (let col = 0; col < CONFIG.COLS; col++) {
        if (row < 3) {
          // Wall area (3 tiles tall = 48px)
          r.fillRect(col * T, row * T, T, T, CONFIG.COL.DARK_BLUE);
        } else {
          // Floor - dark blue carpet with subtle grain
          r.fillRect(col * T, row * T, T, T, CONFIG.COL.DARK_BLUE);
          const seed = (row * 31 + col * 17) % 97;
          const gx = (seed * 7 + 3) % T;
          const gy = (seed * 11 + 5) % T;
          r.pixel(col * T + gx, row * T + gy, CONFIG.COL.BLACK);
          const gx2 = (seed * 13 + 9) % T;
          const gy2 = (seed * 5 + 1) % T;
          r.pixel(col * T + gx2, row * T + gy2, CONFIG.COL.DARK_PURPLE);
        }
      }
    }

    // Wall baseboard
    r.fillRect(0, 3 * T - 2, CONFIG.WIDTH, 2, CONFIG.COL.BROWN);

    // Wall decoration - subtle horizontal line
    r.fillRect(0, T + 8, CONFIG.WIDTH, 1, CONFIG.COL.INDIGO);

    // Windows on the wall (centered in 48px wall)
    this._drawWindow(r, 29, 14, 22, 20);   // Left section
    this._drawWindow(r, 221, 14, 22, 20);  // Right section

    // Fire on window panes (overwrites blue sky with fire)
    if (this.fireStatus) this.fireStatus.drawFire();

    // Redraw cross dividers on top of fire (so panes look divided)
    if (this.fireStatus && this.fireStatus.fireIntensity > 0.01) {
      this._drawWindowOverlay(r, 29, 14, 22, 20);
      this._drawWindowOverlay(r, 221, 14, 22, 20);
    }

    // Window tint (orange glow on glass)
    if (this.fireStatus) this.fireStatus.drawWindowTint();

    // Potted plants on the baseboard (wall level)
    this._drawPlant(r, 4 * T + 4, 3 * T - 13, CONFIG.COL.RED);     // Left of whiteboard
    this._drawPlant(r, 12 * T + 4, 3 * T - 13, CONFIG.COL.YELLOW);  // Right of whiteboard
    this._drawPlant(r, 16 * T + 4, 3 * T - 13, CONFIG.COL.PINK);    // Left of door
    this._drawPlant(r, 19 * T - 2, 3 * T - 13, CONFIG.COL.GREEN);   // Right of door

    // Corner plants (bottom corners, just above HUD)
    const floorBottom = CONFIG.HEIGHT - 32 - 12;
    this._drawPlant(r, 2, floorBottom - 3, CONFIG.COL.GREEN);            // Lower-left
    this._drawPlant(r, CONFIG.WIDTH - 12, floorBottom - 3, CONFIG.COL.BLUE);  // Lower-right
  }

  _drawWindow(r, x, y, w, h) {
    // Outer frame (2px grey border)
    r.fillRect(x, y, w, h, CONFIG.COL.LIGHT_GREY);

    // Rounded corners (replace with wall color)
    r.pixel(x, y, CONFIG.COL.DARK_BLUE);
    r.pixel(x + w - 1, y, CONFIG.COL.DARK_BLUE);
    r.pixel(x, y + h - 1, CONFIG.COL.DARK_BLUE);
    r.pixel(x + w - 1, y + h - 1, CONFIG.COL.DARK_BLUE);

    // Inner pane (sky blue)
    r.fillRect(x + 2, y + 2, w - 4, h - 4, CONFIG.COL.BLUE);

    // Cross divider
    r.fillRect(x + Math.floor(w / 2), y + 2, 1, h - 4, CONFIG.COL.LIGHT_GREY);
    r.fillRect(x + 2, y + Math.floor(h / 2), w - 4, 1, CONFIG.COL.LIGHT_GREY);

    // Glass highlights (top-left pane)
    r.fillRect(x + 4, y + 4, 3, 1, CONFIG.COL.WHITE);
    r.fillRect(x + 4, y + 5, 1, 2, CONFIG.COL.WHITE);

    // Bottom-right reflection
    const rx = x + Math.floor(w / 2) + 2;
    const ry = y + Math.floor(h / 2) + 2;
    r.fillRect(rx + 3, ry + 4, 2, 1, CONFIG.COL.WHITE);

    // Curtain hints (darker strips at left and right edges of glass)
    r.fillRect(x + 2, y + 2, 1, h - 4, CONFIG.COL.INDIGO);
    r.fillRect(x + w - 3, y + 2, 1, h - 4, CONFIG.COL.INDIGO);

    // Window sill (brown strip at bottom)
    r.fillRect(x - 1, y + h, w + 2, 2, CONFIG.COL.BROWN);
  }

  _drawWindowOverlay(r, x, y, w, h) {
    // Cross divider (on top of fire)
    r.fillRect(x + Math.floor(w / 2), y + 2, 1, h - 4, CONFIG.COL.LIGHT_GREY);
    r.fillRect(x + 2, y + Math.floor(h / 2), w - 4, 1, CONFIG.COL.LIGHT_GREY);
  }

  _drawPlant(r, x, y, flowerColor) {
    // Pot (trapezoidal with rim and shadow)
    r.fillRect(x + 1, y + 7, 10, 1, CONFIG.COL.BROWN);       // wide rim
    r.fillRect(x + 2, y + 8, 8, 5, CONFIG.COL.BROWN);        // pot body
    r.fillRect(x + 2, y + 8, 8, 1, CONFIG.COL.ORANGE);       // rim highlight
    r.fillRect(x + 3, y + 12, 6, 1, CONFIG.COL.DARK_GREY);   // pot shadow

    // Soil
    r.fillRect(x + 3, y + 8, 6, 1, CONFIG.COL.DARK_GREEN);

    // Stems
    r.fillRect(x + 5, y + 3, 1, 5, CONFIG.COL.DARK_GREEN);   // center stem
    r.fillRect(x + 3, y + 4, 1, 4, CONFIG.COL.DARK_GREEN);   // left stem
    r.fillRect(x + 7, y + 5, 1, 3, CONFIG.COL.DARK_GREEN);   // right stem

    // Leaves (varied greens)
    r.fillRect(x + 1, y + 4, 2, 1, CONFIG.COL.GREEN);
    r.fillRect(x + 2, y + 3, 1, 1, CONFIG.COL.GREEN);
    r.fillRect(x + 7, y + 4, 2, 1, CONFIG.COL.GREEN);
    r.fillRect(x + 8, y + 3, 1, 1, CONFIG.COL.DARK_GREEN);
    r.fillRect(x + 4, y + 5, 1, 1, CONFIG.COL.GREEN);
    r.fillRect(x + 6, y + 3, 1, 1, CONFIG.COL.GREEN);

    // Main flower (above center stem)
    r.fillRect(x + 4, y + 1, 3, 2, flowerColor);
    r.pixel(x + 5, y, flowerColor);                           // top petal
    r.pixel(x + 5, y + 1, CONFIG.COL.YELLOW);                 // center

    // Small left flower
    r.fillRect(x + 2, y + 2, 2, 2, flowerColor);
    r.pixel(x + 2, y + 2, CONFIG.COL.YELLOW);                 // center

    // Right bud
    r.pixel(x + 8, y + 2, flowerColor);
    r.pixel(x + 9, y + 3, flowerColor);
  }

  // Draw dark overlay for lights-out effect (call after all scene drawing, before HUD)
  drawDimOverlay() {
    if (!this.stateMachine || this.stateMachine.lightsDimProgress <= 0) return;

    const alpha = this.stateMachine.lightsDimProgress;
    this.renderer.fillRectAlpha(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT - 32, 'rgba(0, 0, 10, 1)', alpha);
  }
}
