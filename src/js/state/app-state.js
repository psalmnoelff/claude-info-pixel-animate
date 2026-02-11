// Application state tracking
class AppState {
  constructor() {
    this.reset();
  }

  reset() {
    this.tokensUsed = 0;
    this.tokenLimit = 200000;
    this.sonnetTokens = 0;
    this.sonnetLimit = 100000;
    this.sessionsToday = 0;
    this.sessionLimit = 50;
    this.contextUsed = 0;
    this.contextLimit = 200000;
    this.agentCount = 0;
    this.currentModel = 'opus';
    this.isConnected = false;
    this.lastEvent = null;
    this.statusText = 'IDLE';
  }

  updateTokens(inputTokens, outputTokens) {
    this.tokensUsed += (inputTokens || 0) + (outputTokens || 0);
  }

  updateSonnetTokens(tokens) {
    this.sonnetTokens += tokens || 0;
  }

  updateContext(used, limit) {
    if (used !== undefined) this.contextUsed = used;
    if (limit !== undefined) this.contextLimit = limit;
  }

  setModel(model) {
    this.currentModel = model || 'opus';
  }

  // HP percentage (token usage) - starts full, depletes as tokens are consumed
  getHPPercent() {
    return Math.max(0, Math.min(1, 1 - (this.tokensUsed / this.tokenLimit)));
  }

  // Mana percentage (sonnet usage) - starts full, depletes as tokens are consumed
  getManaPercent() {
    return Math.max(0, Math.min(1, 1 - (this.sonnetTokens / this.sonnetLimit)));
  }

  // Life percentage (session rate) - starts full, depletes as sessions are used
  getLifePercent() {
    return Math.max(0, Math.min(1, 1 - (this.sessionsToday / this.sessionLimit)));
  }

  // Context window percentage - starts full, depletes as context fills up
  getContextPercent() {
    return Math.max(0, Math.min(1, 1 - (this.contextUsed / this.contextLimit)));
  }
}
