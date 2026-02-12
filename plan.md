# ClOffice Pixel - Pixel Art Claude Code Visualizer

## Context
Build an Electron desktop app that visualizes Claude Code's real-time state as an animated pixel art office scene. The app parses Claude Code's `--output-format stream-json` stdout to drive animations of 16x16 pixel characters working in a 6-desk office.

## Tech Stack
- **Electron** (desktop shell, child process management)
- **HTML5 Canvas** (256x192 internal resolution, integer-scaled to window)
- **Vanilla JS** (no frameworks)
- **16x16 pixel art** (defined as JS arrays, no external assets)

## Project Structure
```
cloffice-pixel/
├── package.json
├── main.js                          # Electron main process + Claude CLI spawning
├── preload.js                       # IPC bridge (contextBridge)
├── src/
│   ├── index.html
│   ├── styles.css
│   └── js/
│       ├── app.js                   # Entry point, wires everything together
│       ├── config.js                # Constants: palette, positions, layout
│       ├── game-loop.js             # 60fps fixed-timestep loop
│       ├── renderer/
│       │   └── canvas-renderer.js   # Double-buffer, integer scaling, letterbox
│       ├── scene/
│       │   ├── office.js            # Floor, walls, furniture tile rendering
│       │   ├── whiteboard.js        # Whiteboard entity + scribble effects
│       │   ├── desk.js              # Desk + PC entities (screen glow)
│       │   └── door.js              # Door open/close animation
│       ├── sprites/
│       │   ├── sprite-data.js       # All 16x16 pixel arrays (~60 frames)
│       │   ├── sprite-renderer.js   # Pixel array → cached offscreen canvas
│       │   └── animation-defs.js    # Frame sequences + FPS per animation
│       ├── characters/
│       │   ├── character.js         # Base class: position, movement, animation
│       │   ├── leader.js            # Team leader (glasses, whiteboard drawing)
│       │   ├── worker.js            # Agent worker (color-tinted, phone-walk)
│       │   └── character-manager.js # Spawn/destroy workers, assign desks
│       ├── animation/
│       │   ├── animator.js          # Per-character frame cycling
│       │   ├── tween.js            # Linear interpolation for movement
│       │   └── particles.js         # ZZZ bubbles, sparkle effects
│       ├── state/
│       │   ├── state-machine.js     # Global scene states + transitions
│       │   └── app-state.js         # Token counts, agent counts
│       ├── claude/
│       │   ├── claude-connector.js  # Spawn/attach to Claude CLI via IPC
│       │   ├── stream-parser.js     # Parse NDJSON lines from stream-json
│       │   ├── event-classifier.js  # Map events → state transitions
│       │   └── token-tracker.js     # Track usage for HP/Mana/Life bars
│       └── ui/
│           ├── hud.js               # RPG-style HP/Mana/Life bars
│           ├── settings-screen.js   # Launch config overlay
│           └── pixel-font.js        # Bitmap font for in-canvas text
```

## Office Layout (256x192 internal canvas, 16x12 tiles)
```
Row 0-1:  Back wall | Whiteboard (tiles 4-9) | Door (tile 14-15)
Row 2:    Space behind desks
Row 3-4:  Top row: 3 desks at tiles (2,3), (7,3), (12,3)
Row 5:    Aisle
Row 6-7:  Bottom row: 3 desks at tiles (2,6), (7,6), (12,6)
Row 8:    Aisle
Row 9-11: Walking/animation area (front)
```

## State Machine (driven by Claude Code events)
| State | Trigger | Animation |
|---|---|---|
| IDLE | Initial / reset | Leader at desk, no workers |
| THINKING | Assistant text streaming | Leader walks to whiteboard, draws |
| DELEGATING | `Task` tool call | Workers gather around whiteboard |
| CODING | `Edit`/`Write`/`Bash` tool call | Workers walk to desks, sit, type |
| DONE | `result` event | Everyone sleeps with ZZZ particles |
| MULTI_AGENT | Additional `Task` calls | New workers enter via door → desk |
| OVERFLOW | >5 agents | Extra workers phone-walk in front area |

## Claude Code Integration
- Main process spawns: `claude -p "<prompt>" --output-format stream-json --verbose`
- Stdout piped line-by-line via IPC to renderer
- `stream-parser.js` parses NDJSON events (system, assistant, user, result)
- `event-classifier.js` maps tool_use names to state transitions
- Agent tracking via tool_use_id correlation with tool_result

## HUD Bars
- **HP (green)**: Session tokens used / limit
- **Mana (blue)**: Sonnet model usage tracking
- **Life (red)**: Weekly session rate (user-configurable)

## Implementation Phases
1. Electron skeleton + static office scene
2. Sprites + static characters
3. Animation system (game loop, tweening)
4. State machine with keyboard testing
5. HUD bars
6. Claude Code integration
7. Settings + polish
