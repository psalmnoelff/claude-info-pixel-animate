// Office background rendering - floor, walls, furniture
class Office {
  constructor(renderer, stateMachine) {
    this.renderer = renderer;
    this.stateMachine = stateMachine;
  }

  draw() {
    const r = this.renderer;
    const T = CONFIG.TILE;

    // Draw floor (checkerboard pattern)
    for (let row = 0; row < CONFIG.ROWS; row++) {
      for (let col = 0; col < CONFIG.COLS; col++) {
        const isAlt = (row + col) % 2 === 0;
        if (row < 2) {
          // Wall area
          r.fillRect(col * T, row * T, T, T, CONFIG.COL.DARK_BLUE);
        } else {
          // Floor
          r.fillRect(col * T, row * T, T, T, isAlt ? CONFIG.COL.BLUE : CONFIG.COL.DARK_BLUE);
        }
      }
    }

    // Wall baseboard
    r.fillRect(0, 2 * T - 2, CONFIG.WIDTH, 2, CONFIG.COL.BROWN);

    // Wall decoration - subtle horizontal line
    r.fillRect(0, T - 1, CONFIG.WIDTH, 1, CONFIG.COL.INDIGO);

    // Windows on the wall (centered in their wall sections)
    this._drawWindow(r, 30, 4, 20, 18);   // Left section: centered in x=0..80
    this._drawWindow(r, 222, 4, 20, 18);  // Right section: centered in x=192..272

    // Potted plants on the baseboard (wall level, not walkable)
    this._drawPlant(r, 4 * T + 4, 2 * T - 10, CONFIG.COL.RED);     // Left of whiteboard
    this._drawPlant(r, 12 * T + 4, 2 * T - 10, CONFIG.COL.YELLOW);  // Right of whiteboard
    this._drawPlant(r, 16 * T + 4, 2 * T - 10, CONFIG.COL.PINK);    // Left of door

    // Corner plants (bottom corners, just above HUD)
    const floorBottom = CONFIG.HEIGHT - 32 - 12;
    this._drawPlant(r, 2, floorBottom, CONFIG.COL.GREEN);            // Lower-left
    this._drawPlant(r, CONFIG.WIDTH - 10, floorBottom, CONFIG.COL.BLUE);   // Lower-right
  }

  _drawWindow(r, x, y, w, h) {
    // Outer frame (light grey)
    r.fillRect(x, y, w, h, CONFIG.COL.LIGHT_GREY);
    // Inner pane (light blue "sky")
    r.fillRect(x + 2, y + 2, w - 4, h - 4, CONFIG.COL.BLUE);
    // Cross divider
    r.fillRect(x + Math.floor(w / 2) - 0, y + 2, 1, h - 4, CONFIG.COL.LIGHT_GREY);
    r.fillRect(x + 2, y + Math.floor(h / 2) - 0, w - 4, 1, CONFIG.COL.LIGHT_GREY);
    // Highlight on glass (top-left pane)
    r.fillRect(x + 4, y + 4, 2, 1, CONFIG.COL.WHITE);
  }

  _drawPlant(r, x, y, flowerColor) {
    // Pot (brown trapezoid)
    r.fillRect(x + 1, y + 6, 6, 4, CONFIG.COL.BROWN);
    r.fillRect(x, y + 5, 8, 1, CONFIG.COL.BROWN);        // Rim
    // Soil
    r.fillRect(x + 2, y + 6, 4, 1, CONFIG.COL.DARK_GREEN);
    // Stem
    r.fillRect(x + 3, y + 2, 1, 4, CONFIG.COL.DARK_GREEN);
    // Leaves
    r.fillRect(x + 2, y + 3, 1, 1, CONFIG.COL.GREEN);
    r.fillRect(x + 4, y + 2, 1, 1, CONFIG.COL.GREEN);
    r.fillRect(x + 1, y + 1, 1, 1, CONFIG.COL.GREEN);
    r.fillRect(x + 5, y + 1, 1, 1, CONFIG.COL.GREEN);
    // Flower
    r.fillRect(x + 2, y, 3, 2, flowerColor);
  }

  // Draw dark overlay for lights-out effect (call after all scene drawing, before HUD)
  drawDimOverlay() {
    if (!this.stateMachine || this.stateMachine.lightsDimProgress <= 0) return;

    const ctx = this.renderer.getBufferContext();
    const alpha = this.stateMachine.lightsDimProgress;
    ctx.fillStyle = `rgba(0, 0, 10, ${alpha})`;
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT - 32); // Don't dim the HUD
  }
}
