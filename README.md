# ClOffice Pixel

**Your AI coding session, visualized as a tiny pixel art office.**

ClOffice Pixel is an Electron desktop app that turns Claude Code's real-time activity into an animated pixel art office scene. A small team of characters thinks at whiteboards, types at desks, and spawns new agents through a door -- all driven by what Claude Code is actually doing in your terminal. An RPG-style HUD tracks your token budgets so you always know how much capacity you have left.

---

## Features

- **Real-time session visualization** -- automatically detects and watches your active Claude Code session logs with zero configuration.
- **Animated pixel art office** -- a PICO-8-inspired scene with a leader character, up to 6 worker agents at desks, a whiteboard with structured diagrams, an animated door, and particle effects (ZZZ bubbles, typing sparkles, muzzle flashes).
- **Scrolling code screens** -- PC monitors display scrolling lines of code with random color themes per desk (terminal green, light mode, blue/yellow, etc.). Screens go black when workers are sleeping.
- **RPG-style HUD** -- four status bars track your 5-hour session budget, Sonnet quota, weekly all-model quota, and context window usage at a glance. Click any bar for a description.
- **Event-driven state machine** -- Claude's tool calls (Edit, Bash, Read, Task, etc.) are classified into distinct visual states: Idle, Thinking, Delegating, Coding, Planning, Multi-Agent, and Done. The DONE transition is debounced by 3 seconds to prevent flickering during multi-turn tasks.
- **Git commit celebration** -- detects `git commit` commands in Bash tool calls and triggers a confetti particle burst with a HUD message showing the commit summary.
- **Multi-agent support** -- when Claude spawns sub-agents via the Task tool, new color-tinted worker characters walk through the office door and sit at desks. Beyond 6 agents, overflow workers pace vertically on the right side of the office talking on phones.
- **Incident monitoring** -- office windows show animated fire effects when Claude has active status incidents. Click a window to view incident details with links.
- **Worker exit sequence** -- when transitioning from Done to Idle, the leader character walks to each worker with a shotgun animation to dismiss them.
- **Lights-out sequence** -- after extended idle time, the leader exits through the door and the office dims.
- **Janitor sequence** -- when context is compacted, a janitor character enters and cleans the whiteboard.
- **Dynamic day/night windows** -- office windows show a real-time sky that transitions between twinkling stars at night and drifting clouds during the day, with layered sunrise/sunset glow during transitions.
- **Wall clock** -- an analog clock above the door displays the real system time with hour, minute, and second hands.
- **Retro frame** -- the viewport is wrapped in a white border with black padding for a classic retro game look.
- **Always-on-top mode** -- pin the window above other apps to keep an eye on your session while you work.
- **Demo mode** -- cycle through all visual states automatically to preview every animation.
- **Settings overlay** -- toggle listening, launch sessions, enable always-on-top, start demos, and trigger test effects from a single screen.
- **Custom pixel art icon** -- the app icon is the leader character's face, generated from sprite data via `node scripts/generate-icon.js`.
- **No external assets** -- all 32x32 sprites are defined as JavaScript arrays using a 16-color palette. The entire app is pure vanilla JS with no frameworks.

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
| Planning | EnterPlanMode or ExitPlanMode tool calls | --> PLANNING |
| Done | A `result` event arrives (3s debounce) | --> DONE |

### Usage Tracking

The main process periodically scans all session log files modified within the past week, computing accumulated output token counts across sessions. These totals are sent to the renderer every ~15 seconds (or immediately when new events arrive) to keep the HUD bars current.

---

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and available on your PATH

### Quick Start

**Windows:**
```powershell
git clone <repository-url>
cd cloffice-pixel
powershell -ExecutionPolicy Bypass -File run.ps1
```

Or just double-click `ClOffice Pixel.cmd` — it launches silently with no console window.

**macOS / Linux:**
```bash
git clone <repository-url>
cd cloffice-pixel
chmod +x run.sh
./run.sh
```

The scripts install dependencies automatically and launch the app.

### Manual Setup

