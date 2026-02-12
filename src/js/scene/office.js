// Office background rendering - floor, walls, furniture
class Office {
  constructor(renderer, stateMachine, fireStatus) {
    this.renderer = renderer;
    this.stateMachine = stateMachine;
    this.fireStatus = fireStatus;

    // Day/night override (null = auto/natural time)
    this._dayOverride = null;
    this._dayOverrideLerp = null;
  }

  setDayOverride(target) {
    this._dayOverride = target;
    if (target !== null && this._dayOverrideLerp === null) {
      this._dayOverrideLerp = this._getNaturalDayProgress();
    }
  }

  clearDayOverride() {
    this._dayOverride = null;
    this._dayOverrideLerp = null;
  }

  draw() {
    const r = this.renderer;
    const T = CONFIG.TILE;

    // Cache time values for this frame
    this._time = Date.now() / 1000;
    this._updateDayProgress();

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

    // Wall clock above the door
    this._drawClock(r, 17 * T + 12, 7);

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
    const dp = this._dayProgress;
    const px = x + 2, py = y + 2, pw = w - 4, ph = h - 4;

    // Outer frame (2px grey border)
    r.fillRect(x, y, w, h, CONFIG.COL.LIGHT_GREY);

    // Rounded corners (replace with wall color)
    r.pixel(x, y, CONFIG.COL.DARK_BLUE);
    r.pixel(x + w - 1, y, CONFIG.COL.DARK_BLUE);
    r.pixel(x, y + h - 1, CONFIG.COL.DARK_BLUE);
    r.pixel(x + w - 1, y + h - 1, CONFIG.COL.DARK_BLUE);

    // --- Dynamic sky ---

    // Base: black sky
    r.fillRect(px, py, pw, ph, CONFIG.COL.BLACK);

    // Night layer (dark blue)
    if (dp < 0.6) {
      r.fillRectAlpha(px, py, pw, ph, '#1d2b53', Math.min(1, (0.6 - dp) * 2.5));
    }

    // Day layer (blue sky, fades in)
    if (dp > 0.3) {
      r.fillRectAlpha(px, py, pw, ph, '#29adff', Math.min(1, (dp - 0.3) * 1.8));
    }

    // Sunrise/sunset glow (full window gradient, peaks during transition)
    const glowIntensity = dp * (1 - dp) * 4;
    if (glowIntensity > 0.05) {
      // Warm tint across entire sky
      r.fillRectAlpha(px, py, pw, ph, '#ffa300', glowIntensity * 0.25);
      // Stronger orange in lower 70%
      const midH = Math.ceil(ph * 0.7);
      r.fillRectAlpha(px, py + ph - midH, pw, midH, '#ffa300', glowIntensity * 0.35);
      // Pink/red band in lower 40%
      const lowH = Math.ceil(ph * 0.4);
      r.fillRectAlpha(px, py + ph - lowH, pw, lowH, '#ff77a8', glowIntensity * 0.4);
      // Deep orange horizon at very bottom
      const horizonH = Math.ceil(ph * 0.15);
      r.fillRectAlpha(px, py + ph - horizonH, pw, horizonH, '#ff004d', glowIntensity * 0.25);
    }

    // Stars (visible during night)
    if (dp < 0.4) {
      this._drawStars(r, px, py, pw, ph, 1 - dp / 0.4);
    }

    // Clouds (visible during day)
    if (dp > 0.6) {
      this._drawClouds(r, px, py, pw, ph);
    }

    // Cross divider
    r.fillRect(x + Math.floor(w / 2), py, 1, ph, CONFIG.COL.LIGHT_GREY);
    r.fillRect(px, y + Math.floor(h / 2), pw, 1, CONFIG.COL.LIGHT_GREY);

    // Glass highlights (only visible during daytime)
    if (dp > 0.5) {
      const ha = Math.min(1, (dp - 0.5) * 2);
      r.fillRectAlpha(x + 4, y + 4, 3, 1, '#fff1e8', ha * 0.7);
      r.fillRectAlpha(x + 4, y + 5, 1, 2, '#fff1e8', ha * 0.5);
    }

    // Curtain hints (darker strips at edges)
    r.fillRect(px, py, 1, ph, CONFIG.COL.INDIGO);
    r.fillRect(x + w - 3, py, 1, ph, CONFIG.COL.INDIGO);

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

  _updateDayProgress() {
    if (this._dayOverride !== null) {
      if (this._dayOverrideLerp === null) {
        this._dayOverrideLerp = this._getNaturalDayProgress();
      }
      const target = this._dayOverride;
      const speed = 0.08; // ~12 seconds for full 0→1 transition
      const diff = target - this._dayOverrideLerp;
      if (Math.abs(diff) < 0.005) {
        this._dayOverrideLerp = target;
      } else {
        this._dayOverrideLerp += Math.sign(diff) * speed / 60;
      }
      this._dayProgress = Math.max(0, Math.min(1, this._dayOverrideLerp));
    } else {
      this._dayOverrideLerp = null;
      this._dayProgress = this._getNaturalDayProgress();
    }
  }

  // Day progress: 0 = full night, 1 = full day
  // Dawn ~5:30-7:00, Dusk ~19:00-20:30
  _getNaturalDayProgress() {
    const now = new Date();
    const h = now.getHours() + now.getMinutes() / 60;

    if (h >= 5.5 && h < 7) return (h - 5.5) / 1.5;   // dawn
    if (h >= 7 && h < 19) return 1;                     // day
    if (h >= 19 && h < 20.5) return 1 - (h - 19) / 1.5; // dusk
    return 0;                                            // night
  }

  _drawStars(r, px, py, pw, ph, alpha) {
    if (alpha < 0.05) return;
    const t = this._time;

    for (let i = 0; i < 8; i++) {
      // Deterministic positions (different per window via px seed)
      const sx = px + ((px * 7 + i * 31 + 5) % (pw - 2)) + 1;
      const sy = py + ((px * 13 + i * 17 + 3) % (ph - 2)) + 1;

      // Twinkle
      const twinkle = Math.sin(t * (1.5 + i * 0.4) + i * 2.7 + px * 0.1);
      if (twinkle > -0.3) {
        r.pixel(sx, sy, twinkle > 0.4 ? CONFIG.COL.WHITE : CONFIG.COL.LIGHT_GREY);
      }
    }
  }

  _drawClouds(r, px, py, pw, ph) {
    const t = this._time;

    for (let i = 0; i < 2; i++) {
      const speed = 1.5 + i * 1.0;
      const yOff = 2 + i * 6;

      // Cloud X wraps within pane
      const rawX = ((t * speed + i * 30 + px * 0.5) % (pw + 4)) - 2;
      const cx = Math.floor(rawX);
      const cy = py + yOff;

      // Small 3-pixel cloud wisp
      for (let dx = 0; dx < 3; dx++) {
        const wx = px + ((cx + dx + pw) % pw);
        if (wx >= px && wx < px + pw) {
          r.pixel(wx, cy, dx === 2 ? CONFIG.COL.LIGHT_GREY : CONFIG.COL.WHITE);
        }
      }
    }
  }

  _drawClock(r, cx, cy) {
    const now = new Date();
    const hours = now.getHours() % 12;
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    // Brown circular frame (radius 5)
    for (let dy = -5; dy <= 5; dy++) {
      for (let dx = -5; dx <= 5; dx++) {
        if (dx * dx + dy * dy <= 25) {
          r.pixel(cx + dx, cy + dy, CONFIG.COL.BROWN);
        }
      }
    }

    // White face (radius 4)
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        if (dx * dx + dy * dy <= 16) {
          r.pixel(cx + dx, cy + dy, CONFIG.COL.WHITE);
        }
      }
    }

