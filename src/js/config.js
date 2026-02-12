// Constants and configuration
const CONFIG = {
  // Internal canvas resolution
  WIDTH: 320,
  HEIGHT: 224,
  TILE: 16,
  COLS: 20,  // 320/16
  ROWS: 14,  // 224/16 = 14
  PIXEL_SCALE: 2,
  BUFFER_WIDTH: 640,   // WIDTH * PIXEL_SCALE
  BUFFER_HEIGHT: 448,  // HEIGHT * PIXEL_SCALE
  SPRITE_SIZE: 32,     // TILE * PIXEL_SCALE

  // PICO-8 inspired palette
  PALETTE: [
    '#000000', // 0  black
    '#1d2b53', // 1  dark blue
    '#7e2553', // 2  dark purple
    '#008751', // 3  dark green
    '#ab5236', // 4  brown
    '#5f574f', // 5  dark grey
    '#c2c3c7', // 6  light grey
    '#fff1e8', // 7  white
    '#ff004d', // 8  red
    '#ffa300', // 9  orange
    '#ffec27', // 10 yellow
    '#00e436', // 11 green
    '#29adff', // 12 blue
    '#83769c', // 13 indigo
    '#ff77a8', // 14 pink
    '#ffccaa', // 15 peach
  ],

  // Color indices for quick reference
  COL: {
    BLACK: 0,
    DARK_BLUE: 1,
    DARK_PURPLE: 2,
    DARK_GREEN: 3,
    BROWN: 4,
    DARK_GREY: 5,
    LIGHT_GREY: 6,
    WHITE: 7,
    RED: 8,
    ORANGE: 9,
    YELLOW: 10,
    GREEN: 11,
    BLUE: 12,
    INDIGO: 13,
    PINK: 14,
    PEACH: 15,
  },

  // Desk positions (tile coords) - 6 worker desks
  DESKS: [
    { x: 3, y: 4 },   // top-left
    { x: 8, y: 4 },   // top-center
    { x: 13, y: 4 },  // top-right
    { x: 3, y: 7 },   // bottom-left
    { x: 8, y: 7 },   // bottom-center
    { x: 13, y: 7 },  // bottom-right
  ],

  // Leader's private desk position (tile coords) - centered below worker desks, 2 tiles wide
  LEADER_DESK_POS: { x: 7, y: 10 },
  LEADER_DESK_WIDTH: 2, // 2 tiles wide with 2 PCs

  // Whiteboard position
  WHITEBOARD: { x: 6, y: 0, w: 5, h: 2 },

  // Door position
  DOOR: { x: 17, y: 1, w: 1.5, h: 2 },

  // Leader default position (at own desk, centered between 2-tile desk)
  LEADER_DESK: -1,  // leader doesn't use a worker desk
  LEADER_START: { x: 7 * 16 + 16, y: 10 * 16 + 16 - 8 },

  // Whiteboard standing position
  WHITEBOARD_POS: { x: 8 * 16, y: 3 * 16 },

  // Door entry position
  DOOR_POS: { x: 17 * 16, y: 3 * 16 },

  // Overflow walk area (vertical pacing on right side)
  OVERFLOW_Y_MIN: 4 * 16,
  OVERFLOW_Y_MAX: 12 * 16,
  OVERFLOW_X: 16 * 16 + 8,

  // Wall and floor colors
  WALL_COLOR: 1,   // dark blue
  FLOOR_COLOR: 5,  // dark grey
  FLOOR_ALT: 1,    // checkerboard alt

  // Animation
  FPS: 60,
  WALK_SPEED: 1.0,  // pixels per frame
  MOVE_SPEED: 40,   // pixels per second for tweens

  // Timeouts (seconds)
  DONE_TIMEOUT: 180,        // 3 minutes in DONE before workers exit
  IDLE_TIMEOUT: 300,        // 5 minutes in IDLE before lights-out
  INACTIVITY_TIMEOUT: 120,  // 2 minutes of no events -> auto DONE
  WORKER_EXIT_STAGGER: 1.5, // seconds between worker departures

  // Panic effect (leader stressed from long work session)
  PANIC_TIMEOUT: 1800,      // 30 minutes of continuous active work

  // Snow storm (inactivity freeze)
  SNOW_START_TIMEOUT: 180,  // 3 minutes of no events before snow starts
  SNOW_FULL_TIMEOUT: 420,   // 7 minutes for full blizzard intensity
  SNOW_MELT_SPEED: 0.15,    // snow progress decay per second when activity resumes
};
