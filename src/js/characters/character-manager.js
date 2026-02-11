// Manages spawning/destroying workers and desk assignments
class CharacterManager {
  constructor() {
    this.leader = new Leader();
    this.workers = [];
    this.deskOccupancy = new Array(CONFIG.DESKS.length).fill(false);
    // Leader occupies desk 0
    this.deskOccupancy[CONFIG.LEADER_DESK] = true;

    // Worker tint colors cycle through these
    this.tintColors = [
      CONFIG.COL.BLUE,
      CONFIG.COL.RED,
      CONFIG.COL.GREEN,
      CONFIG.COL.ORANGE,
      CONFIG.COL.PINK,
      CONFIG.COL.DARK_PURPLE,
      CONFIG.COL.DARK_GREEN,
      CONFIG.COL.INDIGO,
    ];
    this.nextTintIndex = 0;
  }

  // Spawn a new worker, assign to next available desk
  spawnWorker() {
    const deskIndex = this._getNextDesk();
    const tint = this.tintColors[this.nextTintIndex % this.tintColors.length];
    this.nextTintIndex++;

    const worker = new Worker(deskIndex, tint);

    if (deskIndex >= 0) {
      this.deskOccupancy[deskIndex] = true;
    }

    this.workers.push(worker);
    return worker;
  }

  // Remove a specific worker
  removeWorker(worker) {
    const idx = this.workers.indexOf(worker);
    if (idx >= 0) {
      if (worker.deskIndex >= 0) {
        this.deskOccupancy[worker.deskIndex] = false;
      }
      this.workers.splice(idx, 1);
    }
  }

  // Remove all workers
  clearWorkers() {
    for (const w of this.workers) {
      if (w.deskIndex >= 0) {
        this.deskOccupancy[w.deskIndex] = false;
      }
    }
    this.deskOccupancy[CONFIG.LEADER_DESK] = true; // Keep leader's desk
    this.workers = [];
    this.nextTintIndex = 0;
  }

  // Find next free desk, or -1 if all occupied (overflow)
  _getNextDesk() {
    for (let i = 0; i < this.deskOccupancy.length; i++) {
      if (!this.deskOccupancy[i]) return i;
    }
    return -1; // Overflow
  }

  getWorkerCount() {
    return this.workers.length;
  }

  getActiveAgentCount() {
    return this.workers.filter(w => w.visible).length;
  }

  update(dt, whiteboard) {
    this.leader.update(dt, whiteboard);
    for (const w of this.workers) {
      w.update(dt);
    }
  }

  // Draw all characters sorted by Y position (painter's algorithm)
  draw(renderer) {
    const all = [this.leader, ...this.workers].filter(c => c.visible);
    all.sort((a, b) => a.y - b.y);
    for (const c of all) {
      c.draw(renderer);
    }
  }
}
