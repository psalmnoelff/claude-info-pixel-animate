// Per-character animation frame cycling
class Animator {
  constructor() {
    this.currentAnim = null;
    this.animDef = null;
    this.frameIndex = 0;
    this.frameTimer = 0;
    this.currentFrame = null;
  }

  play(animName) {
    if (this.currentAnim === animName) return;

    const def = ANIMATIONS[animName];
    if (!def) return;

    this.currentAnim = animName;
    this.animDef = def;
    this.frameIndex = 0;
    this.frameTimer = 0;
    this.currentFrame = def.frames[0];
  }

  update(dt) {
    if (!this.animDef) return;

    this.frameTimer += dt;
    const frameDuration = 1 / this.animDef.fps;

    if (this.frameTimer >= frameDuration) {
      this.frameTimer -= frameDuration;
      this.frameIndex = (this.frameIndex + 1) % this.animDef.frames.length;
      this.currentFrame = this.animDef.frames[this.frameIndex];
    }
  }

  getCurrentSprite() {
    return this.currentFrame;
  }
}
