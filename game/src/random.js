// CANTING: seeded random numbers (mulberry32).
// One seed drives a whole cloth, so a screenshot scene and a replay of the same
// seed always produce the same cloth, the same waves, and the same motifs.

export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick an integer in [min, max] from the seeded stream.
export function intInRange(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

// Pick one element of an array from the seeded stream.
export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

// Shuffle a copy of an array with the seeded stream (Fisher-Yates).
export function shuffle(rng, list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}
