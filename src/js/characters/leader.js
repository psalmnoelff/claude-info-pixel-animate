// Team leader character - has glasses, can draw on whiteboard
class Leader extends Character {
  constructor() {
    super('leader', CONFIG.LEADER_START.x, CONFIG.LEADER_START.y);
    this.deskIndex = CONFIG.LEADER_DESK;
    this.setAnimation('leader_idle');
    this.isDrawing = false;
    this.drawTimer = 0;
  }

  // Walk to whiteboard and start drawing
  goToWhiteboard(whiteboard, callback) {
    this.isDrawing = false;
    this.moveTo(CONFIG.WHITEBOARD_POS, CONFIG.MOVE_SPEED, () => {
      this.state = 'drawing';
      this.setAnimation('leader_draw');
      this.isDrawing = true;
      this.drawTimer = 0;
      if (callback) callback();
    });
  }

  // Walk back to own desk and sit
  goToDesk(callback) {
    this.isDrawing = false;
    const sitPos = this.getSitPosition(this.deskIndex);
    this.moveTo(sitPos, CONFIG.MOVE_SPEED, () => {
      this.sitDown();
      if (callback) callback();
    });
  }

  update(dt, whiteboard) {
    super.update(dt);

    // Periodically add scribbles while drawing
    if (this.isDrawing && whiteboard) {
      this.drawTimer += dt;
      if (this.drawTimer > 0.5) {
        this.drawTimer = 0;
        whiteboard.addScribble();
      }
    }
  }
}
