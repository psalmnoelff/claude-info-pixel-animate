// Native 32x32 sprite data - overrides upscaled 16x16 versions
// Auto-detected by sprite-renderer.js via data.length === 1024
// Palette: T=transparent, 0=black, 1=dk blue, 4=brown, 5=dk grey,
//          6=lt grey, 7=white, 8=red, 9=orange, 12=blue, 15=peach

(function() {
const T = -1;

// --- Helpers ---
function shiftDown(arr) {
  const out = new Array(1024).fill(T);
  for (let i = 0; i < 992; i++) out[i + 32] = arr[i];
  return out;
}

function replaceRows(base, startRow, rows) {
  const out = base.slice();
  for (let i = 0; i < rows.length; i++) out[startRow * 32 + i] = rows[i];
  return out;
}

// Shorthand row builder: R(leftPad, count,val, count,val, ...) pads right with T
function R(pad) {
  const args = Array.from(arguments);
  const row = [];
  for (let i = 0; i < args[0]; i++) row.push(T);
  for (let i = 1; i < args.length; i += 2) {
    for (let j = 0; j < args[i]; j++) row.push(args[i + 1]);
  }
  while (row.length < 32) row.push(T);
  return row;
}

// ============================================================
// LEADER - Front-facing base (idle standing pose)
// ============================================================
const LEADER_FRONT = [].concat(
  R(32, T),                                                          // row 0
  R(32, T),                                                          // row 1
  R(12, 8,0),                                                        // row 2: hair top outline
  R(10, 1,0, 10,4, 1,0),                                             // row 3: hair
  R(9,  1,0, 12,4, 1,0),                                             // row 4: hair wider
  R(8,  1,0, 3,4, 1,9, 6,4, 1,9, 3,4, 1,0),                         // row 5: hair highlights
  R(8,  1,0, 14,4, 1,0),                                             // row 6: hair full
  R(8,  1,0, 2,4, 10,15, 2,4, 1,0),                                  // row 7: forehead
  R(8,  1,0, 1,4, 12,15, 1,4, 1,0),                                  // row 8: upper face
  R(8,  1,0, 1,4, 2,15, 2,4, 4,15, 2,4, 2,15, 1,4, 1,0),            // row 9: eyebrows
  R(8,  1,0, 1,4, 1,15, 1,12, 2,7, 1,12, 2,15, 1,12, 2,7, 1,12, 1,15, 1,4, 1,0), // row 10: eyes
  R(8,  1,0, 1,4, 1,15, 1,12, 2,0, 1,12, 2,15, 1,12, 2,0, 1,12, 1,15, 1,4, 1,0), // row 11: pupils
  R(8,  1,0, 1,4, 12,15, 1,4, 1,0),                                  // row 12: cheeks
  R(8,  1,0, 1,4, 12,15, 1,4, 1,0),                                  // row 13: lower face
  R(8,  1,0, 1,4, 5,15, 2,8, 5,15, 1,4, 1,0),                       // row 14: mouth
  R(9,  1,0, 12,15, 1,0),                                            // row 15: chin
  R(11, 1,0, 8,15, 1,0),                                             // row 16: neck
  R(10, 1,0, 4,1, 2,7, 4,1, 1,0),                                   // row 17: collar
  R(9,  1,0, 5,1, 2,7, 5,1, 1,0),                                   // row 18: shoulders
  R(8,  1,15, 1,0, 5,1, 2,7, 5,1, 1,0, 1,15),                       // row 19: shirt+hands
  R(8,  1,15, 1,0, 5,1, 2,7, 5,1, 1,0, 1,15),                       // row 20: shirt+hands
  R(9,  1,0, 5,1, 2,7, 5,1, 1,0),                                   // row 21: lower shirt
  R(10, 1,0, 10,5, 1,0),                                             // row 22: pants top
  R(10, 1,0, 10,5, 1,0),                                             // row 23: pants
  R(10, 1,0, 4,5, 2,0, 4,5, 1,0),                                   // row 24: pants seam
  R(10, 1,0, 3,5, 1,0, 2,T, 1,0, 3,5, 1,0),                         // row 25: legs
  R(10, 1,0, 3,5, 1,0, 2,T, 1,0, 3,5, 1,0),                         // row 26: legs
  R(10, 1,0, 4,0, 2,T, 1,0, 4,0),                                   // row 27: shoes
  R(32, T), R(32, T), R(32, T), R(32, T)                             // rows 28-31
);

// ============================================================
// WORKER - Front-facing base (no glasses, light grey shirt)
// ============================================================
const WORKER_FACE = [].concat(
  R(8, 1,0, 1,4, 12,15, 1,4, 1,0),                                   // row 9: clean face
  R(8, 1,0, 1,4, 2,15, 2,7, 2,15, 2,15, 2,7, 2,15, 1,4, 1,0),       // row 10: eyes
  R(8, 1,0, 1,4, 2,15, 2,0, 2,15, 2,15, 2,0, 2,15, 1,4, 1,0)        // row 11: pupils
);
const WORKER_SHIRT = [].concat(
  R(10, 1,0, 4,6, 2,7, 4,6, 1,0),                                   // row 17
  R(9,  1,0, 5,6, 2,7, 5,6, 1,0),                                   // row 18
  R(8,  1,15, 1,0, 5,6, 2,7, 5,6, 1,0, 1,15),                       // row 19
  R(8,  1,15, 1,0, 5,6, 2,7, 5,6, 1,0, 1,15),                       // row 20
  R(9,  1,0, 5,6, 2,7, 5,6, 1,0)                                    // row 21
);

const WORKER_FRONT = replaceRows(replaceRows(LEADER_FRONT.slice(), 9, WORKER_FACE), 17, WORKER_SHIRT);

// ============================================================
// Walk-down/up/right leg spread (rows 24-27 = 128 values)
// ============================================================
const LEGS_SPREAD = [].concat(
  R(10, 1,0, 4,5, 2,0, 4,5, 1,0),                                   // row 24: seam
  R(9,  1,0, 3,5, 1,0, 4,T, 1,0, 3,5, 1,0),                         // row 25: apart
  R(9,  1,0, 2,5, 1,0, 6,T, 1,0, 2,5, 1,0),                         // row 26: apart
  R(9,  1,0, 3,0, 6,T, 1,0, 3,0)                                    // row 27: shoes apart
);

// Walk-right side-view stride (rows 24-27 = 128 values)
// Asymmetric: back leg shorter, front leg extended forward
const SIDE_LEGS_STRIDE = [].concat(
  R(10, 1,0, 10,5, 1,0),                                             // row 24: pants connected
  R(9,  1,0, 3,5, 1,0, 3,T, 1,0, 4,5, 1,0),                         // row 25: back leg, gap, front leg
  R(8,  1,0, 3,5, 1,0, 4,T, 1,0, 4,5, 1,0),                         // row 26: wider stride
  R(7,  1,0, 3,0, 5,T, 1,0, 4,0)                                    // row 27: shoes apart
);

// ============================================================
// Walk-up base (back view - hair only, no face)
// ============================================================
const LEADER_BACK = [].concat(
  R(32, T), R(32, T),                                                // rows 0-1
  R(12, 8,0),                                                        // row 2: hair top
  R(10, 1,0, 10,4, 1,0),                                             // row 3
  R(9,  1,0, 12,4, 1,0),                                             // row 4
  R(8,  1,0, 3,4, 1,9, 6,4, 1,9, 3,4, 1,0),                         // row 5
  R(8,  1,0, 14,4, 1,0),                                             // row 6
  R(8,  1,0, 14,4, 1,0),                                             // row 7
  R(8,  1,0, 14,4, 1,0),                                             // row 8
  R(8,  1,0, 14,4, 1,0),                                             // row 9
  R(8,  1,0, 14,4, 1,0),                                             // row 10
  R(8,  1,0, 14,4, 1,0),                                             // row 11
  R(8,  1,0, 14,4, 1,0),                                             // row 12
  R(8,  1,0, 14,4, 1,0),                                             // row 13
  R(9,  1,0, 12,4, 1,0),                                             // row 14: hair bottom
  R(9,  1,0, 12,15, 1,0),                                            // row 15: neck visible
  R(11, 1,0, 8,15, 1,0),                                             // row 16: neck
  R(10, 1,0, 4,1, 2,7, 4,1, 1,0),                                   // row 17
  R(9,  1,0, 5,1, 2,7, 5,1, 1,0),                                   // row 18
  R(8,  1,15, 1,0, 5,1, 2,7, 5,1, 1,0, 1,15),                       // row 19
  R(8,  1,15, 1,0, 5,1, 2,7, 5,1, 1,0, 1,15),                       // row 20
  R(9,  1,0, 5,1, 2,7, 5,1, 1,0),                                   // row 21
  R(10, 1,0, 10,5, 1,0),                                             // row 22
  R(10, 1,0, 10,5, 1,0),                                             // row 23
  R(10, 1,0, 4,5, 2,0, 4,5, 1,0),                                   // row 24
  R(10, 1,0, 3,5, 1,0, 2,T, 1,0, 3,5, 1,0),                         // row 25
  R(10, 1,0, 3,5, 1,0, 2,T, 1,0, 3,5, 1,0),                         // row 26
  R(10, 1,0, 4,0, 2,T, 1,0, 4,0),                                   // row 27
  R(32, T), R(32, T), R(32, T), R(32, T)                             // rows 28-31
);

const WORKER_BACK_SHIRT = [].concat(
  R(10, 1,0, 4,6, 2,7, 4,6, 1,0),                                   // row 17
  R(9,  1,0, 5,6, 2,7, 5,6, 1,0),                                   // row 18
  R(8,  1,15, 1,0, 5,6, 2,7, 5,6, 1,0, 1,15),                       // row 19
  R(8,  1,15, 1,0, 5,6, 2,7, 5,6, 1,0, 1,15),                       // row 20
  R(9,  1,0, 5,6, 2,7, 5,6, 1,0)                                    // row 21
);
const WORKER_BACK = replaceRows(LEADER_BACK.slice(), 17, WORKER_BACK_SHIRT);

// ============================================================
// Walk-right base (side view)
// ============================================================
const LEADER_RIGHT = [].concat(
  R(32, T), R(32, T),                                                // rows 0-1
  R(12, 8,0),                                                        // row 2
  R(10, 1,0, 10,4, 1,0),                                             // row 3
  R(9,  1,0, 12,4, 1,0),                                             // row 4
  R(8,  1,0, 3,4, 1,9, 6,4, 1,9, 3,4, 1,0),                         // row 5
  R(8,  1,0, 14,4, 1,0),                                             // row 6
  R(8,  1,0, 5,4, 7,15, 2,4, 1,0),                                   // row 7: side forehead
  R(8,  1,0, 3,4, 10,15, 1,4, 1,0),                                  // row 8: side face
  R(8,  1,0, 2,4, 3,15, 1,4, 6,15, 2,4, 1,0),                       // row 9: side eyebrow
  R(8,  1,0, 1,4, 4,15, 1,12, 2,7, 1,12, 3,15, 1,4, 1,0),           // row 10: side eye
  R(8,  1,0, 1,4, 4,15, 1,12, 1,7, 1,0, 1,12, 3,15, 1,4, 1,0),      // row 11: side pupil
  R(8,  1,0, 1,4, 12,15, 1,4, 1,0),                                  // row 12
  R(8,  1,0, 1,4, 5,15, 1,0, 6,15, 1,4, 1,0),                       // row 13: nose
  R(8,  1,0, 1,4, 4,15, 2,8, 6,15, 1,4, 1,0),                       // row 14: mouth
  R(9,  1,0, 12,15, 1,0),                                            // row 15
  R(11, 1,0, 8,15, 1,0),                                             // row 16
  R(10, 1,0, 4,1, 2,7, 4,1, 1,0),                                   // row 17
  R(9,  1,0, 5,1, 2,7, 5,1, 1,0),                                   // row 18
  R(8,  1,15, 1,0, 5,1, 2,7, 5,1, 1,0, 1,15),                       // row 19
  R(8,  1,15, 1,0, 5,1, 2,7, 5,1, 1,0, 1,15),                       // row 20
  R(9,  1,0, 5,1, 2,7, 5,1, 1,0),                                   // row 21
  R(10, 1,0, 10,5, 1,0),                                             // row 22
  R(10, 1,0, 10,5, 1,0),                                             // row 23
  R(10, 1,0, 4,5, 2,0, 4,5, 1,0),                                   // row 24
  R(10, 1,0, 3,5, 1,0, 2,T, 1,0, 3,5, 1,0),                         // row 25
  R(10, 1,0, 3,5, 1,0, 2,T, 1,0, 3,5, 1,0),                         // row 26
  R(10, 1,0, 4,0, 2,T, 1,0, 4,0),                                   // row 27
  R(32, T), R(32, T), R(32, T), R(32, T)                             // rows 28-31
);

const WORKER_RIGHT_FACE = [].concat(
  R(8, 1,0, 2,4, 3,15, 1,4, 6,15, 2,4, 1,0),                        // row 9
  R(8, 1,0, 1,4, 5,15, 2,7, 2,15, 4,15, 1,4, 1,0),                  // row 10
  R(8, 1,0, 1,4, 5,15, 1,7, 1,0, 2,15, 4,15, 1,4, 1,0)              // row 11
);
const WORKER_RIGHT = replaceRows(replaceRows(LEADER_RIGHT.slice(), 9, WORKER_RIGHT_FACE), 17, WORKER_SHIRT);

// ============================================================
// Sit pose (BACK VIEW + chair back visible)
// Character faces PC (away from viewer), chair rails on sides
// ============================================================
const LEADER_SIT_BODY = [].concat(
  R(8,  2,5, 1,T, 1,0, 8,15, 1,0, 1,T, 2,5),                        // row 16: neck + chair back sides
  R(7,  3,5, 1,0, 4,1, 2,7, 4,1, 1,0, 3,5),                         // row 17: wide chair top + collar
  R(7,  2,5, 1,0, 5,1, 2,7, 5,1, 1,0, 2,5),                         // row 18: chair rail + shoulders
  R(7,  2,5, 1,0, 5,1, 2,7, 5,1, 1,0, 2,5),                         // row 19: chair rail + shirt
  R(7,  2,5, 1,0, 5,1, 2,7, 5,1, 1,0, 2,5),                         // row 20: chair rail + shirt
  R(9,  1,0, 12,1, 1,0),                                             // row 21: shirt wider
  R(9,  1,0, 12,5, 1,0),                                             // row 22: seat/lap
  R(9,  1,0, 12,5, 1,0),                                             // row 23: seat/lap
  R(32, T), R(32, T), R(32, T), R(32, T)                             // rows 24-27: hidden by desk
);
// Sit uses BACK (hair) head, not FRONT (face)
const LEADER_SIT = replaceRows(LEADER_BACK.slice(), 16, LEADER_SIT_BODY);

const WORKER_SIT_BODY = [].concat(
  R(8,  2,5, 1,T, 1,0, 8,15, 1,0, 1,T, 2,5),                        // row 16: neck + chair back sides
  R(7,  3,5, 1,0, 4,6, 2,7, 4,6, 1,0, 3,5),                         // row 17: wide chair + collar
  R(7,  2,5, 1,0, 5,6, 2,7, 5,6, 1,0, 2,5),                         // row 18: chair + shoulders
  R(7,  2,5, 1,0, 5,6, 2,7, 5,6, 1,0, 2,5),                         // row 19: chair + shirt
  R(7,  2,5, 1,0, 5,6, 2,7, 5,6, 1,0, 2,5),                         // row 20: chair + shirt
  R(9,  1,0, 12,6, 1,0),                                             // row 21
  R(9,  1,0, 12,5, 1,0),                                             // row 22
  R(9,  1,0, 12,5, 1,0),                                             // row 23
  R(32, T), R(32, T), R(32, T), R(32, T)                             // rows 24-27
);
const WORKER_SIT = replaceRows(WORKER_BACK.slice(), 16, WORKER_SIT_BODY);

// ============================================================
// Draw pose (leader at whiteboard - FRONT facing, arm raised)
// ============================================================
const LEADER_DRAW_ARM_0 = [].concat(
  R(6,  1,15, 2,T, 1,0, 5,1, 2,7, 5,1, 1,0, 1,15),                  // row 19: left arm raised
  R(8,  1,15, 1,0, 5,1, 2,7, 5,1, 1,0, 1,15)                        // row 20
);
const LEADER_DRAW_ARM_1 = [].concat(
  R(5,  1,15, 3,T, 1,0, 5,1, 2,7, 5,1, 1,0, 1,15),                  // row 19: arm higher
  R(8,  1,15, 1,0, 5,1, 2,7, 5,1, 1,0, 1,15)                        // row 20
);
const LEADER_DRAW_ARM_2 = [].concat(
  R(6,  1,15, 2,T, 1,0, 5,1, 2,7, 5,1, 1,0, 1,15),                  // row 19: arm mid
  R(7,  1,15, 1,T, 1,0, 5,1, 2,7, 5,1, 1,0, 1,15)                   // row 20
);

// ============================================================
// Sleep pose (worker slumped - back view, head droops)
// ============================================================
// Just uses the sit pose shifted down (head droops forward)

// ============================================================
// Phone pose (worker - front facing, phone at ear)
// ============================================================
const WORKER_PHONE_ARM_0 = [].concat(
  R(8,  1,15, 1,0, 5,6, 2,7, 5,6, 1,0, 1,15),                       // row 19
  R(7,  1,15, 1,9, 1,0, 5,6, 2,7, 5,6, 1,0, 1,15)                   // row 20: phone (9=orange)
);
const WORKER_PHONE_ARM_1 = [].concat(
  R(7,  1,15, 1,9, 1,0, 5,6, 2,7, 5,6, 1,0, 1,15),                  // row 19: phone up
  R(8,  1,15, 1,0, 5,6, 2,7, 5,6, 1,0, 1,15)                        // row 20
);

// ============================================================
// ASSIGN ALL SPRITES
// ============================================================

// --- Leader idle ---
SPRITES.leader_idle_0 = LEADER_FRONT;
SPRITES.leader_idle_1 = shiftDown(LEADER_FRONT);

// --- Leader walk down (front view, spread legs for stride) ---
SPRITES.leader_walk_down_0 = replaceRows(LEADER_FRONT.slice(), 24, LEGS_SPREAD);
SPRITES.leader_walk_down_1 = LEADER_FRONT;
SPRITES.leader_walk_down_2 = replaceRows(LEADER_FRONT.slice(), 24, LEGS_SPREAD);
SPRITES.leader_walk_down_3 = LEADER_FRONT;

// --- Leader walk up (back view) ---
SPRITES.leader_walk_up_0 = replaceRows(LEADER_BACK.slice(), 24, LEGS_SPREAD);
SPRITES.leader_walk_up_1 = LEADER_BACK;
SPRITES.leader_walk_up_2 = replaceRows(LEADER_BACK.slice(), 24, LEGS_SPREAD);
SPRITES.leader_walk_up_3 = LEADER_BACK;

// --- Leader walk right (side view, asymmetric stride) ---
SPRITES.leader_walk_right_0 = replaceRows(LEADER_RIGHT.slice(), 24, SIDE_LEGS_STRIDE);
SPRITES.leader_walk_right_1 = LEADER_RIGHT;
SPRITES.leader_walk_right_2 = replaceRows(LEADER_RIGHT.slice(), 24, SIDE_LEGS_STRIDE);
SPRITES.leader_walk_right_3 = LEADER_RIGHT;

// --- Leader sit & type (back view + chair) ---
SPRITES.leader_sit = LEADER_SIT;
SPRITES.leader_type_0 = LEADER_SIT;
SPRITES.leader_type_1 = shiftDown(LEADER_SIT);               // subtle lean forward

// --- Leader draw (front view at whiteboard, arm raised) ---
SPRITES.leader_draw_0 = replaceRows(LEADER_FRONT.slice(), 19, LEADER_DRAW_ARM_0);
SPRITES.leader_draw_1 = replaceRows(LEADER_FRONT.slice(), 19, LEADER_DRAW_ARM_1);
SPRITES.leader_draw_2 = replaceRows(LEADER_FRONT.slice(), 19, LEADER_DRAW_ARM_2);

// --- Worker idle ---
SPRITES.worker_idle_0 = WORKER_FRONT;
SPRITES.worker_idle_1 = shiftDown(WORKER_FRONT);

// --- Worker walk down ---
SPRITES.worker_walk_down_0 = replaceRows(WORKER_FRONT.slice(), 24, LEGS_SPREAD);
SPRITES.worker_walk_down_1 = WORKER_FRONT;
SPRITES.worker_walk_down_2 = replaceRows(WORKER_FRONT.slice(), 24, LEGS_SPREAD);
SPRITES.worker_walk_down_3 = WORKER_FRONT;

// --- Worker walk up ---
SPRITES.worker_walk_up_0 = replaceRows(WORKER_BACK.slice(), 24, LEGS_SPREAD);
SPRITES.worker_walk_up_1 = WORKER_BACK;
SPRITES.worker_walk_up_2 = replaceRows(WORKER_BACK.slice(), 24, LEGS_SPREAD);
SPRITES.worker_walk_up_3 = WORKER_BACK;

// --- Worker walk right (side view, asymmetric stride) ---
SPRITES.worker_walk_right_0 = replaceRows(WORKER_RIGHT.slice(), 24, SIDE_LEGS_STRIDE);
SPRITES.worker_walk_right_1 = WORKER_RIGHT;
SPRITES.worker_walk_right_2 = replaceRows(WORKER_RIGHT.slice(), 24, SIDE_LEGS_STRIDE);
SPRITES.worker_walk_right_3 = WORKER_RIGHT;

// --- Worker sit & type (back view + chair) ---
SPRITES.worker_sit = WORKER_SIT;
SPRITES.worker_type_0 = WORKER_SIT;
SPRITES.worker_type_1 = shiftDown(WORKER_SIT);               // subtle lean

// --- Worker sleep (back view, slumped) ---
SPRITES.worker_sleep_0 = WORKER_SIT;
SPRITES.worker_sleep_1 = shiftDown(WORKER_SIT);

// --- Worker phone (front view, phone at ear) ---
SPRITES.worker_phone_0 = replaceRows(WORKER_FRONT.slice(), 19, WORKER_PHONE_ARM_0);
SPRITES.worker_phone_1 = replaceRows(WORKER_FRONT.slice(), 19, WORKER_PHONE_ARM_1);
SPRITES.worker_phone_2 = replaceRows(WORKER_FRONT.slice(), 19, WORKER_PHONE_ARM_0);
SPRITES.worker_phone_3 = replaceRows(WORKER_FRONT.slice(), 19, WORKER_PHONE_ARM_1);

})();
