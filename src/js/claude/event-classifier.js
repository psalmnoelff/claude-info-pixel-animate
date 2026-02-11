// Map Claude Code events to state transitions
class EventClassifier {
  constructor(stateMachine, tokenTracker) {
    this.stateMachine = stateMachine;
    this.tokenTracker = tokenTracker;
    this.activeToolUses = new Map(); // track tool_use_id → tool_name
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

  // Process a parsed event and trigger state transitions
  classify(event) {
    this.stateMachine.signalActivity();
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
          if (this.stateMachine.getState() === STATES.IDLE) {
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
        }
        break;
      }

      case 'result': {
        // Session complete
        const usage = StreamParser.getUsage(event);
        if (usage) {
          this.tokenTracker.processUsage(usage);
        }
        this.stateMachine.transition(STATES.DONE);
        this.activeToolUses.clear();
        break;
      }
    }
  }

  _handleToolUse(toolUse) {
    const name = toolUse.name;

    if (EventClassifier.DELEGATION_TOOLS.has(name)) {
      const workerCount = this.stateMachine.charMgr.getWorkerCount();
      if (workerCount === 0) {
        this.stateMachine.transition(STATES.DELEGATING);
      } else {
        this.stateMachine.transition(STATES.MULTI_AGENT);
      }
    } else if (EventClassifier.CODING_TOOLS.has(name)) {
      const currentState = this.stateMachine.getState();
      if (currentState !== STATES.CODING) {
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

  // Reset tracking
  reset() {
    this.activeToolUses.clear();
  }
}
