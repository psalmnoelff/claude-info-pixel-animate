# Claude Info - Pixel Art Claude Code Visualizer

An Electron desktop app that visualizes Claude Code's real-time state as an animated pixel art office scene. The app parses Claude Code's `--output-format stream-json` stdout to drive animations of 16x16 pixel characters working in a 6-desk office.

## Tech Stack

- **Electron** - Desktop shell, child process management
- **HTML5 Canvas** - 256x192 internal resolution, integer-scaled to window
- **Vanilla JS** - No frameworks
- **16x16 pixel art** - Defined as JS arrays, no external assets

## Getting Started

```bash
cd C:\Development\Personal\claude-info
npm install
npm start
```

## Controls

| Key | Action |
|-----|--------|
| `D` | Toggle demo mode (auto-cycles through all states) |
| `0` | Reset to IDLE state |
| `1` | Trigger THINKING state |
| `2` | Trigger DELEGATING state |
| `3` | Trigger CODING state |
| `4` | Trigger DONE state |
| `5` | Trigger MULTI_AGENT state |
| `ESC` | Open/close settings overlay |

## Project Structure

```
claude-info/
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
│       │   ├── sprite-data.js       # All 16x16 pixel arrays (~45 sprites)
│       │   ├── sprite-renderer.js   # Pixel array → cached offscreen canvas
│       │   └── animation-defs.js    # Frame sequences + FPS per animation
│       ├── characters/
│       │   ├── character.js         # Base class: position, movement, animation
│       │   ├── leader.js            # Team leader (glasses, whiteboard drawing)
│       │   ├── worker.js            # Agent worker (color-tinted, phone-walk)
│       │   └── character-manager.js # Spawn/destroy workers, assign desks
│       ├── animation/
│       │   ├── animator.js          # Per-character frame cycling
│       │   ├── tween.js             # Linear interpolation for movement
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
│           └── pixel-font.js        # 4x6 bitmap font for in-canvas text
```

## Office Layout

256x192 internal canvas (16x12 tiles):

```
Row 0-1:  Back wall | Whiteboard (tiles 4-9) | Door (tile 14-15)
Row 2:    Space behind desks
Row 3-4:  Top row: 3 desks at tiles (2,3), (7,3), (12,3)
Row 5:    Aisle
Row 6-7:  Bottom row: 3 desks at tiles (2,6), (7,6), (12,6)
Row 8:    Aisle
Row 9-11: Walking/animation area (front)
```

## State Machine

Driven by Claude Code events or keyboard input:

| State | Trigger | Animation |
|-------|---------|-----------|
| IDLE | Initial / reset / key `0` | Leader at desk, no workers |
| THINKING | Assistant text streaming / key `1` | Leader walks to whiteboard, draws |
| DELEGATING | `Task` tool call / key `2` | Workers gather around whiteboard |
| CODING | `Edit`/`Write`/`Bash` tool call / key `3` | Workers walk to desks, sit, type |
| DONE | `result` event / key `4` | Everyone sleeps with ZZZ particles |
| MULTI_AGENT | Additional `Task` calls / key `5` | New workers enter via door |
| OVERFLOW | >5 agents | Extra workers phone-walk in front area |

## Claude Code Integration

The main process spawns Claude CLI and pipes events to the renderer:

```
claude -p "<prompt>" --output-format stream-json --verbose
```

- `stream-parser.js` parses NDJSON events (`system`, `assistant`, `user`, `result`)
- `event-classifier.js` maps tool names to state transitions:
  - `Task` → DELEGATING / MULTI_AGENT
  - `Edit` / `Write` / `Bash` / `Read` / `Glob` / `Grep` → CODING
  - Text blocks → THINKING
  - `result` → DONE

## HUD Bars

- **HP (green)** - Session tokens used / limit
- **Mana (blue)** - Sonnet model usage tracking
- **Life (red)** - Weekly session rate (user-configurable)

## Sprite Design

- 16x16 pixels, defined as flat arrays of PICO-8 palette indices (16 colors)
- Pre-rendered to offscreen canvases for fast blitting
- Workers are color-tinted for unique appearance
- Key animations: idle (2f), walk (4f x 4 dir), sit (1f), type (2f), sleep (2f), draw (3f), phone-walk (4f)

## Palette

PICO-8 inspired 16-color palette:

| Index | Color | Hex |
|-------|-------|-----|
| 0 | Black | `#000000` |
| 1 | Dark Blue | `#1d2b53` |
| 2 | Dark Purple | `#7e2553` |
| 3 | Dark Green | `#008751` |
| 4 | Brown | `#ab5236` |
| 5 | Dark Grey | `#5f574f` |
| 6 | Light Grey | `#c2c3c7` |
| 7 | White | `#fff1e8` |
| 8 | Red | `#ff004d` |
| 9 | Orange | `#ffa300` |
| 10 | Yellow | `#ffec27` |
| 11 | Green | `#00e436` |
| 12 | Blue | `#29adff` |
| 13 | Indigo | `#83769c` |
| 14 | Pink | `#ff77a8` |
| 15 | Peach | `#ffccaa` |
