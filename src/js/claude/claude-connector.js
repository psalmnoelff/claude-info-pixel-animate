// Connect to Claude Code via IPC bridge
class ClaudeConnector {
  constructor(streamParser, eventClassifier) {
    this.parser = streamParser;
    this.classifier = eventClassifier;
    this.connected = false;
    this.removeListeners = [];
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

    this.connected = true;
    return true;
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
  }
}
