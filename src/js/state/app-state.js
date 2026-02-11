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

  setModel(model) {
    this.currentModel = model || 'opus';
  }

  // HP percentage (token usage)
  getHPPercent() {
    return Math.min(1, this.tokensUsed / this.tokenLimit);
  }

  // Mana percentage (sonnet usage)
  getManaPercent() {
    return Math.min(1, this.sonnetTokens / this.sonnetLimit);
  }

  // Life percentage (session rate)
  getLifePercent() {
    return Math.min(1, this.sessionsToday / this.sessionLimit);
  }
}
