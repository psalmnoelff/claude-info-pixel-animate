// Map Claude Code events to state transitions
class EventClassifier {
  constructor(stateMachine, tokenTracker) {
    this.stateMachine = stateMachine;
    this.tokenTracker = tokenTracker;
    this.activeToolUses = new Map(); // track tool_use_id → tool_name
    this._doneTimer = null;
    this.onGitCommit = null; // callback(message)
  }

  // Coding tools - trigger CODING state
  static CODING_TOOLS = new Set([
    'Edit', 'Write', 'Bash', 'Read', 'Glob', 'Grep',
    'NotebookEdit', 'WebFetch', 'WebSearch'
  ]);

  // Delegation tools - trigger DELEGATING/MULTI_AGENT
  static DELEGATION_TOOLS = new Set([
    'Task'
  ]);

  // Planning tools - trigger PLANNING state
  static PLANNING_TOOLS = new Set([
    'EnterPlanMode'
  ]);

  // Process a parsed event and trigger state transitions
  classify(event) {
    this.stateMachine.signalActivity();

    // Cancel pending DONE transition on any new activity
    if (this._doneTimer) {
      clearTimeout(this._doneTimer);
      this._doneTimer = null;
    }

    const type = StreamParser.getEventType(event);

    switch (type) {
      case 'system': {
        const model = StreamParser.getModel(event);
        if (model) {
          this.tokenTracker.processModel(model);
        }
        break;
      }

      case 'assistant': {
        // Check for tool use
        const toolUse = StreamParser.getToolUse(event);
        if (toolUse) {
          this.activeToolUses.set(toolUse.id, toolUse.name);
          this._handleToolUse(toolUse);
        }

        // Check for text content (thinking)
        if (StreamParser.hasTextContent(event)) {
          const currentState = this.stateMachine.getState();
          if (currentState === STATES.IDLE || currentState === STATES.DONE) {
            this.stateMachine.transition(STATES.THINKING);
          }
        }
        break;
      }

      case 'user': {
        // Check for tool result
        const toolResult = StreamParser.getToolResult(event);
        if (toolResult) {
          this.activeToolUses.delete(toolResult.id);
          if (toolResult.is_error) {
            this._handleError();
          }
        } else {
          // Check if this is an interruption ([Request interrupted by user])
          const content = event.message?.content;
          let isInterrupted = false;
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block.type === 'text' && block.text && block.text.startsWith('[Request interrupted')) {
                isInterrupted = true;
                break;
              }
            }
          }
          if (isInterrupted) {
            this.stateMachine.transition(STATES.INTERRUPTED);
          } else {
            // User sent a new message - new turn starts, Claude will think
            this.stateMachine.transition(STATES.THINKING);
          }
        }
        break;
      }

      case 'result': {
        const usage = StreamParser.getUsage(event);
        if (usage) {
          this.tokenTracker.processUsage(usage);
        }
        // Debounce DONE - wait 3s before transitioning to avoid flickering
        this._doneTimer = setTimeout(() => {
          this._doneTimer = null;
          this.stateMachine.transition(STATES.DONE);
          this.activeToolUses.clear();
        }, 3000);
        break;
      }
    }
  }

  _handleToolUse(toolUse) {
    const name = toolUse.name;

    // Detect git commits in Bash commands
    if (name === 'Bash' && toolUse.input?.command) {
      const cmd = toolUse.input.command;
      if (cmd.includes('git commit')) {
        const msg = this._extractCommitMessage(cmd);
        if (this.onGitCommit) this.onGitCommit(msg);
      }
    }

    if (EventClassifier.PLANNING_TOOLS.has(name)) {
      this.stateMachine.transition(STATES.PLANNING);
    } else if (name === 'ExitPlanMode') {
      // Exit planning - transition to THINKING (Claude will start implementing)
      this.stateMachine.transition(STATES.THINKING);
    } else if (EventClassifier.DELEGATION_TOOLS.has(name)) {
      const workerCount = this.stateMachine.charMgr.getWorkerCount();
      if (workerCount === 0) {
        this.stateMachine.transition(STATES.DELEGATING);
      } else {
        this.stateMachine.transition(STATES.MULTI_AGENT);
      }
    } else if (EventClassifier.CODING_TOOLS.has(name)) {
      const currentState = this.stateMachine.getState();
      if (currentState !== STATES.CODING && currentState !== STATES.PLANNING) {
        this.stateMachine.transition(STATES.CODING);
      }
    }
  }

  _handleError() {
    // Trigger error animation on a random visible character
    const chars = [];
    if (this.stateMachine.charMgr.leader.visible) {
      chars.push(this.stateMachine.charMgr.leader);
    }
    for (const w of this.stateMachine.charMgr.workers) {
      if (w.visible) chars.push(w);
    }
    if (chars.length > 0) {
      const target = chars[Math.floor(Math.random() * chars.length)];
      target.triggerError();
    }
  }

  _extractCommitMessage(cmd) {
    // HEREDOC style: git commit -m "$(cat <<'EOF'\nmessage\n..."
    const heredocMatch = cmd.match(/cat\s*<<'?EOF'?\n([\s\S]*?)\n\s*EOF/);
    if (heredocMatch) {
      const firstLine = heredocMatch[1].trim().split('\n')[0].trim();
      if (firstLine) return firstLine;
    }
    // Standard: git commit -m "message" or -m 'message'
    const match = cmd.match(/git\s+commit.*?-m\s+["']([^"'\n]+)/);
    if (match) return match[1];
    return 'code committed';
  }

  // Reset tracking
  reset() {
    this.activeToolUses.clear();
    if (this._doneTimer) {
      clearTimeout(this._doneTimer);
      this._doneTimer = null;
    }
  }
}
