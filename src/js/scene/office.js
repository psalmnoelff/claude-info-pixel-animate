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
          r.fillRect(col * T, row * T, T, T, isAlt ? CONFIG.COL.LIGHT_GREY : CONFIG.COL.DARK_GREY);
        }
      }
    }

    // Wall baseboard
    r.fillRect(0, 2 * T - 2, CONFIG.WIDTH, 2, CONFIG.COL.BROWN);

    // Wall decoration - subtle horizontal line
    r.fillRect(0, T - 1, CONFIG.WIDTH, 1, CONFIG.COL.INDIGO);
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
