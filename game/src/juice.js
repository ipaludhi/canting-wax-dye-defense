// CANTING v3: juice — every feel constant and every presentation-only
// effect in one place. Distilled from the rune juice catalog (EijunnN/rune)
// and the phaser game-design skill (dongquoctien/phaser), both read on
// GitHub before this iteration. The architecture rule from those sources:
// juice reads game events and moves ONLY presentation. Gameplay state never
// depends on juice, so tuning it cannot break logic, balance, or replays.

export const JUICE = {
  traumaDecayPerSecond: 1.8,
  traumaSeal: 0.15,
  traumaBoss: 0.3,
  traumaLife: 0.6,
  shakeMaxOffset: 9, // px at 960 wide
  shakeMaxAngle: 0.02, // radians, about 1.1 degrees
  hitstopSealSeconds: 0.04,
  sealPopSeconds: 0.15,
  sealPopScale: 0.15,
};

// Nothing animates linearly: easeOutQuad for entrances, easeOutBack for pops.
export function easeOutQuad(x) {
  return 1 - (1 - x) * (1 - x);
}

export function easeOutBack(x) {
  return 1 + 2.7 * (x - 1) ** 3 + 1.7 * (x - 1) ** 2;
}

// Smooth noise from layered sines — no teleport-jitter like Math.random.
function noise1D(t) {
  return (Math.sin(t * 1.7) + Math.sin(t * 3.1 + 1.3) + Math.sin(t * 5.3 + 4.1)) / 3;
}

// Trauma-model shake: trauma accumulates across rapid events and decays
// smoothly; squaring it makes small hits whisper and big ones roar.
export class Juice {
  constructor() {
    this.trauma = 0;
    this.hitstopT = 0;
  }

  addTrauma(amount) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  // Freeze the world (not the camera, UI or juice) for `seconds`.
  hitstop(seconds) {
    this.hitstopT = Math.max(this.hitstopT, seconds);
  }

  update(dt) {
    this.trauma = Math.max(0, this.trauma - JUICE.traumaDecayPerSecond * dt);
    if (this.hitstopT > 0) this.hitstopT -= dt;
  }

  // Camera offset + rotation for this frame. Apply in the camera transform
  // only — never to entity positions.
  offset(time) {
    const shake = this.trauma * this.trauma;
    if (shake <= 0) return { x: 0, y: 0, angle: 0 };
    return {
      x: shake * JUICE.shakeMaxOffset * noise1D(time * 25),
      y: shake * JUICE.shakeMaxOffset * noise1D(time * 25 + 99),
      angle: shake * JUICE.shakeMaxAngle * noise1D(time * 25 + 199),
    };
  }
}
