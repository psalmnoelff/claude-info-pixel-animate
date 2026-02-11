// Parse NDJSON lines from Claude Code's stream-json output
class StreamParser {
  constructor() {
    this.onEvent = null; // callback(parsedEvent)
  }

  // Process a raw line from stdout
  parseLine(line) {
    if (!line || !line.trim()) return null;

    try {
      const event = JSON.parse(line.trim());
      if (this.onEvent) {
        this.onEvent(event);
      }
      return event;
    } catch (e) {
      // Not valid JSON, ignore
      return null;
    }
  }

  // Parse event structure. Claude stream-json events have these shapes:
  // { type: "system", ... }
  // { type: "assistant", message: { content: [...] } }
  // { type: "user", message: { content: [...] } }
  // { type: "result", result: "...", usage: {...} }
  static getEventType(event) {
    if (!event) return 'unknown';
    return event.type || 'unknown';
  }

  // Extract tool use information from assistant messages
  static getToolUse(event) {
    if (event.type !== 'assistant') return null;

    const content = event.message?.content;
    if (!Array.isArray(content)) return null;

    for (const block of content) {
      if (block.type === 'tool_use') {
        return {
          id: block.id,
          name: block.name,
          input: block.input
        };
      }
    }
    return null;
  }

  // Extract tool result
  static getToolResult(event) {
    if (event.type !== 'user') return null;

    const content = event.message?.content;
    if (!Array.isArray(content)) return null;

    for (const block of content) {
      if (block.type === 'tool_result') {
        return {
          id: block.tool_use_id,
          content: block.content,
          is_error: block.is_error || false
        };
      }
    }
    return null;
  }

  // Check if assistant message has text content
  static hasTextContent(event) {
    if (event.type !== 'assistant') return false;

    const content = event.message?.content;
    if (!Array.isArray(content)) return false;

    return content.some(block => block.type === 'text' && block.text);
  }

  // Get usage from result event
  static getUsage(event) {
    if (event.type === 'result' && event.usage) {
      return event.usage;
    }
    return null;
  }

  // Get model from system event
  static getModel(event) {
    if (event.type === 'system') {
      return event.model || null;
    }
    return null;
  }
}
