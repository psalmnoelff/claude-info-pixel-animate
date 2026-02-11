// Track token usage from Claude Code events
class TokenTracker {
  constructor(appState) {
    this.appState = appState;
  }

  // Process a result event with usage data
  processUsage(usage) {
    if (!usage) return;

    if (usage.input_tokens !== undefined) {
      this.appState.updateTokens(usage.input_tokens, usage.output_tokens || 0);
    }

    if (usage.cache_read_input_tokens) {
      this.appState.updateTokens(usage.cache_read_input_tokens, 0);
    }
  }

  // Process model information
  processModel(model) {
    if (!model) return;

    this.appState.setModel(model);

    // Track sonnet usage separately
    if (model.includes('sonnet')) {
      this.appState.sonnetTokens += 1000; // Approximate per-call
    }
  }

  // Set limits (from user config)
  setLimits(tokenLimit, sonnetLimit, sessionLimit) {
    if (tokenLimit) this.appState.tokenLimit = tokenLimit;
    if (sonnetLimit) this.appState.sonnetLimit = sonnetLimit;
    if (sessionLimit) this.appState.sessionLimit = sessionLimit;
  }
}
