// Double-buffered canvas renderer with integer scaling and letterboxing
class CanvasRenderer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');

    // Internal buffer at scaled resolution
    this.buffer = document.createElement('canvas');
    this.buffer.width = CONFIG.BUFFER_WIDTH;
    this.buffer.height = CONFIG.BUFFER_HEIGHT;
    this.bufCtx = this.buffer.getContext('2d');
    this.bufCtx.imageSmoothingEnabled = false;

    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.shakeAmount = 0;

    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    const dpr = window.devicePixelRatio || 1;
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    // Integer scale that fits the window
    const scaleX = Math.floor(winW / CONFIG.WIDTH) || 1;
    const scaleY = Math.floor(winH / CONFIG.HEIGHT) || 1;
    this.scale = Math.min(scaleX, scaleY);

    const scaledW = CONFIG.WIDTH * this.scale;
    const scaledH = CONFIG.HEIGHT * this.scale;

    this.canvas.width = winW * dpr;
    this.canvas.height = winH * dpr;
    this.canvas.style.width = winW + 'px';
    this.canvas.style.height = winH + 'px';

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;

    // Center with letterboxing
    this.offsetX = Math.floor((winW - scaledW) / 2);
    this.offsetY = Math.floor((winH - scaledH) / 2);
  }

  // Clear the internal buffer
  clear(colorIndex) {
    const color = colorIndex !== undefined ? CONFIG.PALETTE[colorIndex] : '#000000';
    this.bufCtx.fillStyle = color;
    this.bufCtx.fillRect(0, 0, CONFIG.BUFFER_WIDTH, CONFIG.BUFFER_HEIGHT);
  }

  // Draw a filled rectangle on the buffer
  fillRect(x, y, w, h, colorIndex) {
    const S = CONFIG.PIXEL_SCALE;
    this.bufCtx.fillStyle = CONFIG.PALETTE[colorIndex];
    this.bufCtx.fillRect(Math.floor(x) * S, Math.floor(y) * S, w * S, h * S);
  }

  // Draw a pixel on the buffer
  pixel(x, y, colorIndex) {
    const S = CONFIG.PIXEL_SCALE;
    this.bufCtx.fillStyle = CONFIG.PALETTE[colorIndex];
    this.bufCtx.fillRect(Math.floor(x) * S, Math.floor(y) * S, S, S);
  }

  // Draw an image/canvas onto the buffer
  drawImage(img, x, y) {
    const S = CONFIG.PIXEL_SCALE;
    this.bufCtx.drawImage(img, Math.floor(x) * S, Math.floor(y) * S);
  }

  // Draw a portion of an image onto the buffer
  drawImageRegion(img, sx, sy, sw, sh, dx, dy) {
    const S = CONFIG.PIXEL_SCALE;
    this.bufCtx.drawImage(img, sx * S, sy * S, sw * S, sh * S, Math.floor(dx) * S, Math.floor(dy) * S, sw * S, sh * S);
  }

  // Draw sprite flipped horizontally at logical position
  drawImageFlipped(img, x, y) {
    const S = CONFIG.PIXEL_SCALE;
    const size = CONFIG.SPRITE_SIZE;
    this.bufCtx.save();
    this.bufCtx.translate(Math.floor(x) * S + size, Math.floor(y) * S);
    this.bufCtx.scale(-1, 1);
    this.bufCtx.drawImage(img, 0, 0);
    this.bufCtx.restore();
  }

  // Draw sprite with rotation and alpha at logical center point
  drawImageTransformed(img, cx, cy, rotation, alpha, halfW, halfH) {
    const S = CONFIG.PIXEL_SCALE;
    this.bufCtx.save();
    if (alpha !== undefined && alpha < 1) this.bufCtx.globalAlpha = alpha;
    this.bufCtx.translate(Math.floor(cx) * S, Math.floor(cy) * S);
    if (rotation) this.bufCtx.rotate(rotation);
    this.bufCtx.drawImage(img, -halfW * S, -halfH * S);
    this.bufCtx.restore();
  }

  // Fill rect with CSS color and alpha at logical coords
  fillRectAlpha(x, y, w, h, cssColor, alpha) {
    const S = CONFIG.PIXEL_SCALE;
    this.bufCtx.save();
    this.bufCtx.globalAlpha = alpha;
    this.bufCtx.fillStyle = cssColor;
    this.bufCtx.fillRect(Math.floor(x) * S, Math.floor(y) * S, w * S, h * S);
    this.bufCtx.restore();
  }

  // Set global alpha (call resetAlpha when done)
  setAlpha(alpha) {
    this.bufCtx.save();
    this.bufCtx.globalAlpha = alpha;
  }

  // Reset alpha (restores saved state from setAlpha)
  resetAlpha() {
    this.bufCtx.restore();
  }

  // Draw a pixel with a CSS color string (no palette lookup)
  pixelCSS(x, y, cssColor) {
    const S = CONFIG.PIXEL_SCALE;
    this.bufCtx.fillStyle = cssColor;
    this.bufCtx.fillRect(Math.floor(x) * S, Math.floor(y) * S, S, S);
  }

  // Get the buffer context for direct drawing
  getBufferContext() {
    return this.bufCtx;
  }

  // Present: blit buffer to display canvas with scaling
  present() {
    // Clear display with black
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply screen shake offset
    let sx = 0, sy = 0;
    if (this.shakeAmount > 0) {
      sx = Math.floor((Math.random() - 0.5) * this.shakeAmount * 2) * this.scale;
      sy = Math.floor((Math.random() - 0.5) * this.shakeAmount * 2) * this.scale;
    }

    // Draw buffer scaled up
    this.ctx.drawImage(
      this.buffer,
      0, 0, CONFIG.BUFFER_WIDTH, CONFIG.BUFFER_HEIGHT,
      this.offsetX + sx, this.offsetY + sy,
      CONFIG.WIDTH * this.scale, CONFIG.HEIGHT * this.scale
    );
  }
}
