# Claude Info

**Your AI coding session, visualized as a tiny pixel art office.**

Claude Info is an Electron desktop app that turns Claude Code's real-time activity into an animated pixel art office scene. A small team of characters thinks at whiteboards, types at desks, and spawns new agents through a door -- all driven by what Claude Code is actually doing in your terminal. An RPG-style HUD tracks your token budgets so you always know how much capacity you have left.

---

## Features

- **Real-time session visualization** -- automatically detects and watches your active Claude Code session logs with zero configuration.
- **Animated pixel art office** -- a PICO-8-inspired scene with a leader character, up to 6 worker agents at desks, a whiteboard, an animated door, and particle effects (ZZZ bubbles, typing sparkles).
- **RPG-style HUD** -- four status bars track your 5-hour session budget, Sonnet quota, weekly all-model quota, and context window usage at a glance.
- **Event-driven state machine** -- Claude's tool calls (Edit, Bash, Read, Task, etc.) are classified into distinct visual states: Idle, Thinking, Delegating, Coding, Multi-Agent, and Done.
- **Multi-agent support** -- when Claude spawns sub-agents via the Task tool, new color-tinted worker characters walk through the office door and sit at desks. Beyond 6 agents, overflow workers pace around the floor talking on phones.
- **Always-on-top mode** -- pin the window above other apps to keep an eye on your session while you work.
- **Demo mode** -- cycle through all visual states automatically to preview every animation.
- **Settings overlay** -- toggle listening, launch sessions, enable always-on-top, and start demos from a single screen.
- **No external assets** -- all sprites are defined as JavaScript arrays using a 16-color palette. The entire app is pure vanilla JS with no frameworks.

---

## How It Works

### Session Log Watching

The Electron main process monitors `~/.claude/projects/` for JSONL session log files. It locates the most recently modified `.jsonl` file, tails it at 500ms intervals, and forwards new events to the renderer process over IPC. When you start a new Claude Code session in your terminal, the app detects the new log file and switches to it automatically.

### Event Classification Pipeline

```
Session log (.jsonl)
  --> main.js (tail + convert to stream-json format)
    --> StreamParser (parse NDJSON lines)
      --> EventClassifier (map tool calls to states)
        --> StateMachine (animate the scene)
```

The `EventClassifier` inspects each event and triggers state transitions:

| Event Type | Detected When | Transition |
|---|---|---|
| Thinking | Assistant message contains text content | IDLE --> THINKING |
| Coding | Tool call is Edit, Write, Bash, Read, Glob, Grep, NotebookEdit, WebFetch, or WebSearch | --> CODING |
| Delegating | First `Task` tool call (no workers yet) | --> DELEGATING |
| Multi-Agent | Subsequent `Task` tool calls (workers exist) | --> MULTI_AGENT |
| Done | A `result` event arrives | --> DONE |

### Usage Tracking

The main process periodically scans all session log files modified within the past week, computing accumulated output token counts across sessions. These totals are sent to the renderer every ~15 seconds (or immediately when new events arrive) to keep the HUD bars current.

---

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and available on your PATH

### Setup

```bash
git clone <repository-url>
cd claude-info
npm install
npm start
```

The app launches and immediately begins listening for active Claude Code sessions.

---

## Usage

### Connecting to Claude Code

The app uses **Listen Mode** by default. Simply run Claude Code in any terminal as you normally would:

```bash
claude
```

Claude Info automatically finds the active session log file under `~/.claude/projects/` and begins visualizing events in real time. No manual connection step is needed.

### Settings Screen

Press **Escape** to open the settings overlay, where you can:

- **Listen / Stop Listening** -- toggle session log watching on or off.
- **Launch a new session** (advanced) -- spawn a Claude Code process directly from the app by providing a prompt and working directory.
- **Always On Top** -- pin the window above all other windows.
- **Demo Mode** -- start the automated state cycling demo.

### Demo Mode

Press **D** to toggle demo mode. The scene cycles through all states every 4 seconds in this sequence: Thinking, Delegating, Coding, Multi-Agent, Coding, Done, Idle.

---

## Keyboard Shortcuts

| Key       | Action                                  |
|-----------|-----------------------------------------|
| `Escape`  | Open / close the settings screen        |
| `D`       | Toggle demo mode (auto-cycles states)   |
| `T`       | Toggle always-on-top window pinning     |
| `Alt`     | Show the menu bar (auto-hidden)         |
| `0`       | Force state: Idle                       |
| `1`       | Force state: Thinking                   |
| `2`       | Force state: Delegating                 |
| `3`       | Force state: Coding                     |
| `4`       | Force state: Done                       |
| `5`       | Force state: Multi-Agent                |

Keys 0-5 are debug shortcuts that force immediate state transitions, useful for testing animations.

---

## HUD Bars

The bottom of the screen displays an RPG-style heads-up display with four resource bars that start full and deplete as tokens are consumed:

| Label  | Color  | Tracks                              | Time Window     |
|--------|--------|-------------------------------------|-----------------|
| **HP** | Green  | Session output token usage          | 5-hour rolling  |
| **MP** | Blue   | Sonnet model output token usage     | Weekly          |
| **WK** | Red    | All-models output token usage       | Weekly          |
| **CW** | Orange | Context window consumption          | Current session |

The HUD also displays:

- **Current model** name (top-left, e.g., `OPUS` or `SONNET`)
- **Current state** label (e.g., `CODING`, `THINKING`, `DONE`)
- **Agent count** -- number of active worker agents
- **Session tokens** -- output tokens used this session (in thousands, bottom-right)
- **Weekly tokens** -- output tokens used this week (in thousands, bottom-right)

