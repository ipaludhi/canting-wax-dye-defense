// CANTING: particles.
// A fixed pool of particles — nothing is allocated while the game runs.
// Bursts mark sealed motifs, splashes mark dye. Screen shake lives in
// juice.js now (trauma model); this file only owns the sparks.

export class Particles {
  constructor(capacity) {
    this.capacity = capacity;
    this.items = [];
    for (let i = 0; i < capacity; i += 1) {
      this.items.push({ alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#ffffff' });
    }
  }

  spawn(x, y, vx, vy, life, size, color) {
    for (let i = 0; i < this.capacity; i += 1) {
      const p = this.items[i];
      if (p.alive) continue;
      p.alive = true;
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.life = life;
      p.maxLife = life;
      p.size = size;
      p.color = color;
      return;
    }
  }

  // A ring of golden sparks at a sealed motif.
  burst(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 40 + Math.random() * 90;
      this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 0.5 + Math.random() * 0.4, 2 + Math.random() * 3, color);
    }
  }

  // A small splash where dye first lands.
  splash(x, y, color) {
    for (let i = 0; i < 6; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 50;
      this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 0.3 + Math.random() * 0.3, 2, color);
    }
  }

  update(dt) {
    for (let i = 0; i < this.capacity; i += 1) {
      const p = this.items[i];
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
    }
  }

  render(ctx) {
    for (let i = 0; i < this.capacity; i += 1) {
      const p = this.items[i];
      if (!p.alive) continue;
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
}
