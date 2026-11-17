// CANTING: screenshot scenes behind ?shot=title|play|boss|end.
// Each scene plays the real rules forward from a fresh cloth with a fixed
// seed, steered by a simple autopilot that rings unsealed motifs with wax.
// The frame is what a short game really looks like, and the same seed always
// gives the same frame — so main.ts writes identical screenshots on every run.

import { CELL, GRID } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './game.js';

const STEP = 1 / 60;
const TITLE_SECONDS = 2;
const PLAY_SECONDS = 18;
const BOSS_SECONDS = 22;
const END_SECONDS = 240;

// Paint a few wax cells on the ring just outside a motif's box.
function ringMotif(game, motif, budget) {
  const cloth = game.cloth;
  let painted = 0;
  const ring = [];
  for (let x = motif.x - 1; x <= motif.x + motif.w; x += 1) {
    ring.push({ x, y: motif.y - 1 });
    ring.push({ x, y: motif.y + motif.h });
  }
  for (let y = motif.y; y < motif.y + motif.h; y += 1) {
    ring.push({ x: motif.x - 1, y });
    ring.push({ x: motif.x + motif.w, y });
  }
  for (let i = 0; i < ring.length && painted < budget; i += 1) {
    const cell = ring[i];
    if (cell.x < 0 || cell.y < 0 || cell.x >= GRID.cols || cell.y >= GRID.rows) continue;
    const kind = cloth.grid[cell.y * GRID.cols + cell.x];
    if (kind !== CELL.CLOTH && kind !== CELL.DYE) continue;
    painted += cloth.paintWax(cell.x, cell.y);
  }
  return painted;
}

// The autopilot: each tick, ring the first unsealed motif with wax.
function autopilot(game) {
  const motif = game.cloth.motifs.find((m) => !m.sealed);
  if (!motif) return;
  ringMotif(game, motif, 2);
}

// Step the cloth forward in big chunks (dt up to 0.25s) to stage a scene fast.
function fastForward(game, seconds) {
  const steps = Math.ceil(seconds / 0.25);
  for (let i = 0; i < steps; i += 1) {
    autopilot(game);
    game.cloth.step(0.25);
    if (game.cloth.over) break;
  }
}

/**
 * Set `game` to the named scene and return the screen to draw.
 * The game must already exist; this stages it from a fresh run with the
 * given seed so every screenshot is reproducible. The banner is cleared
 * after staging so it never covers the sacred motif in the frame.
 */
export function stageShot(name, game, seed) {
  game.seed = seed;
  if (name === 'boss') {
    game.startRun('batik');
    game.cloth.reset(6, game.difficulty, seed, 3, 0);
    fastForward(game, BOSS_SECONDS);
    game.banner = '';
    game.bannerTime = 0;
    return { screen: SCREEN_PLAY };
  }
  if (name === 'play') {
    game.startRun('batik');
    fastForward(game, PLAY_SECONDS);
    game.banner = '';
    game.bannerTime = 0;
    return { screen: SCREEN_PLAY };
  }
  if (name === 'end') {
    game.startRun('mahir');
    // No autopilot: the dye floods the cloth until the run ends.
    const steps = Math.ceil(END_SECONDS / 0.25);
    for (let i = 0; i < steps; i += 1) {
      game.cloth.step(0.25);
      if (game.cloth.over) break;
    }
    game.cloth.lives = 0;
    game.cloth.over = true;
    game.switchScreen(SCREEN_OVER);
    game.banner = '';
    game.bannerTime = 0;
    return { screen: SCREEN_OVER };
  }
  // Title: the demo cloth behind the menu, stepped a little so dye shows.
  game.switchScreen(SCREEN_TITLE);
  game.cloth.waveTimer = 0.5;
  game.cloth.spreadTimer = 0.4;
  for (let i = 0; i < 8; i += 1) game.cloth.step(0.25);
  return { screen: SCREEN_TITLE, best: game.best };
}
