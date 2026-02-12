// Fire effect behind office windows when Claude has active incidents
class FireStatus {
  constructor(renderer) {
    this.renderer = renderer;

    // State
    this.fireIntensity = 0;
    this.targetIntensity = 0;
    this.hasActiveIncident = false;
    this.activeIncidents = [];
    this.recentIncidents = [];

    // Two window inner panes: left and right
    this.windows = [
      { x: 32, y: 6, w: 16, h: 14 },  // left inner pane
      { x: 224, y: 6, w: 16, h: 14 }, // right inner pane
    ];

    // Fire buffers (classic pixel fire algorithm)
    this.fireBuffers = this.windows.map(win => {
      const buf = new Float32Array(win.w * win.h);
      return buf;
    });

    // Fire color mapping (heat value -> palette index)
    // heat > 0.7 = YELLOW, > 0.5 = ORANGE, > 0.3 = RED, > 0.15 = DARK_PURPLE
    this.heatColors = [
      { threshold: 0.7, color: CONFIG.COL.YELLOW },
      { threshold: 0.5, color: CONFIG.COL.ORANGE },
      { threshold: 0.3, color: CONFIG.COL.RED },
      { threshold: 0.15, color: CONFIG.COL.DARK_PURPLE },
    ];

    // Click regions (full window frame areas for hit-testing)
    this.clickRegions = [
      { x: 30, y: 4, w: 20, h: 18 },
      { x: 222, y: 4, w: 20, h: 18 },
    ];
  }

  updateStatus(data) {
    this.hasActiveIncident = data.hasActiveIncident;
    this.activeIncidents = data.activeIncidents || [];
    this.recentIncidents = data.recentIncidents || [];
    this.targetIntensity = data.hasActiveIncident ? 1 : 0;
  }

  update(dt) {
    // Lerp fire intensity
    if (this.fireIntensity < this.targetIntensity) {
      this.fireIntensity = Math.min(this.fireIntensity + 0.3 * dt, this.targetIntensity);
    } else if (this.fireIntensity > this.targetIntensity) {
      this.fireIntensity = Math.max(this.fireIntensity - 0.5 * dt, this.targetIntensity);
    }

    // Run fire simulation if intensity > 0
    if (this.fireIntensity > 0.01) {
      this._simulateFire();
    }
  }

  _simulateFire() {
    for (let i = 0; i < this.windows.length; i++) {
      const win = this.windows[i];
      const buf = this.fireBuffers[i];
      const w = win.w;
      const h = win.h;

      // Seed bottom row with random heat * intensity
      for (let x = 0; x < w; x++) {
        buf[(h - 1) * w + x] = (Math.random() * 0.5 + 0.5) * this.fireIntensity;
      }
      // Second-to-bottom row also gets some heat
      for (let x = 0; x < w; x++) {
        buf[(h - 2) * w + x] = (Math.random() * 0.4 + 0.3) * this.fireIntensity;
      }

      // Propagate upward with decay
      for (let y = 0; y < h - 2; y++) {
        for (let x = 0; x < w; x++) {
          // Average of neighbors below + random decay
          const below = buf[(y + 1) * w + x];
          const belowLeft = x > 0 ? buf[(y + 1) * w + x - 1] : below;
          const belowRight = x < w - 1 ? buf[(y + 1) * w + x + 1] : below;
          const belowBelow = y + 2 < h ? buf[(y + 2) * w + x] : below;

          const avg = (below + belowLeft + belowRight + belowBelow) / 4;
          const decay = 0.03 + Math.random() * 0.05;
          buf[y * w + x] = Math.max(0, avg - decay);
        }
      }
    }
  }

  // Draw fire pixels into window panes (call BEFORE _drawWindow)
  drawFire() {
    if (this.fireIntensity <= 0.01) return;

    const r = this.renderer;
    for (let i = 0; i < this.windows.length; i++) {
      const win = this.windows[i];
      const buf = this.fireBuffers[i];

      for (let y = 0; y < win.h; y++) {
        for (let x = 0; x < win.w; x++) {
          const heat = buf[y * win.w + x];
          if (heat > 0.15) {
            let color = CONFIG.COL.DARK_PURPLE;
            for (const hc of this.heatColors) {
              if (heat > hc.threshold) {
                color = hc.color;
                break;
              }
            }
            r.pixel(win.x + x, win.y + y, color);
          }
        }
      }
    }
  }

  // Draw semi-transparent orange tint on window panes (call AFTER _drawWindow)
  drawWindowTint() {
    if (this.fireIntensity <= 0.01) return;

    for (const win of this.windows) {
      this.renderer.fillRectAlpha(win.x, win.y, win.w, win.h, '#ffa300', this.fireIntensity * 0.25);
    }
  }

  // Hit-test both window frame regions. Returns true if clicked during incident.
  handleClick(bufX, bufY) {
    if (!this.hasActiveIncident && this.recentIncidents.length === 0) return false;
    if (this.fireIntensity <= 0.01 && !this.hasActiveIncident) return false;

    for (const region of this.clickRegions) {
      if (bufX >= region.x && bufX <= region.x + region.w &&
          bufY >= region.y && bufY <= region.y + region.h) {
        return true;
      }
    }
    return false;
  }
}
