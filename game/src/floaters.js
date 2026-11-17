// CANTING v2: floating score text — the "+1.500" and "KOMBO x3!" labels
// that rise and fade over the cloth. A fixed pool, nothing allocated in
// the hot path; the game adds a floater on seals, clears and lost lives.

export class Floaters {
  constructor(capacity) {
    this.capacity = capacity;
    this.items = [];
    for (let i = 0; i < capacity; i += 1) {
      this.items.push({ alive: false, x: 0, y: 0, text: '', color: '#ffffff', life: 0, maxLife: 1, size: 16 });
    }
  }

  add(x, y, text, color, size) {
    for (let i = 0; i < this.capacity; i += 1) {
      const p = this.items[i];
      if (p.alive) continue;
      p.alive = true;
      p.x = x;
      p.y = y;
      p.text = text;
      p.color = color || '#f5d76e';
      p.life = 1.4;
      p.maxLife = 1.4;
      p.size = size || 18;
      return;
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
      p.y -= 34 * dt;
    }
  }

  render(ctx) {
    ctx.textAlign = 'center';
    for (let i = 0; i < this.capacity; i += 1) {
      const p = this.items[i];
      if (!p.alive) continue;
      ctx.globalAlpha = Math.min(1, (p.life / p.maxLife) * 1.6);
      ctx.font = `bold ${p.size}px sans-serif`;
      ctx.fillStyle = '#101736';
      ctx.fillText(p.text, p.x + 2, p.y + 2);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }
}
