// Linear interpolation tween for smooth movement
class Tween {
  constructor(from, to, speed) {
    this.fromX = from.x;
    this.fromY = from.y;
    this.toX = to.x;
    this.toY = to.y;
    this.speed = speed || CONFIG.MOVE_SPEED;

    const dx = this.toX - this.fromX;
    const dy = this.toY - this.fromY;
    this.distance = Math.sqrt(dx * dx + dy * dy);
    this.duration = this.distance / this.speed;

    this.elapsed = 0;
    this.done = this.distance < 0.5;
    this.currentX = this.fromX;
    this.currentY = this.fromY;
  }

  update(dt) {
    if (this.done) return;

    this.elapsed += dt;
    let t = this.duration > 0 ? this.elapsed / this.duration : 1;
    if (t >= 1) {
      t = 1;
      this.done = true;
    }

    this.currentX = this.fromX + (this.toX - this.fromX) * t;
    this.currentY = this.fromY + (this.toY - this.fromY) * t;
  }

  // Get the direction of movement (for selecting walk animation)
  getDirection() {
    const dx = this.toX - this.fromX;
    const dy = this.toY - this.fromY;

    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  }
}

// Queue of tweens for multi-waypoint paths
class TweenPath {
  constructor(waypoints, speed) {
    this.waypoints = waypoints;
    this.speed = speed || CONFIG.MOVE_SPEED;
    this.currentTween = null;
    this.waypointIndex = 0;
    this.done = false;

    if (waypoints.length < 2) {
      this.done = true;
      return;
    }

    this._nextTween();
  }

  _nextTween() {
    if (this.waypointIndex >= this.waypoints.length - 1) {
      this.done = true;
      return;
    }

    this.currentTween = new Tween(
      this.waypoints[this.waypointIndex],
      this.waypoints[this.waypointIndex + 1],
      this.speed
    );
    this.waypointIndex++;
  }

  update(dt) {
    if (this.done) return;

    this.currentTween.update(dt);
    if (this.currentTween.done) {
      this._nextTween();
    }
  }

  get currentX() {
    return this.currentTween ? this.currentTween.currentX : this.waypoints[0].x;
  }

  get currentY() {
    return this.currentTween ? this.currentTween.currentY : this.waypoints[0].y;
  }

  getDirection() {
    return this.currentTween ? this.currentTween.getDirection() : 'down';
  }
}
