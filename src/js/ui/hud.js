// RPG-style HUD with HP/Mana/Life bars
class HUD {
  constructor(renderer, appState) {
    this.renderer = renderer;
    this.appState = appState;
  }

  draw() {
    const r = this.renderer;
    const s = this.appState;

    // HUD background bar at bottom
    r.fillRect(0, CONFIG.HEIGHT - 24, CONFIG.WIDTH, 24, CONFIG.COL.BLACK);
    r.fillRect(0, CONFIG.HEIGHT - 24, CONFIG.WIDTH, 1, CONFIG.COL.DARK_GREY);

    // Status text (top-left of HUD)
    PixelFont.draw(r, s.statusText, 4, CONFIG.HEIGHT - 21, CONFIG.COL.WHITE);

    // Agent count
    const agentText = 'AGENTS:' + s.agentCount;
    PixelFont.draw(r, agentText, 4, CONFIG.HEIGHT - 13, CONFIG.COL.LIGHT_GREY);

    // HP bar (green) - tokens used
    this._drawBar(r, 90, CONFIG.HEIGHT - 21, 60, 5, s.getHPPercent(), CONFIG.COL.GREEN, CONFIG.COL.DARK_GREEN, 'HP');

    // Mana bar (blue) - sonnet usage
    this._drawBar(r, 90, CONFIG.HEIGHT - 13, 60, 5, s.getManaPercent(), CONFIG.COL.BLUE, CONFIG.COL.DARK_BLUE, 'MP');

    // Life bar (red) - session rate
    this._drawBar(r, 170, CONFIG.HEIGHT - 21, 60, 5, s.getLifePercent(), CONFIG.COL.RED, CONFIG.COL.DARK_PURPLE, 'LP');

    // Token count (bottom right)
    const tokenText = Math.floor(s.tokensUsed / 1000) + 'K';
    const tw = PixelFont.measure(tokenText);
    PixelFont.draw(r, tokenText, CONFIG.WIDTH - tw - 4, CONFIG.HEIGHT - 13, CONFIG.COL.LIGHT_GREY);

    // Model indicator
    const modelText = s.currentModel.toUpperCase();
    PixelFont.draw(r, modelText, 170, CONFIG.HEIGHT - 13, CONFIG.COL.YELLOW);
  }

  _drawBar(r, x, y, w, h, percent, fgColor, bgColor, label) {
    // Label
    PixelFont.draw(r, label, x - 15, y, CONFIG.COL.LIGHT_GREY);

    // Background
    r.fillRect(x, y, w, h, CONFIG.COL.DARK_GREY);

    // Fill
    const fillW = Math.floor(w * Math.min(1, percent));
    if (fillW > 0) {
      // Gradient effect: darker at bottom
      r.fillRect(x, y, fillW, h - 1, fgColor);
      r.fillRect(x, y + h - 1, fillW, 1, bgColor);
    }

    // Border
    r.fillRect(x, y, w, 1, CONFIG.COL.LIGHT_GREY);
    r.fillRect(x, y + h - 1, w, 1, CONFIG.COL.LIGHT_GREY);
    r.fillRect(x, y, 1, h, CONFIG.COL.LIGHT_GREY);
    r.fillRect(x + w - 1, y, 1, h, CONFIG.COL.LIGHT_GREY);

    // Percentage text
    const pctText = Math.floor(percent * 100) + '%';
    const tw = PixelFont.measure(pctText);
    PixelFont.draw(r, pctText, x + w + 2, y, CONFIG.COL.LIGHT_GREY);
  }
}