    // Hour markers
    r.pixel(cx, cy - 3, CONFIG.COL.DARK_GREY);  // 12
    r.pixel(cx + 3, cy, CONFIG.COL.DARK_GREY);  // 3
    r.pixel(cx, cy + 3, CONFIG.COL.DARK_GREY);  // 6
    r.pixel(cx - 3, cy, CONFIG.COL.DARK_GREY);  // 9

    // Hour hand (short, brown)
    const hAngle = (hours + minutes / 60) / 12 * 2 * Math.PI;
    const hx = Math.round(2 * Math.sin(hAngle));
    const hy = Math.round(-2 * Math.cos(hAngle));
    this._drawClockHand(r, cx, cy, cx + hx, cy + hy, CONFIG.COL.BROWN);

    // Minute hand (longer, dark grey)
    const mAngle = minutes / 60 * 2 * Math.PI;
    const mx = Math.round(3 * Math.sin(mAngle));
    const my = Math.round(-3 * Math.cos(mAngle));
    this._drawClockHand(r, cx, cy, cx + mx, cy + my, CONFIG.COL.DARK_GREY);

    // Second hand (longest, red, thin)
    const sAngle = seconds / 60 * 2 * Math.PI;
    const sx = Math.round(3.5 * Math.sin(sAngle));
    const sy = Math.round(-3.5 * Math.cos(sAngle));
    this._drawClockHand(r, cx, cy, cx + sx, cy + sy, CONFIG.COL.RED);