---

## State Machine

The scene is driven by a finite state machine with six visual states:

| State           | Trigger                                     | Scene Behavior                                                                  |
|-----------------|---------------------------------------------|---------------------------------------------------------------------------------|
| **IDLE**        | Initial state / no active session           | Leader sleeps at their private desk. All workers are dismissed. ZZZ particles rise. |
| **THINKING**    | Assistant produces text content              | Leader walks to the whiteboard and stands in front of it.                        |
| **DELEGATING**  | First `Task` tool call                      | Door opens. A worker spawns, enters, and joins the leader at the whiteboard.     |
| **CODING**      | Coding tool call (Edit, Bash, Read, etc.)   | Leader and all workers move to their desks and type. Sparkle particles appear.   |
| **MULTI_AGENT** | Subsequent `Task` tool calls                | Another worker spawns through the door and takes a desk.                         |
| **DONE**        | Result event (turn complete)                | Everyone returns to their desks and falls asleep. ZZZ particles rise.            |
| **OVERFLOW**    | More than 5 agents spawned                  | Excess workers without desks pace around the office floor on their phones.       |

---

## Architecture

### Rendering

- **Electron** (v33+) with context isolation and a secure preload bridge (`contextBridge`).
- **Canvas 2D** at a fixed internal resolution of **320x180 pixels**, integer-scaled to the window size for a crisp retro look.
- **16x16 pixel sprites** defined as flat arrays of palette indices -- no image files needed.
- **PICO-8-inspired 16-color palette** for all rendering.
- **60 FPS game loop** with fixed-timestep updates and variable-rate rendering via `requestAnimationFrame`.

### IPC Architecture

The main process handles all filesystem access (session log discovery, file tailing, usage computation) and exposes a safe API to the renderer through the preload script:

```
Main Process (main.js)
  |-- File system: tail session logs, scan usage
  |-- IPC channels: claude:event, claude:usage-update, claude:watch-status
  |
Preload (preload.js)
  |-- contextBridge: window.claude, window.appWindow
  |
Renderer (src/js/app.js)
  |-- ClaudeConnector --> StreamParser --> EventClassifier --> StateMachine
  |-- CharacterManager, Office, HUD, Particles
```

### Key Design Decisions

- Characters are Y-sorted each frame for correct depth ordering (painter's algorithm).
- Workers are assigned to one of 6 desks on a first-come basis; overflow workers beyond desk capacity receive a special phone-walking animation on the office floor.
- Token usage is recomputed by scanning all session log files modified in the past week, running every ~15 seconds or immediately when new events arrive.
- The app uses `contextIsolation: true` and `nodeIntegration: false` for security.

---

## Project Structure

```
claude-info/
  main.js                              # Electron main process, session log watcher, IPC
  preload.js                           # Secure IPC bridge (contextBridge)
  package.json                         # Dependencies (Electron v33+)
  src/
    index.html                         # App shell
    styles.css                         # Base styles
    js/
      app.js                           # Entry point -- wires all systems together
      config.js                        # Constants: resolution, palette, desk positions, speeds
      game-loop.js                     # Fixed-timestep game loop (60 FPS)
      claude/
        claude-connector.js            # IPC bridge consumer, event routing
        stream-parser.js               # Parses NDJSON lines from Claude's stream-json output
        event-classifier.js            # Maps tool calls and events to state transitions
        token-tracker.js               # Tracks per-model token usage
      state/
        state-machine.js               # Finite state machine driving scene behavior
        app-state.js                   # Application state: token budgets, model, status
      characters/
        character.js                   # Base character class (position, animation, movement)
        leader.js                      # Leader character with whiteboard-drawing behavior
        worker.js                      # Worker/agent with desk assignment and phone-walk
        character-manager.js           # Spawns/destroys workers, manages desk occupancy
      scene/
        office.js                      # Background: walls, checkerboard floor, baseboard
        desk.js                        # Desk furniture with animated screen glow
        door.js                        # Animated door (opens for agent arrivals)
        whiteboard.js                  # Wall-mounted whiteboard with scribble effects
      animation/
        tween.js                       # Linear interpolation for smooth character movement
        animator.js                    # Per-character frame cycling
        particles.js                   # Particle effects (ZZZ sleep bubbles, typing sparkles)
      sprites/
        sprite-data.js                 # Raw pixel data for all sprites (~45 sprites)
        sprite-renderer.js             # Renders pixel arrays to cached offscreen canvases
        animation-defs.js              # Animation frame sequences and timing
      renderer/
        canvas-renderer.js             # Canvas 2D wrapper with integer scaling and letterbox
      ui/
        hud.js                         # RPG-style HUD with HP/MP/WK/CW bars
        pixel-font.js                  # 4x6 bitmap font for in-canvas text rendering
        settings-screen.js             # Settings overlay (listen, launch, demo, always-on-top)
```

---

## Configuration

### Token Budget Limits

Token limits are defined in `src/js/state/app-state.js` and can be adjusted to match your Claude plan:

```javascript
// Session usage (5-hour rolling window) - output tokens
this.sessionLimit = 450000;

// Weekly all-models usage - output tokens
this.weeklyLimit = 5000000;

// Sonnet-only weekly usage - output tokens
this.sonnetLimit = 2000000;

// Context window limit - total tokens
this.contextLimit = 200000;
```

The defaults are configured for the **Claude Max 5x** plan. If you are on a different plan tier, adjust these values so the HUD bars accurately reflect your remaining capacity.

---

## License

See the project repository for license information.
