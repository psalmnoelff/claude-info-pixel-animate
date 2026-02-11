// Application state tracking
class AppState {
  constructor() {
    this.reset();
  }

  reset() {
    // Session usage (5-hour window) - output tokens
    // Claude Max 5x approximate session output token budget
    this.sessionTokens = 0;
    this.sessionLimit = 450000;

    // Weekly all-models usage - output tokens
    // Claude Max 5x approximate weekly output token budget
    this.weeklyTokens = 0;
    this.weeklyLimit = 5000000;

    // Sonnet-only weekly usage - output tokens
    this.sonnetTokens = 0;
    this.sonnetLimit = 2000000;

    // Context window for current session
    this.contextUsed = 0;
    this.contextLimit = 200000;

    this.agentCount = 0;
    this.currentModel = 'opus';
    this.isConnected = false;
    this.lastEvent = null;
    this.statusText = 'IDLE';

    // Multi-session tracking
    this.availableSessions = [];
    this.selectedSessionId = null;
  }

  // Update from computed usage data (from main process scanning session logs)
  updateFromUsageData(data) {
    if (data.sessionTokens !== undefined) this.sessionTokens = data.sessionTokens;
    if (data.weeklyTokens !== undefined) this.weeklyTokens = data.weeklyTokens;
    if (data.sonnetWeekly !== undefined) this.sonnetTokens = data.sonnetWeekly;
    if (data.currentSessionContext !== undefined) this.contextUsed = data.currentSessionContext;
  }

  setModel(model) {
    this.currentModel = model || 'opus';
  }

  // HP percentage (current session usage) - starts full, depletes over 5-hour window
  getHPPercent() {
    return Math.max(0, Math.min(1, 1 - (this.sessionTokens / this.sessionLimit)));
  }

  // Mana percentage (sonnet weekly usage) - starts full, depletes over the week
  getManaPercent() {
    return Math.max(0, Math.min(1, 1 - (this.sonnetTokens / this.sonnetLimit)));
  }

  // Life percentage (all models weekly) - starts full, depletes over the week
  getLifePercent() {
    return Math.max(0, Math.min(1, 1 - (this.weeklyTokens / this.weeklyLimit)));
  }

  // Context window percentage - starts full, depletes as context fills up
  getContextPercent() {
    return Math.max(0, Math.min(1, 1 - (this.contextUsed / this.contextLimit)));
  }
}
