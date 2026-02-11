// Renders pixel arrays to cached offscreen canvases
class SpriteRenderer {
  static cache = {};

  // Render a sprite data array to an offscreen canvas and cache it
  static render(name) {
    if (SpriteRenderer.cache[name]) return SpriteRenderer.cache[name];
    const data = SPRITES[name];
    if (!data) return null;

    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');

    for (let i = 0; i < 256; i++) {
      const colorIdx = data[i];
      if (colorIdx < 0) continue;
      const x = i % 16;
      const y = Math.floor(i / 16);
      ctx.fillStyle = CONFIG.PALETTE[colorIdx];
      ctx.fillRect(x, y, 1, 1);
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

    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');

    // Colors to tint (shirt colors - light grey)
    const tintTargets = [CONFIG.COL.LIGHT_GREY, CONFIG.COL.WHITE];

    for (let i = 0; i < 256; i++) {
      const colorIdx = data[i];
      if (colorIdx < 0) continue;
      const x = i % 16;
      const y = Math.floor(i / 16);

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
      ctx.fillRect(x, y, 1, 1);
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
