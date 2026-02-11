// Fixed-timestep game loop at 60fps
class GameLoop {
  constructor(updateFn, drawFn) {
    this.update = updateFn;
    this.draw = drawFn;
    this.running = false;
    this.targetFPS = CONFIG.FPS;
    this.timestep = 1 / this.targetFPS;
    this.accumulator = 0;
    this.lastTime = 0;
    this.rafId = null;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now() / 1000;
    this.accumulator = 0;
    this._loop();
  }

  stop() {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  _loop() {
    if (!this.running) return;

    const now = performance.now() / 1000;
    let dt = now - this.lastTime;
    this.lastTime = now;

    // Clamp large gaps (e.g., tab was hidden)
    if (dt > 0.25) dt = 0.25;

    this.accumulator += dt;

    while (this.accumulator >= this.timestep) {
      this.update(this.timestep);
      this.accumulator -= this.timestep;
    }

    this.draw();

    this.rafId = requestAnimationFrame(() => this._loop());
  }
}
