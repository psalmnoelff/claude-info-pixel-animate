// Grid-based pathfinding for character movement around desks
class PathGrid {
  constructor() {
    this.cellSize = 8;
    this.cols = CONFIG.WIDTH / this.cellSize;   // 40
    this.rows = CONFIG.HEIGHT / this.cellSize;  // 28
    this.grid = new Uint8Array(this.cols * this.rows); // 0=free, 1=blocked
    this._buildGrid();
  }

  _buildGrid() {
    const cs = this.cellSize;
    const PAD = 6;

    // Block wall (y < 48) and HUD (y >= 192)
    for (let r = 0; r < this.rows; r++) {
      if (r * cs < 48 || r * cs >= 192) {
        for (let c = 0; c < this.cols; c++) {
          this.grid[r * this.cols + c] = 1;
        }
      }
    }

    // Block normal desks (desk surface + chair row + padding)
    for (const d of CONFIG.DESKS) {
      this._markBlocked(
        d.x * 16 - 4 - PAD,        // desk drawn at tx*16-4, width 24
        d.y * 16 - PAD,             // desk top
        d.x * 16 + 20 + PAD,       // desk right edge
        (d.y + 2) * 16 + PAD       // chair row bottom
      );
    }

    // Block leader desk (wide, drawn at x=7*16+8=120, width 32)
    const ld = CONFIG.LEADER_DESK_POS;
    this._markBlocked(
      120 - PAD,                    // leader desk left edge
      ld.y * 16 - PAD,             // desk top
      152 + PAD,                    // leader desk right edge
      (ld.y + 2) * 16 + PAD        // chair row bottom
    );
  }

  _markBlocked(x1, y1, x2, y2) {
    const cs = this.cellSize;
    const c1 = Math.max(0, Math.floor(x1 / cs));
    const c2 = Math.min(this.cols - 1, Math.ceil(x2 / cs) - 1);
    const r1 = Math.max(0, Math.floor(y1 / cs));
    const r2 = Math.min(this.rows - 1, Math.ceil(y2 / cs) - 1);
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        this.grid[r * this.cols + c] = 1;
      }
    }
  }

  findPath(sx, sy, tx, ty) {
    const cs = this.cellSize;

    // Convert pixel coords to grid coords, clamped
    let sc = Math.max(0, Math.min(this.cols - 1, Math.floor(sx / cs)));
    let sr = Math.max(0, Math.min(this.rows - 1, Math.floor(sy / cs)));
    let tc = Math.max(0, Math.min(this.cols - 1, Math.floor(tx / cs)));
    let tr = Math.max(0, Math.min(this.rows - 1, Math.floor(ty / cs)));

    // If start or target is in a blocked cell, snap to nearest free cell
    if (this.grid[sr * this.cols + sc]) {
      const free = this._findNearestFree(sc, sr);
      if (free) { sc = free.c; sr = free.r; }
    }
    if (this.grid[tr * this.cols + tc]) {
      const free = this._findNearestFree(tc, tr);
      if (free) { tc = free.c; tr = free.r; }
    }

    // Same cell — go straight to target
    if (sc === tc && sr === tr) {
      return [{ x: tx, y: ty }];
    }

    // BFS on grid
    const size = this.cols * this.rows;
    const prev = new Int32Array(size).fill(-1);
    const visited = new Uint8Array(size);
    const queue = [];
    const startIdx = sr * this.cols + sc;
    const targetIdx = tr * this.cols + tc;

    visited[startIdx] = 1;
    queue.push(startIdx);

    const dc = [1, -1, 0, 0];
    const dr = [0, 0, 1, -1];
    let found = false;
    let head = 0;

    while (head < queue.length) {
      const idx = queue[head++];
      if (idx === targetIdx) { found = true; break; }

      const c = idx % this.cols;
      const r = (idx - c) / this.cols;

      for (let d = 0; d < 4; d++) {
        const nc = c + dc[d];
        const nr = r + dr[d];
        if (nc < 0 || nc >= this.cols || nr < 0 || nr >= this.rows) continue;
        const nIdx = nr * this.cols + nc;
        if (visited[nIdx] || this.grid[nIdx]) continue;
        visited[nIdx] = 1;
        prev[nIdx] = idx;
        queue.push(nIdx);
      }
    }

    if (!found) {
      return [{ x: tx, y: ty }];
    }

    // Reconstruct path as grid cell centers
    const path = [];
    let idx = targetIdx;
    while (idx !== startIdx) {
      const c = idx % this.cols;
      const r = (idx - c) / this.cols;
      path.push({ x: c * cs + cs / 2, y: r * cs + cs / 2 });
      idx = prev[idx];
    }
    path.reverse();

    // Replace last waypoint with exact target position
    path[path.length - 1] = { x: tx, y: ty };

    return this._simplifyPath(sx, sy, path);
  }

  _findNearestFree(c, r) {
    const visited = new Uint8Array(this.cols * this.rows);
    const queue = [];
    let head = 0;
    visited[r * this.cols + c] = 1;
    queue.push(r * this.cols + c);

    const dc = [1, -1, 0, 0];
    const dr = [0, 0, 1, -1];

    while (head < queue.length) {
      const idx = queue[head++];
      const cc = idx % this.cols;
      const rr = (idx - cc) / this.cols;
      if (!this.grid[idx]) return { c: cc, r: rr };

      for (let d = 0; d < 4; d++) {
        const nc = cc + dc[d];
        const nr = rr + dr[d];
        if (nc < 0 || nc >= this.cols || nr < 0 || nr >= this.rows) continue;
        const nIdx = nr * this.cols + nc;
        if (visited[nIdx]) continue;
        visited[nIdx] = 1;
        queue.push(nIdx);
      }
    }
    return null;
  }

  _simplifyPath(sx, sy, path) {
    if (path.length <= 1) return path;

    const result = [];
    let from = { x: sx, y: sy };
    let i = 0;

    while (i < path.length) {
      // Greedily skip to the farthest waypoint with clear line-of-sight
      let farthest = i;
      for (let j = i + 1; j < path.length; j++) {
        if (this._lineOfSight(from.x, from.y, path[j].x, path[j].y)) {
          farthest = j;
        }
      }
      result.push(path[farthest]);
      from = path[farthest];
      i = farthest + 1;
    }

    return result;
  }

  _lineOfSight(x1, y1, x2, y2) {
    const cs = this.cellSize;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(dist / 2); // sample every ~2px

    if (steps === 0) return true;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x1 + dx * t;
      const y = y1 + dy * t;
      const c = Math.floor(x / cs);
      const r = Math.floor(y / cs);
      if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) return false;
      if (this.grid[r * this.cols + c]) return false;
    }
    return true;
  }
}
