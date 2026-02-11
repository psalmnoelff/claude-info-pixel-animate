// Double-buffered canvas renderer with integer scaling and letterboxing
class CanvasRenderer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');

    // Internal buffer at native resolution
    this.buffer = document.createElement('canvas');
    this.buffer.width = CONFIG.WIDTH;
    this.buffer.height = CONFIG.HEIGHT;
    this.bufCtx = this.buffer.getContext('2d');
    this.bufCtx.imageSmoothingEnabled = false;

    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;

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
    this.bufCtx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
  }

  // Draw a filled rectangle on the buffer
  fillRect(x, y, w, h, colorIndex) {
    this.bufCtx.fillStyle = CONFIG.PALETTE[colorIndex];
    this.bufCtx.fillRect(Math.floor(x), Math.floor(y), w, h);
  }

  // Draw a pixel on the buffer
  pixel(x, y, colorIndex) {
    this.bufCtx.fillStyle = CONFIG.PALETTE[colorIndex];
    this.bufCtx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
  }

  // Draw an image/canvas onto the buffer
  drawImage(img, x, y) {
    this.bufCtx.drawImage(img, Math.floor(x), Math.floor(y));
  }

  // Draw a portion of an image onto the buffer
  drawImageRegion(img, sx, sy, sw, sh, dx, dy) {
    this.bufCtx.drawImage(img, sx, sy, sw, sh, Math.floor(dx), Math.floor(dy), sw, sh);
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

    // Draw buffer scaled up
    this.ctx.drawImage(
      this.buffer,
      0, 0, CONFIG.WIDTH, CONFIG.HEIGHT,
      this.offsetX, this.offsetY,
      CONFIG.WIDTH * this.scale, CONFIG.HEIGHT * this.scale
    );
  }
}
