// Renders pixel arrays to cached offscreen canvases
class SpriteRenderer {
  static cache = {};

  // Render a sprite data array to an offscreen canvas and cache it
  static render(name) {
    if (SpriteRenderer.cache[name]) return SpriteRenderer.cache[name];
    const data = SPRITES[name];
    if (!data) return null;

    const S = CONFIG.PIXEL_SCALE;
    const canvas = document.createElement('canvas');
    canvas.width = CONFIG.SPRITE_SIZE;
    canvas.height = CONFIG.SPRITE_SIZE;
    const ctx = canvas.getContext('2d');

    const isNative32 = data.length === 1024;
    const srcW = isNative32 ? 32 : 16;
    const scale = isNative32 ? 1 : S;

    for (let i = 0; i < data.length; i++) {
      const colorIdx = data[i];
      if (colorIdx < 0) continue;
      const x = (i % srcW) * scale;
      const y = Math.floor(i / srcW) * scale;
      ctx.fillStyle = CONFIG.PALETTE[colorIdx];
      ctx.fillRect(x, y, scale, scale);
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

    const S = CONFIG.PIXEL_SCALE;
    const canvas = document.createElement('canvas');
    canvas.width = CONFIG.SPRITE_SIZE;
    canvas.height = CONFIG.SPRITE_SIZE;
    const ctx = canvas.getContext('2d');

    // Colors to tint (shirt colors - light grey)
    const tintTargets = [CONFIG.COL.LIGHT_GREY, CONFIG.COL.WHITE];

    const isNative32 = data.length === 1024;
    const srcW = isNative32 ? 32 : 16;
    const scale = isNative32 ? 1 : S;

    for (let i = 0; i < data.length; i++) {
      const colorIdx = data[i];
      if (colorIdx < 0) continue;
      const x = (i % srcW) * scale;
      const y = Math.floor(i / srcW) * scale;

      if (tintTargets.includes(colorIdx)) {
        // Blend with tint color
        const origRGB = SpriteRenderer._hexToRGB(CONFIG.PALETTE[colorIdx]);
        const r = Math.floor((origRGB.r + tintRGB.r) / 2);
        const g = Math.floor((origRGB.g + tintRGB.g) / 2);
        const b = Math.floor((origRGB.b + tintRGB.b) / 2);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
      } else {
        ctx.fillStyle = CONFIG.PALETTE[colorIdx];
      }
      ctx.fillRect(x, y, scale, scale);
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
