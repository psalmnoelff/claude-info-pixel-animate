// Particle effects: ZZZ bubbles, sparkles
class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  // Spawn ZZZ sleep particles above a position
  spawnZZZ(x, y) {
    const chars = ['Z', 'Z', 'Z'];
    for (let i = 0; i < chars.length; i++) {
      this.particles.push({
        type: 'zzz',
        x: x + 2 + i * 3,
        y: y - 4 - i * 4,
        char: chars[i],
        life: 2.0 + i * 0.5,
        maxLife: 2.0 + i * 0.5,
        vx: 0.2,
        vy: -3,
        color: CONFIG.COL.LIGHT_GREY,
        delay: i * 0.6,
        size: 1 - i * 0.2,
      });
    }
  }

  // Spawn muzzle flash particles (for gun shot effect)
  spawnMuzzleFlash(x, y) {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 40;
      this.particles.push({
        type: 'sparkle',
        x: x,
        y: y,
        life: 0.1 + Math.random() * 0.15,
        maxLife: 0.25,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: Math.random() > 0.5 ? CONFIG.COL.YELLOW : CONFIG.COL.ORANGE,
      });
    }
  }

  // Spawn sparkle particles (for coding/typing effects)
  spawnSparkle(x, y, color) {
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        type: 'sparkle',
        x: x + Math.random() * 8 - 4,
        y: y + Math.random() * 4 - 2,
        life: 0.3 + Math.random() * 0.4,
        maxLife: 0.7,
        vx: (Math.random() - 0.5) * 10,
        vy: -Math.random() * 15,
        color: color || CONFIG.COL.YELLOW,
      });
    }
  }

  // Spawn a sweat drop near leader's head
  spawnSweat(x, y) {
    this.particles.push({
      type: 'sweat',
      x: x,
      y: y,
      life: 0.6,
      maxLife: 0.6,
      vx: (Math.random() - 0.5) * 8,
      vy: 15 + Math.random() * 10,
      color: CONFIG.COL.BLUE,
    });
  }

  // Spawn confetti burst (for git commits)
  spawnConfetti(x, y) {
    const colors = [CONFIG.COL.GREEN, CONFIG.COL.YELLOW, CONFIG.COL.WHITE, CONFIG.COL.BLUE, CONFIG.COL.PINK];
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 25 + Math.random() * 50;
      this.particles.push({
        type: 'confetti',
        x: x + Math.random() * 8 - 4,
        y: y + Math.random() * 8 - 4,
        life: 1.2 + Math.random() * 1.0,
        maxLife: 2.2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 35,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  // Spawn a snow particle falling from the ceiling
  spawnSnow(intensity) {
    const x = Math.random() * CONFIG.WIDTH;
    const y = -2;
    const colors = [CONFIG.COL.WHITE, CONFIG.COL.LIGHT_GREY, CONFIG.COL.WHITE];
    this.particles.push({
      type: 'snow',
      x: x,
      y: y,
      life: 8 + Math.random() * 4,
      maxLife: 12,
      vx: (Math.random() - 0.5) * 15 * intensity,
      vy: 12 + Math.random() * 20 * intensity,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (p.delay && p.delay > 0) {
        p.delay -= dt;
        continue;
      }

      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      if (p.type === 'zzz') {
        // Gentle float upward with wobble
        p.x += Math.sin(p.life * 3) * 0.3;
        p.y -= dt * 6;
      } else if (p.type === 'snow') {
        // Drift down with horizontal wobble
        p.x += p.vx * dt + Math.sin(p.life * 2) * 0.5;
        p.y += p.vy * dt;
        // Kill when below floor
        if (p.y > CONFIG.HEIGHT - 32) p.life = 0;
      } else if (p.type === 'confetti') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 40 * dt; // gravity
        p.vx *= 0.99; // air resistance
      } else if (p.type === 'sweat') {
        // Fall with slight gravity
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 30 * dt;
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 20 * dt; // gravity
      }
    }
  }

  draw(renderer) {
    for (const p of this.particles) {
      if (p.delay && p.delay > 0) continue;

      const alpha = Math.min(1, p.life / (p.maxLife * 0.3));
      if (alpha <= 0) continue;

      if (p.type === 'zzz') {
        // Draw Z character
        PixelFont.draw(renderer, p.char, p.x, p.y, p.color);
      } else if (p.type === 'snow') {
        // Snow flake (1-2px)
        const px = Math.floor(p.x);
        const py = Math.floor(p.y);
        renderer.pixel(px, py, p.color);
        if (Math.random() > 0.5) renderer.pixel(px + 1, py, p.color);
      } else if (p.type === 'sweat') {
        // Sweat drop (2px teardrop shape)
        const px = Math.floor(p.x);
        const py = Math.floor(p.y);
        renderer.pixel(px, py, CONFIG.COL.BLUE);
        renderer.pixel(px, py + 1, CONFIG.COL.BLUE);
        renderer.pixel(px, py - 1, CONFIG.COL.WHITE);
      } else if (p.type === 'confetti') {
        // Draw confetti as 2px square
        const px = Math.floor(p.x);
        const py = Math.floor(p.y);
        renderer.pixel(px, py, p.color);
        renderer.pixel(px + 1, py, p.color);
      } else {
        // Draw sparkle pixel
        renderer.pixel(Math.floor(p.x), Math.floor(p.y), p.color);
      }
    }
  }

  clear() {
    this.particles = [];
  }
}
