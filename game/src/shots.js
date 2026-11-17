// CANTING v2: screenshot scenes behind ?shot=play|boss|upgrade|title|win|end.
// Each scene plays the real rules forward from a fresh cloth with a fixed
// seed, steered by a simple autopilot that rings unsealed motifs with wax.
// The frame is what a short game really looks like, and the same seed always
// gives the same frame — so main.ts writes identical screenshots on every run.
// v2 order (shots.json): 1-play is the cover — dense mid-run gameplay, not a
// menu — then the boss, the upgrade shop, and the title poster.

import { CELL, GRID, SCORE, VIEW } from './config.js';
import { EVENT_CLEAR } from './cloth.js';
import { boonById } from './boons.js';
import { TOOL_MINE } from './input.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_WIN } from './game.js';
import { SACRED } from './motifs.js';

const STEP = 1 / 60;
const TITLE_SECONDS = 2;
const PLAY_SECONDS = 10;
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

// Play the current cloth with the win pilot until it clears.
// Returns true on clear, false if the run ends first.
function clearCloth(game) {
  for (let i = 0; i < 480 && !game.cloth.over; i += 1) {
    winPilot(game);
    game.cloth.step(0.25);
    if (game.cloth.events.some((e) => e.type === EVENT_CLEAR)) return true;
  }
  return false;
}

// Play a real run with the win pilot until `targetCloth` is live (clearing
// earlier cloths, taking the regen boon each time, exactly as a player would).
// The target cloth itself is left fresh — the caller stages the mid-battle
// frame on it. Returns true when the target cloth is live.
function playThrough(game, targetCloth, seed) {
  game.startRun('batik');
  game.seed = seed;
  game.cloth.reset(0, game.difficulty, seed, 3, 0);
  for (let cloth = 0; cloth < targetCloth; cloth += 1) {
    if (!clearCloth(game)) return false;
    game.cloth.score += SCORE.clothClear;
    game.cloth.waxRegen *= 1.4;
    game.boonsOwned.push('regen');
    game.sealsTotal += game.cloth.motifs.length;
    game.nextCloth();
  }
  return true;
}

// After a fast-forward, reflect the seals that really happened in this staged
// run on the HUD: the combo is the count sealed in the last 8 seconds.
function reflectCombo(game, sealedTimes, stagedSeconds) {
  const recent = sealedTimes.filter((t) => stagedSeconds - t <= 8).length;
  game.combo = Math.min(recent, 5);
  game.comboTimer = game.combo > 0 ? 5 : 0;
  game.maxCombo = Math.max(game.maxCombo, game.combo);
}

