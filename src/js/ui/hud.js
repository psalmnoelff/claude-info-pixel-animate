// RPG-style HUD with resource bars
class HUD {
  constructor(renderer, appState) {
    this.renderer = renderer;
    this.appState = appState;
    this._flashText = '';
    this._flashTimer = 0;

    // Bar regions for click detection (populated during draw)
    this._barRegions = [];
  }

  flashMessage(text, duration = 2) {
    this._flashText = text;
    this._flashTimer = duration;
  }

  // Check if a click (in buffer coords) hits a bar, and show its description
  handleClick(bufX, bufY) {
    for (const region of this._barRegions) {
      // Expand hit area slightly for easier clicking (label area + bar + percent)
      if (bufX >= region.x - 20 && bufX <= region.x + region.w + 30 &&
          bufY >= region.y - 1 && bufY <= region.y + region.h + 1) {
        const pct = Math.floor(region.percent * 100);
        this.flashMessage(region.description + ' ' + pct + '%', 3);
        return true;
      }
    }
    return false;
  }

  draw() {
    const r = this.renderer;
    const s = this.appState;

    // Clear bar regions
    this._barRegions = [];

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

    // CS bar (green) - current session usage (5h window) - top
    const csPct = s.getHPPercent();
    this._drawBar(r, 90, CONFIG.HEIGHT - 29, 60, 5, csPct, CONFIG.COL.GREEN, CONFIG.COL.DARK_GREEN, 'CS');
    this._barRegions.push({ x: 90, y: CONFIG.HEIGHT - 29, w: 60, h: 5, percent: csPct, description: 'CURRENT SESSION REMAINING' });

    // TWS bar (red) - all models weekly usage - middle
    const twsPct = s.getLifePercent();
    this._drawBar(r, 90, CONFIG.HEIGHT - 21, 60, 5, twsPct, CONFIG.COL.RED, CONFIG.COL.DARK_PURPLE, 'TWS');
    this._barRegions.push({ x: 90, y: CONFIG.HEIGHT - 21, w: 60, h: 5, percent: twsPct, description: 'TOTAL WEEKLY REMAINING' });

    // SWS bar (blue) - sonnet weekly usage - bottom
    const swsPct = s.getManaPercent();
    this._drawBar(r, 90, CONFIG.HEIGHT - 13, 60, 5, swsPct, CONFIG.COL.BLUE, CONFIG.COL.DARK_BLUE, 'SWS');
    this._barRegions.push({ x: 90, y: CONFIG.HEIGHT - 13, w: 60, h: 5, percent: swsPct, description: 'SONNET WEEKLY REMAINING' });

    // Context window bar (orange) - active session context
    const cwPct = s.getContextPercent();
    this._drawBar(r, 190, CONFIG.HEIGHT - 29, 60, 5, cwPct, CONFIG.COL.ORANGE, CONFIG.COL.BROWN, 'CW');
    this._barRegions.push({ x: 190, y: CONFIG.HEIGHT - 29, w: 60, h: 5, percent: cwPct, description: 'CONTEXT WINDOW REMAINING' });

    // Session indicator (below CW bar)
    if (s.availableSessions && s.availableSessions.length > 0) {
      const selected = s.availableSessions.find(ses => ses.id === s.selectedSessionId) || s.availableSessions[0];
      const sessionLabel = (selected.project || '?').substring(0, 12);
      const countLabel = s.availableSessions.length > 1
        ? '[' + s.availableSessions.length + '] '
        : '';
      PixelFont.draw(r, countLabel + sessionLabel, 190, CONFIG.HEIGHT - 21, CONFIG.COL.INDIGO);
    }

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
    const labelOffset = label.length > 2 ? 22 : 15;
    PixelFont.draw(r, label, x - labelOffset, y, CONFIG.COL.LIGHT_GREY);

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
