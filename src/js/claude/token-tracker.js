// Track token usage from Claude Code events
class TokenTracker {
  constructor(appState) {
    this.appState = appState;
  }

  // Process a result event with usage data
  processUsage(usage) {
    if (!usage) return;
    // Usage is now primarily computed by main process scanning session logs.
    // This is kept as a fallback for direct-spawn mode.
  }

  // Process model information
  processModel(model) {
    if (!model) return;
    this.appState.setModel(model);
  }

  // Set limits (from user config)
  setLimits(sessionLimit, weeklyLimit, sonnetLimit) {
    if (sessionLimit) this.appState.sessionLimit = sessionLimit;
    if (weeklyLimit) this.appState.weeklyLimit = weeklyLimit;
    if (sonnetLimit) this.appState.sonnetLimit = sonnetLimit;
  }
}
