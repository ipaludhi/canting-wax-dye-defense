// CANTING: motifs — the shapes the player must seal with wax.
// A motif is a patch of cells on the cloth. It is sealed when wax closes every
// path dye could take into it. Motifs are placed by the seeded RNG, never
// overlapping the sacred centre or each other, so every cloth is fair.

import { GRID } from './config.js';
import { intInRange } from './random.js';

// The sacred motif in the middle of the cloth. Dye touching it costs a life.
export const SACRED = { x: 21, y: 11, w: 6, h: 6 };

// Motif shapes: a rectangle, a ring (hollow square), and a cross.
function rectCells(rng, w, h) {
  const cells = [];
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) cells.push({ dx: x, dy: y });
  }
  return cells;
}

function ringCells(rng, w, h) {
  const cells = [];
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) cells.push({ dx: x, dy: y });
    }
  }
  return cells;
}

function crossCells(rng, w, h) {
  const cells = [];
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);
  for (let x = 0; x < w; x += 1) cells.push({ dx: x, dy: cy });
  for (let y = 0; y < h; y += 1) cells.push({ dx: cx, dy: y });
  return cells;
}

const SHAPES = [rectCells, ringCells, crossCells];

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Place `count` motifs on the cloth. Returns motif objects with absolute cells.
export function placeMotifs(rng, count) {
  const placed = [];
  const taken = [{ ...SACRED }];
  let tries = 0;
  while (placed.length < count && tries < 400) {
    tries += 1;
    const w = intInRange(rng, 7, 10);
    const h = intInRange(rng, 5, 7);
    const x = intInRange(rng, 2, GRID.cols - w - 2);
    const y = intInRange(rng, 2, GRID.rows - h - 2);
    const box = { x, y, w, h };
    if (taken.some((other) => overlaps(box, other))) continue;
    taken.push(box);
    const shape = SHAPES[Math.floor(rng() * SHAPES.length)];
    const cells = shape(rng, w, h).map((c) => ({ x: x + c.dx, y: y + c.dy }));
    placed.push({
      id: placed.length,
      x,
      y,
      w,
      h,
      cells,
      sealed: false,
      color: ['#e74c3c', '#9b59b6', '#1abc9c', '#e67e22'][placed.length % 4],
    });
  }
  return placed;
}

// The boss of cloth 7: Naga Pewarna, a serpent that patrols the top edge and
// spits heavy dye. It is drawn as a chain of segments; its head cell is where
// the next spit lands.
export function makeNaga() {
  return {
    segments: 9,
    x: 24,
    y: 1,
    dir: 1,
    speed: 6,
    spitTimer: 3,
    spitInterval: 5,
    alive: true,
  };
}
