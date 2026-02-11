// Connect to Claude Code via IPC bridge
class ClaudeConnector {
  constructor(streamParser, eventClassifier) {
    this.parser = streamParser;
    this.classifier = eventClassifier;
    this.connected = false;
    this.watching = false;
    this.removeListeners = [];
    this.onWatchStatusChange = null; // callback(status)
    this.onUsageUpdate = null; // callback(usageData)
  }

  // Start listening for Claude events via preload bridge
  connect() {
    if (!window.claude) {
      console.warn('Claude IPC bridge not available');
      return false;
    }

    // Listen for events
    const removeEvent = window.claude.onEvent((line) => {
      const event = this.parser.parseLine(line);
      if (event) {
        this.classifier.classify(event);
      }
    });
    this.removeListeners.push(removeEvent);

    const removeStderr = window.claude.onStderr((data) => {
      console.log('[claude stderr]', data);
    });
    this.removeListeners.push(removeStderr);

    const removeExit = window.claude.onExit((code) => {
      console.log('[claude] exited with code', code);
      this.connected = false;
    });
    this.removeListeners.push(removeExit);

    const removeError = window.claude.onError((msg) => {
      console.error('[claude] error:', msg);
      this.connected = false;
    });
    this.removeListeners.push(removeError);

    // Listen for watch status changes
    const removeWatchStatus = window.claude.onWatchStatus((status) => {
      this.watching = status.watching;
      console.log('[claude] watch status:', status);
      if (this.onWatchStatusChange) {
        this.onWatchStatusChange(status);
      }
    });
    this.removeListeners.push(removeWatchStatus);

    // Listen for usage data updates
    const removeUsageUpdate = window.claude.onUsageUpdate((data) => {
      if (this.onUsageUpdate) {
        this.onUsageUpdate(data);
      }
    });
    this.removeListeners.push(removeUsageUpdate);

    this.connected = true;
    return true;
  }

  // Start watching existing Claude Code session logs
  async watch() {
    if (!window.claude) return false;

    try {
      const result = await window.claude.watch();
      this.watching = result.ok;
      this.connected = result.ok;
      return result.ok;
    } catch (e) {
      console.error('Failed to start watching:', e);
      return false;
    }
  }

  // Stop watching session logs
  async unwatch() {
    if (!window.claude) return;

    try {
      await window.claude.unwatch();
    } catch (e) {
      console.error('Failed to stop watching:', e);
    }
    this.watching = false;
  }

  // Launch Claude with a prompt
  async start(prompt, workingDir) {
    if (!window.claude) return false;

    try {
      const result = await window.claude.start(prompt, workingDir);
      this.connected = result.ok;
      return result.ok;
    } catch (e) {
      console.error('Failed to start Claude:', e);
      return false;
    }
  }

  // Stop Claude process
  async stop() {
    if (!window.claude) return;

    try {
      await window.claude.stop();
    } catch (e) {
      console.error('Failed to stop Claude:', e);
    }
    this.connected = false;
  }

  // Disconnect event listeners
  disconnect() {
    for (const remove of this.removeListeners) {
      remove();
    }
    this.removeListeners = [];
    this.connected = false;
    this.watching = false;
  }
}
