// RPG-style HUD with HP/Mana/Life bars
class HUD {
  constructor(renderer, appState) {
    this.renderer = renderer;
    this.appState = appState;
    this._flashText = '';
    this._flashTimer = 0;
  }

  flashMessage(text, duration = 2) {
    this._flashText = text;
    this._flashTimer = duration;
  }

  draw() {
    const r = this.renderer;
    const s = this.appState;

    // HUD background bar at bottom
    r.fillRect(0, CONFIG.HEIGHT - 32, CONFIG.WIDTH, 32, CONFIG.COL.BLACK);
    r.fillRect(0, CONFIG.HEIGHT - 32, CONFIG.WIDTH, 1, CONFIG.COL.DARK_GREY);

    // Model indicator (bottom-left)
    const modelText = s.currentModel.toUpperCase();
    PixelFont.draw(r, modelText, 4, CONFIG.HEIGHT - 29, CONFIG.COL.YELLOW);

    // Status text (below model)
    PixelFont.draw(r, s.statusText, 4, CONFIG.HEIGHT - 21, CONFIG.COL.WHITE);

    // Agent count
    const agentText = 'AGENTS:' + s.agentCount;
    PixelFont.draw(r, agentText, 4, CONFIG.HEIGHT - 13, CONFIG.COL.LIGHT_GREY);

    // HP bar (green) - current session usage (5h window)
    this._drawBar(r, 90, CONFIG.HEIGHT - 29, 60, 5, s.getHPPercent(), CONFIG.COL.GREEN, CONFIG.COL.DARK_GREEN, 'HP');

    // Mana bar (blue) - sonnet weekly usage
    this._drawBar(r, 90, CONFIG.HEIGHT - 21, 60, 5, s.getManaPercent(), CONFIG.COL.BLUE, CONFIG.COL.DARK_BLUE, 'MP');

    // Life bar (red) - all models weekly usage
    this._drawBar(r, 90, CONFIG.HEIGHT - 13, 60, 5, s.getLifePercent(), CONFIG.COL.RED, CONFIG.COL.DARK_PURPLE, 'WK');

    // Context window bar (orange) - active session context
    this._drawBar(r, 190, CONFIG.HEIGHT - 29, 60, 5, s.getContextPercent(), CONFIG.COL.ORANGE, CONFIG.COL.BROWN, 'CW');

    // Session token count (bottom right)
    const tokenText = Math.floor(s.sessionTokens / 1000) + 'K';
    const tw = PixelFont.measure(tokenText);
    PixelFont.draw(r, tokenText, CONFIG.WIDTH - tw - 4, CONFIG.HEIGHT - 13, CONFIG.COL.LIGHT_GREY);

    // Weekly token count
    const weekText = Math.floor(s.weeklyTokens / 1000) + 'K/W';
    const ww = PixelFont.measure(weekText);
    PixelFont.draw(r, weekText, CONFIG.WIDTH - ww - 4, CONFIG.HEIGHT - 21, CONFIG.COL.LIGHT_GREY);

    // Flash message (centered, above HUD)
    if (this._flashTimer > 0) {
      this._flashTimer -= 1 / 60; // approximate frame dt
      const fw = PixelFont.measure(this._flashText);
      const fx = Math.floor((CONFIG.WIDTH - fw) / 2);
      const fy = CONFIG.HEIGHT - 44;
      r.fillRect(fx - 4, fy - 2, fw + 8, 11, CONFIG.COL.BLACK);
      PixelFont.draw(r, this._flashText, fx, fy, CONFIG.COL.YELLOW);
    }
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
    PixelFont.draw(r, pctText, x + w + 2, y, CONFIG.COL.LIGHT_GREY);
  }
}