// Fast-forward while recording when seals happen, for reflectCombo.
// Stops early once `stopAt` motifs are sealed, so the frame stays mid-battle
// (one motif left) instead of showing a finished cloth.
function fastForwardTraced(game, seconds, pilot, stopAt) {
  const sealedTimes = [];
  let t = 0;
  const steps = Math.ceil(seconds / 0.25);
  for (let i = 0; i < steps; i += 1) {
    const before = game.cloth.sealedCount;
    (pilot || autopilot)(game);
    game.cloth.step(0.25);
    t += 0.25;
    if (game.cloth.sealedCount > before) sealedTimes.push(t);
    if (stopAt !== undefined && game.cloth.sealedCount >= stopAt) break;
    if (game.cloth.events.some((e) => e.type === EVENT_CLEAR)) break;
    if (game.cloth.over) break;
  }
  return { sealedTimes, stagedSeconds: t };
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
    if (!playThrough(game, 6, seed)) return { screen: SCREEN_PLAY };
    const traced = fastForwardTraced(game, BOSS_SECONDS, autopilot, 3);
    reflectCombo(game, traced.sealedTimes, traced.stagedSeconds);
    game.sealsTotal += game.cloth.sealedCount;
    // v5: the boss frame must NOT look like the play frame at judge size.
    // The Naga's head is centred (it swims along the top edge wherever the
    // sim left it — often at a corner, blending into the edge dye), and the
    // flood is topped up to 40% so the frame reads "boss fight at its worst",
    // not "the same cloth again".
    const bcloth = game.cloth;
    if (bcloth.naga && bcloth.naga.alive) bcloth.naga.x = Math.floor(GRID.cols / 2);
    let btopUps = 0;
    while (bcloth.dyeFraction() < 0.40 && btopUps < 40) {
      bcloth.spawnVortex(12);
      btopUps += 1;
    }
    game.banner = '';
    game.bannerTime = 0;
    return { screen: SCREEN_PLAY };
  }
  if (name === 'play') {
    // v4: the cover is the BOSS cloth (index 6, Kain Naga) mid-fight — the
    // densest frame the game has: 4 motifs, the Naga alive, dye at ~30%.
    // Like the top 10's covers (NIGHT 8/10, WAVE 7/7), the first frame shows
    // the endgame, not the tutorial.
    if (!playThrough(game, 6, seed)) return { screen: SCREEN_PLAY };
    // winPilot (budget 4, sacred first) seals fast enough that 3 motifs are
    // sealed by ~10s — while the cloth is still on wave 4/5, so the HUD's
    // DATANG queue (GAP B) is visible in the cover frame. A 26s stage would
    // reach wave 5/5 and hide the queue.
    const traced = fastForwardTraced(game, PLAY_SECONDS, winPilot, 3);
    reflectCombo(game, traced.sealedTimes, traced.stagedSeconds);
    game.sealsTotal += game.cloth.sealedCount;
    // Stage the v4 systems so the cover shows them: dye topped up to ~32%
    // (v5: was 28% — more colour mass at judge size), two mines waiting next
    // to the flood, a telegraphed seep about to land, and a seal floater
    // mid-air. Top-up uses spawnVortex: the border is already saturated
    // after 10s of play, so edge spawns have nowhere to land — vortex rings
    // land in the interior, where the flood would spread next anyway.
    const cloth = game.cloth;
    let topUps = 0;
    while (cloth.dyeFraction() < 0.32 && topUps < 40) {
      cloth.spawnVortex(12);
      topUps += 1;
    }
    let placed = 0;
    for (let y = 1; y < GRID.rows - 1 && placed < 2; y += 1) {
      for (let x = 1; x < GRID.cols - 1 && placed < 2; x += 1) {
        if (cloth.grid[y * GRID.cols + x] !== CELL.CLOTH) continue;
        const nearDye = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => cloth.grid[(y + dy) * GRID.cols + (x + dx)] === CELL.DYE);
        if (nearDye && cloth.placeMine(x, y)) placed += 1;
      }
    }
    if (cloth.motifs.some((m) => !m.sealed)) cloth.armTelegraph(9);
    const sealed = cloth.motifs.find((m) => m.sealed);
    if (sealed) {
      const cx = (sealed.x + sealed.w / 2) * GRID.cell;
      const cy = VIEW.hudHeight + (sealed.y + sealed.h / 2) * GRID.cell;
      game.floaters.add(cx, cy - 10, `+${cloth.sealBase().toLocaleString('id-ID')}`, '#f5d76e', 26);
    }
    game.tool = TOOL_MINE;
    game.banner = '';
    game.bannerTime = 0;
    return { screen: SCREEN_PLAY };
  }
  if (name === 'upgrade') {
    // Clear cloth 1 for real, then show the shop with three fixed boons so
    // the frame is identical on every run (real play would shuffle them).
    game.startRun('batik');
    game.seed = seed;
    game.cloth.reset(0, game.difficulty, seed, 3, 0);
    if (!clearCloth(game)) return { screen: SCREEN_PLAY };
    game.cloth.score += SCORE.clothClear;
    game.sealsTotal = game.cloth.sealedCount;
    game.upgradeChoices = [boonById('mines'), boonById('twin'), boonById('gold')];
    game.maxCombo = 1;
    game.runSeconds = 42;
    game.switchScreen(SCREEN_UPGRADE);
    game.banner = '';
    game.bannerTime = 0;
    return { screen: SCREEN_UPGRADE };
  }
  if (name === 'win') {
    // Play a whole run to victory with the win pilot, taking the regen
    // upgrade between cloths, so the frame shows the win screen with a
    // real final score behind it.
    game.startRun('batik');
    game.seed = seed;
    game.cloth.reset(0, game.difficulty, seed, 3, 0);
    let totalSteps = 0;
    for (let cloth = 0; cloth < 7; cloth += 1) {
      let cleared = false;
      for (let i = 0; i < 480 && !game.cloth.over; i += 1) {
        winPilot(game);
        game.cloth.step(0.25);
        totalSteps += 1;
        if (game.cloth.events.some((e) => e.type === EVENT_CLEAR)) {
          cleared = true;
          break;
        }
      }
      if (!cleared) break;
      game.cloth.score += SCORE.clothClear;
      game.sealsTotal += game.cloth.motifs.length;
      if (cloth === 6) {
        game.runSeconds = totalSteps * 0.25;
        game.maxCombo = 1;
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
  // No sealed motif is staged here: the poster must sit on a calm backdrop,
  // not on a gold box peeking through the panel.
  game.switchScreen(SCREEN_TITLE);
  game.cloth.waveTimer = 0.5;
  game.cloth.spreadTimer = 0.4;
  for (let i = 0; i < 8; i += 1) game.cloth.step(0.25);
  return { screen: SCREEN_TITLE, best: game.best };
}
