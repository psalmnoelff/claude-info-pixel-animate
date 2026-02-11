// Constants and configuration
const CONFIG = {
  // Internal canvas resolution
  WIDTH: 320,
  HEIGHT: 180,
  TILE: 16,
  COLS: 20,  // 320/16
  ROWS: 11,  // 180/16 = 11.25, 11 usable rows

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
    { x: 3, y: 3 },   // top-left
    { x: 8, y: 3 },   // top-center
    { x: 13, y: 3 },  // top-right
    { x: 3, y: 6 },   // bottom-left
    { x: 8, y: 6 },   // bottom-center
    { x: 13, y: 6 },  // bottom-right
  ],

  // Leader's private desk position (tile coords) - bottom-right area
  LEADER_DESK_POS: { x: 16, y: 8 },

  // Whiteboard position
  WHITEBOARD: { x: 5, y: 0, w: 7, h: 2 },

  // Door position
  DOOR: { x: 17, y: 0, w: 2, h: 3 },

  // Leader default position (at own desk, bottom-right)
  LEADER_DESK: -1,  // leader doesn't use a worker desk
  LEADER_START: { x: 16 * 16, y: 8 * 16 - 8 },

  // Whiteboard standing position
  WHITEBOARD_POS: { x: 8 * 16, y: 2 * 16 },

  // Door entry position
  DOOR_POS: { x: 17 * 16, y: 2 * 16 },

  // Overflow walk area
  OVERFLOW_Y_MIN: 8 * 16,
  OVERFLOW_Y_MAX: 9 * 16,

  // Wall and floor colors
  WALL_COLOR: 1,   // dark blue
  FLOOR_COLOR: 5,  // dark grey
  FLOOR_ALT: 1,    // checkerboard alt

  // Animation
  FPS: 60,
  WALK_SPEED: 1.0,  // pixels per frame
  MOVE_SPEED: 40,   // pixels per second for tweens
};
