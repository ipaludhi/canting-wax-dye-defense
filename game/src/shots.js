// CANTING: screenshot scenes behind ?shot=title|play|boss|end.
// Each scene plays the real rules forward from a fresh cloth with a fixed
// seed, steered by a simple autopilot that rings unsealed motifs with wax.
// The frame is what a short game really looks like, and the same seed always
// gives the same frame — so main.ts writes identical screenshots on every run.

import { CELL, GRID, SCORE } from './config.js';
import { EVENT_CLEAR } from './cloth.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './game.js';
import { SACRED } from './motifs.js';

const STEP = 1 / 60;
const TITLE_SECONDS = 2;
const PLAY_SECONDS = 18;
const BOSS_SECONDS = 22;
const END_SECONDS = 240;

// Paint a few wax cells on the ring just outside a box (a motif or the
// sacred centre). Wax may cover dye at double cost, so a ring can always
// be closed.
function ringBox(cloth, box, budget) {
  let painted = 0;
  const ring = [];
  for (let x = box.x - 1; x <= box.x + box.w; x += 1) {
    ring.push({ x, y: box.y - 1 });
    ring.push({ x, y: box.y + box.h });
  }
  for (let y = box.y; y < box.y + box.h; y += 1) {
    ring.push({ x: box.x - 1, y });
    ring.push({ x: box.x + box.w, y });
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

function ringMotif(game, motif, budget) {
  return ringBox(game.cloth, motif, budget);
}

// True when every in-bounds cell of the ring around a box is wax.
function ringComplete(cloth, box) {
  for (let x = box.x - 1; x <= box.x + box.w; x += 1) {
    for (const y of [box.y - 1, box.y + box.h]) {
      if (x < 0 || y < 0 || x >= GRID.cols || y >= GRID.rows) continue;
      if (cloth.grid[y * GRID.cols + x] !== CELL.WAX) return false;
    }
  }
  for (let y = box.y; y < box.y + box.h; y += 1) {
    for (const x of [box.x - 1, box.x + box.w]) {
      if (x < 0 || y < 0 || x >= GRID.cols || y >= GRID.rows) continue;
      if (cloth.grid[y * GRID.cols + x] !== CELL.WAX) return false;
    }
  }
  return true;
}

// True when the ring around a box can still be closed: every ring cell is
// wax or plain cloth, never dye. Once dye stains the line, a player would
// draw further out instead of getting stuck.
function ringPossible(cloth, box) {
  for (let x = box.x - 1; x <= box.x + box.w; x += 1) {
    for (const y of [box.y - 1, box.y + box.h]) {
      if (x < 0 || y < 0 || x >= GRID.cols || y >= GRID.rows) continue;
      const cell = cloth.grid[y * GRID.cols + x];
      if (cell !== CELL.WAX && cell !== CELL.CLOTH) return false;
    }
  }
  for (let y = box.y; y < box.y + box.h; y += 1) {
    for (const x of [box.x - 1, box.x + box.w]) {
      if (x < 0 || y < 0 || x >= GRID.cols || y >= GRID.rows) continue;
      const cell = cloth.grid[y * GRID.cols + x];
      if (cell !== CELL.WAX && cell !== CELL.CLOTH) return false;
    }
  }
  return true;
}

// The autopilot: each tick, ring the first unsealed motif with wax.
function autopilot(game) {
  const motif = game.cloth.motifs.find((m) => !m.sealed);
  if (!motif) return;
  ringMotif(game, motif, 2);
}

// The win pilot: ring the sacred centre first, then the motifs, and freeze
// when the flood gets bad — the way a careful player plays.
function winPilot(game) {
  const cloth = game.cloth;
  if (!ringComplete(cloth, SACRED) && ringPossible(cloth, SACRED)) {
    ringBox(cloth, SACRED, 4);
  } else {
    const motif = cloth.motifs.find((m) => !m.sealed);
    if (motif) ringMotif(game, motif, 4);
  }
  if (cloth.dyeFraction() > 0.35) cloth.freeze();
}

// Step the cloth forward in big chunks (dt up to 0.25s) to stage a scene fast.
function fastForward(game, seconds, pilot) {
  const steps = Math.ceil(seconds / 0.25);
  for (let i = 0; i < steps; i += 1) {
    (pilot || autopilot)(game);
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
  if (name === 'win') {
    // Play a whole run to victory with the win pilot, taking the regen
    // upgrade between cloths, so the frame shows the win screen with a
    // real final score behind it.
    game.startRun('batik');
    game.seed = seed;
    game.cloth.reset(0, game.difficulty, seed, 3, 0);
    for (let cloth = 0; cloth < 7; cloth += 1) {
      let cleared = false;
      for (let i = 0; i < 480 && !game.cloth.over; i += 1) {
        winPilot(game);
        game.cloth.step(0.25);
        if (game.cloth.events.some((e) => e.type === EVENT_CLEAR)) {
          cleared = true;
          break;
        }
      }
      if (!cleared) break;
      game.cloth.score += SCORE.clothClear;
      if (cloth === 6) {
        game.finishWin();
      } else {
        game.cloth.waxRegen *= 1.4;
        game.nextCloth();
      }
    }
    game.banner = '';
    game.bannerTime = 0;
    return { screen: SCREEN_WIN };
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