```bash
git clone <repository-url>
cd cloffice-pixel
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

ClOffice Pixel automatically finds the active session log file under `~/.claude/projects/` and begins visualizing events in real time. No manual connection step is needed.

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
| `P`       | Toggle leader panic (stress test)       |
| `I`       | Toggle snow storm (freeze test)         |
| `F`       | Toggle fire test (status incident)      |
| `E`       | Workers exit one by one                 |
| `S`       | Cycle active sessions                   |
| `N`       | Cycle window sky (auto/sunset/sunrise)  |
| `R`       | Reset to initial state                  |
| `Alt`     | Show the menu bar (auto-hidden)         |
| `0`       | Force state: Idle                       |
| `1`       | Force state: Thinking                   |
| `2`       | Force state: Delegating                 |
| `3`       | Force state: Coding                     |
| `4`       | Force state: Done                       |
| `5`       | Force state: Multi-Agent                |
| `6`       | Test janitor sequence                   |
| `7`       | Trigger error on random worker          |
| `8`       | Trigger error on leader                 |
| `9`       | Trigger error on all characters         |

Keys 0-9 are debug shortcuts useful for testing animations and visual states.

---

## HUD Bars

The bottom of the screen displays an RPG-style heads-up display with four resource bars that start full and deplete as tokens are consumed:

| Label   | Color  | Tracks                              | Time Window     |
|---------|--------|-------------------------------------|-----------------|
| **CS**  | Green  | Current session output token usage  | 5-hour rolling  |
| **SWS** | Blue   | Sonnet model output token usage     | Weekly          |
| **TWS** | Red    | All-models output token usage       | Weekly          |
| **CW**  | Orange | Context window consumption          | Current session |

Click any bar to see its full description and current percentage.

The HUD also displays:

- **Current model** name (top-left, e.g., `OPUS` or `SONNET`)
- **Current state** label (e.g., `CODING`, `THINKING`, `DONE`)
- **Agent count** -- number of active worker agents
- **Session tokens** -- output tokens used this session (in thousands, bottom-right)
- **Weekly tokens** -- output tokens used this week (in thousands, bottom-right)
- **Active session** -- project name and session count for multi-session tracking

---

## State Machine

The scene is driven by a finite state machine with these visual states:

| State           | Trigger                                     | Scene Behavior                                                                  |
|-----------------|---------------------------------------------|---------------------------------------------------------------------------------|
| **IDLE**        | Initial state / no active session           | Leader roams and sleeps at their desk. All workers are dismissed. ZZZ particles rise. |
| **THINKING**    | Assistant produces text content              | Leader walks to the whiteboard and draws structured diagrams (boxes, text, arrows). |
| **DELEGATING**  | First `Task` tool call                      | Door opens. A worker spawns, enters, and joins the leader at the whiteboard.     |
| **CODING**      | Coding tool call (Edit, Bash, Read, etc.)   | Leader and all workers move to their desks and type. PC screens scroll code. Sparkle particles appear. |
| **PLANNING**    | Plan mode tool calls                        | Leader alternates between drawing on the whiteboard and pacing back and forth.    |
| **MULTI_AGENT** | Subsequent `Task` tool calls                | Another worker spawns through the door and takes a desk.                         |
| **DONE**        | Result event (turn complete)                | Everyone roams around the office and sleeps at random spots. ZZZ particles rise. |
| **OVERFLOW**    | More than 5 agents spawned                  | Excess workers without desks pace vertically on the right side, talking on phones with raised arms. |

### Special Sequences

- **Worker Exit** -- after the Done timeout, the leader walks to each worker with a shotgun draw/cock/shoot animation sequence, dismissing them one by one before returning to their desk.
- **Lights Out** -- after extended idle time, the leader walks to the door and exits. The office dims to 75% darkness. Activity resumes when new events arrive.
- **Janitor** -- when context is compacted or full, a janitor character enters through the door, mops the whiteboard clean, and exits.
- **Error Bubbles** -- when workers encounter errors, a white speech bubble with black frame and red "!!" text appears above their head with angry red blinking eyes.

---

## Architecture

### Rendering

- **Electron** (v33+) with context isolation and a secure preload bridge (`contextBridge`).
- **Canvas 2D** at a fixed internal resolution of **320x224 pixels**, integer-scaled to the window size for a crisp retro look.
- **32x32 pixel sprites** (at 2x pixel scale from 16x16 logical tiles) defined as flat arrays of palette indices -- no image files needed.
- **PICO-8-inspired 16-color palette** for all rendering.
- **60 FPS game loop** with fixed-timestep updates, try/catch crash resilience, and variable-rate rendering via `requestAnimationFrame`.
- **Retro frame** -- rounded white border with black padding around the game viewport.

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
- The leader desk is centered below the 6-worker desk grid with equal row spacing.
- Workers are assigned to one of 6 desks on a first-come basis; overflow workers beyond desk capacity receive a phone-walking animation, pacing vertically on the right side of the office.
- Characters route through a safe corridor above the desk zone to avoid walking through furniture.
- Token usage is recomputed by scanning all session log files modified in the past week, running every ~15 seconds or immediately when new events arrive.
- The context window bar accounts for Claude Code's ~33k autocompact buffer reserve.
- The app uses `contextIsolation: true` and `nodeIntegration: false` for security.

---

## Office Layout

```
Row 0-2:  Wall (48px) -- whiteboard, windows, door, potted plants
Row 3:    Safe corridor (character routing)
Row 4:    Desk row 1 -- 3 worker desks (x: 3, 8, 13)
Row 5-6:  Aisle space
Row 7:    Desk row 2 -- 3 worker desks (x: 3, 8, 13)
Row 8-9:  Aisle space
Row 10:   Leader desk -- centered (x: 7, 2 tiles wide)
Row 11:   Open space
Row 12-13: HUD area (32px)
```

Overflow workers pace vertically on the right side (x: ~264px) between rows 4-12.

---

## Project Structure

```
cloffice-pixel/
  main.js                              # Electron main process, session log watcher, IPC
  preload.js                           # Secure IPC bridge (contextBridge)
  package.json                         # Dependencies (Electron v33+)
  src/
    index.html                         # App shell
    styles.css                         # Base styles
    js/
      app.js                           # Entry point -- wires all systems together
      config.js                        # Constants: resolution, palette, desk positions, speeds
      game-loop.js                     # Fixed-timestep game loop (60 FPS, crash resilient)
      claude/
        claude-connector.js            # IPC bridge consumer, event routing
        stream-parser.js               # Parses NDJSON lines from Claude's stream-json output
        event-classifier.js            # Maps tool calls and events to state transitions
        token-tracker.js               # Tracks per-model token usage
      state/
        state-machine.js               # Finite state machine driving scene behavior
        app-state.js                   # Application state: token budgets, model, status
      characters/
        character.js                   # Base character class (position, animation, movement, error overlay)
        leader.js                      # Leader character with whiteboard-drawing behavior
        worker.js                      # Worker/agent with desk assignment and phone-walk
        character-manager.js           # Spawns/destroys workers, manages desk occupancy
      scene/
        office.js                      # Background: walls, floor with grain texture, windows, plants
        desk.js                        # Desk furniture with scrolling code screens and color themes
        door.js                        # Animated door (1.5x2 tiles, opens for agent arrivals)
        whiteboard.js                  # Wall-mounted whiteboard with structured elements (boxes, lines, text, dots)
        fire-status.js                 # Fire effect behind windows for active incidents
      animation/
        tween.js                       # Linear interpolation for smooth character movement
        animator.js                    # Per-character frame cycling
        particles.js                   # Particle effects (ZZZ bubbles, typing sparkles, muzzle flashes, confetti)
      sprites/
        sprite-data.js                 # Raw pixel data for 16x16 sprites
        sprite-data-32.js              # Raw pixel data for 32x32 sprites (characters, doors)
        sprite-renderer.js             # Renders pixel arrays to cached canvases with tinting support
        animation-defs.js              # Animation frame sequences and timing
      renderer/
        canvas-renderer.js             # Canvas 2D wrapper with integer scaling, letterbox, and retro frame
      ui/
        hud.js                         # RPG-style HUD with CS/TWS/SWS/CW bars
        pixel-font.js                  # 4x6 bitmap font for in-canvas text rendering
        settings-screen.js             # Settings overlay (listen, launch, demo, always-on-top)
        status-popup.js                # Incident status popup with clickable links
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

// Context window limit (excludes ~33k autocompact buffer) - total tokens
this.contextLimit = 167000;
```

The defaults are configured for the **Claude Max 5x** plan. If you are on a different plan tier, adjust these values so the HUD bars accurately reflect your remaining capacity.

---

## License

See the project repository for license information.
