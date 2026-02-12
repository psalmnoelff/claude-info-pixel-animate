// Renders pixel arrays to cached offscreen canvases
class SpriteRenderer {
  static cache = {};

  // Scale2x (EPX) upscale: produces smoother edges than simple 2x doubling
  // For each source pixel P with neighbors A(up), B(right), C(left), D(down):
  //   Output 2x2 block:  [1][2]
  //                      [3][4]
  //   1 = (C==A && C!=D && A!=B) ? A : P
  //   2 = (A==B && A!=C && B!=D) ? B : P
  //   3 = (D==C && D!=B && C!=A) ? C : P
  //   4 = (B==D && B!=A && D!=C) ? D : P
  static _scale2x(data, srcW, srcH) {
    const out = new Int8Array(srcW * 2 * srcH * 2);
    const dstW = srcW * 2;

    for (let y = 0; y < srcH; y++) {
      for (let x = 0; x < srcW; x++) {
        const P = data[y * srcW + x];
        const A = y > 0 ? data[(y - 1) * srcW + x] : P;
        const B = x < srcW - 1 ? data[y * srcW + x + 1] : P;
        const C = x > 0 ? data[y * srcW + x - 1] : P;
        const D = y < srcH - 1 ? data[(y + 1) * srcW + x] : P;

        const dx = x * 2;
        const dy = y * 2;

        out[dy * dstW + dx]         = (C === A && C !== D && A !== B) ? A : P;
        out[dy * dstW + dx + 1]     = (A === B && A !== C && B !== D) ? B : P;
        out[(dy + 1) * dstW + dx]   = (D === C && D !== B && C !== A) ? C : P;
        out[(dy + 1) * dstW + dx + 1] = (B === D && B !== A && D !== C) ? D : P;
      }
    }
    return out;
  }

  // Sub-pixel outline: adds a dark border around character silhouettes in the
  // scaled 32x32 output. Transparent pixels adjacent to any colored pixel become
  // dark outline (color 0 = black). Creates a visible anti-aliased edge.
  static _addSubPixelOutline(data, w, h) {
    const out = new Int8Array(data.length);
    out.set(data);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (data[i] >= 0) continue; // Skip non-transparent pixels

        // Check 4-connected neighbors for any colored pixel
        const up    = y > 0     ? data[(y - 1) * w + x] : -1;
        const down  = y < h - 1 ? data[(y + 1) * w + x] : -1;
        const left  = x > 0     ? data[y * w + x - 1]   : -1;
        const right = x < w - 1 ? data[y * w + x + 1]   : -1;

        if (up >= 0 || down >= 0 || left >= 0 || right >= 0) {
          out[i] = 0; // Black outline
        }
      }
    }
    return out;
  }

  // Render a sprite data array to an offscreen canvas and cache it
  static render(name) {
    if (SpriteRenderer.cache[name]) return SpriteRenderer.cache[name];
    const data = SPRITES[name];
    if (!data) return null;

    const canvas = document.createElement('canvas');
    canvas.width = CONFIG.SPRITE_SIZE;
    canvas.height = CONFIG.SPRITE_SIZE;
    const ctx = canvas.getContext('2d');

    const isNative32 = data.length === 1024;

    if (isNative32) {
      // Native 32x32: draw 1:1
      for (let i = 0; i < 1024; i++) {
        const colorIdx = data[i];
        if (colorIdx < 0) continue;
        ctx.fillStyle = CONFIG.PALETTE[colorIdx];
        ctx.fillRect(i % 32, Math.floor(i / 32), 1, 1);
      }
    } else {
      // 16x16 source: apply Scale2x + sub-pixel outline for smooth upscale
      const scaled = SpriteRenderer._scale2x(data, 16, 16);
      const outlined = SpriteRenderer._addSubPixelOutline(scaled, 32, 32);
      for (let i = 0; i < 1024; i++) {
        const colorIdx = outlined[i];
        if (colorIdx < 0) continue;
        ctx.fillStyle = CONFIG.PALETTE[colorIdx];
        ctx.fillRect(i % 32, Math.floor(i / 32), 1, 1);
      }
    }

    SpriteRenderer.cache[name] = canvas;
    return canvas;
  }

  // Get cached sprite or render on first access
  static get(name) {
    return SpriteRenderer.cache[name] || SpriteRenderer.render(name);
  }

  // Render a tinted version of a sprite (for worker color variants)
  static getTinted(name, tintColor) {
    const key = name + '_tint_' + tintColor;
    if (SpriteRenderer.cache[key]) return SpriteRenderer.cache[key];

    const data = SPRITES[name];
    if (!data) return null;

    const tintRGB = SpriteRenderer._hexToRGB(CONFIG.PALETTE[tintColor]);
    const tintTargets = [CONFIG.COL.LIGHT_GREY, CONFIG.COL.WHITE];

    const canvas = document.createElement('canvas');
    canvas.width = CONFIG.SPRITE_SIZE;
    canvas.height = CONFIG.SPRITE_SIZE;
    const ctx = canvas.getContext('2d');

    const isNative32 = data.length === 1024;

    // Resolve colors to CSS strings (with tinting applied)
    const resolveColor = (colorIdx) => {
      if (tintTargets.includes(colorIdx)) {
        const origRGB = SpriteRenderer._hexToRGB(CONFIG.PALETTE[colorIdx]);
        const r = Math.floor((origRGB.r + tintRGB.r) / 2);
        const g = Math.floor((origRGB.g + tintRGB.g) / 2);
        const b = Math.floor((origRGB.b + tintRGB.b) / 2);
        return `rgb(${r},${g},${b})`;
      }
      return CONFIG.PALETTE[colorIdx];
    };

    if (isNative32) {
      for (let i = 0; i < 1024; i++) {
        const colorIdx = data[i];
        if (colorIdx < 0) continue;
        ctx.fillStyle = resolveColor(colorIdx);
        ctx.fillRect(i % 32, Math.floor(i / 32), 1, 1);
      }
    } else {
      // Apply Scale2x + outline then tint
      const scaled = SpriteRenderer._scale2x(data, 16, 16);
      const outlined = SpriteRenderer._addSubPixelOutline(scaled, 32, 32);
      for (let i = 0; i < 1024; i++) {
        const colorIdx = outlined[i];
        if (colorIdx < 0) continue;
        ctx.fillStyle = resolveColor(colorIdx);
        ctx.fillRect(i % 32, Math.floor(i / 32), 1, 1);
      }
    }

    SpriteRenderer.cache[key] = canvas;
    return canvas;
  }

  static _hexToRGB(hex) {
    const n = parseInt(hex.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  // Clear cache (e.g., on sprite data reload)
  static clearCache() {
    SpriteRenderer.cache = {};
  }
}