    // Center pin
    r.pixel(cx, cy, CONFIG.COL.BLACK);

    // Small mounting bracket below clock
    r.fillRect(cx - 1, cy + 5, 3, 2, CONFIG.COL.DARK_GREY);
  }

  _drawClockHand(r, x0, y0, x1, y1, color) {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const steps = Math.max(dx, dy);
    if (steps === 0) { r.pixel(x0, y0, color); return; }
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      r.pixel(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), color);
    }
  }

  // Draw dark overlay for lights-out effect (call after all scene drawing, before HUD)
  drawDimOverlay() {
    if (!this.stateMachine || this.stateMachine.lightsDimProgress <= 0) return;

    const alpha = this.stateMachine.lightsDimProgress;
    this.renderer.fillRectAlpha(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT - 32, 'rgba(0, 0, 10, 1)', alpha);
  }

  // Draw snow accumulation on ground and furniture
  drawSnow() {
    if (!this.stateMachine || this.stateMachine.snowProgress <= 0) return;

    const r = this.renderer;
    const T = CONFIG.TILE;
    const sp = this.stateMachine.snowProgress;

    // Snow on baseboard/wall bottom
    const baseSnowH = Math.floor(sp * 6);
    if (baseSnowH > 0) {
      r.fillRect(0, 3 * T - baseSnowH, CONFIG.WIDTH, baseSnowH, CONFIG.COL.WHITE);
    }

    // Snow on floor edges (bottom of scene above HUD)
    const floorSnowH = Math.floor(sp * 4);
    if (floorSnowH > 0) {
      r.fillRect(0, CONFIG.HEIGHT - 32 - floorSnowH, CONFIG.WIDTH, floorSnowH, CONFIG.COL.LIGHT_GREY);
    }

    // Snow on desk tops
    const deskSnowH = Math.ceil(sp * 3);
    if (deskSnowH > 0) {
      for (const d of CONFIG.DESKS) {
        r.fillRect(d.x * T - 2, d.y * T - deskSnowH, T * 2 + 4, deskSnowH, CONFIG.COL.WHITE);
      }
      // Leader desk
      const ld = CONFIG.LEADER_DESK_POS;
      r.fillRect(ld.x * T + 6, ld.y * T - deskSnowH, T * 2 + 4, deskSnowH, CONFIG.COL.WHITE);
    }

    // Blueish cold tint over entire scene
    if (sp > 0.3) {
      r.fillRectAlpha(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT - 32, '#8899cc', (sp - 0.3) * 0.25);
    }
  }
}
