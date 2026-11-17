// CANTING: the cloth — the grid where wax, dye, motifs and the boss live.
// Dye spreads cell by cell from the border. A motif is sealed when wax closes
// every path from the border to it: a flood fill from the border through
// non-wax cells marks what dye can still reach, and a motif none of whose
// cells is reached is sealed. The same fill also tells the game when the
// sacred centre is threatened and how much of the cloth is dyed.

import { CELL, CLOTHS, DIFFICULTIES, DYE_LIMIT, FREEZE, GRID, SCORE, WAX } from './config.js';
import { WAVE_KINDS, kindFor } from './waves.js';
import { makeRng, intInRange } from './random.js';
import { placeMotifs, makeNaga, SACRED } from './motifs.js';

export const EVENT_NONE = 0;
export const EVENT_SEALED = 1;
export const EVENT_LIFE = 2;
export const EVENT_WAVE = 4;
export const EVENT_CLEAR = 8;
export const EVENT_BOSS = 16;

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export class Cloth {
  constructor() {
    this.grid = new Uint8Array(GRID.cols * GRID.rows);
    // The wave that dyed each cell (0..3): the flood keeps one colour per
    // wave, so it reads as coherent blobs, not confetti.
    this.dyeColor = new Uint8Array(GRID.cols * GRID.rows);
    this.rng = makeRng(1);
    this.motifs = [];
    this.motifCells = new Set();
    this.naga = null;
    this.wax = WAX.max;
    this.waxMax = WAX.max;
    this.waxRegen = WAX.regenPerSecond;
    this.brush = 0;
    this.lives = 3;
    this.score = 0;
    this.clothIndex = 0;
    this.difficulty = DIFFICULTIES.batik;
    this.wave = 0;
    this.wavesTotal = 0;
    this.waveKind = 0;
    this.waveTimer = 0;
    this.spreadTimer = 0;
    this.freezeTimer = 0;
    this.freezeCooldown = 0;
    this.freezeExtra = 0;
    this.invulnerable = 0;
    this.dyeCount = 0;
    this.events = [];
    this.sealedCount = 0;
    this.over = false;
    this.scoreMul = 1;
    // A telegraphed seep: { cells, timer, size } — the warning markers the
    // player sees for 2 seconds before dye lands inside the cloth.
    this.telegraph = null;
  }

  index(x, y) {
    return y * GRID.cols + x;
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < GRID.cols && y < GRID.rows;
  }

  // Build a fresh cloth for the given level, difficulty and seed.
  reset(clothIndex, difficulty, seed, lives, score) {
    const spec = CLOTHS[clothIndex];
    this.grid.fill(CELL.CLOTH);
    this.dyeColor.fill(0);
    this.rng = makeRng(seed + clothIndex * 7919);
    this.clothIndex = clothIndex;
    this.difficulty = difficulty;
    this.motifs = placeMotifs(this.rng, spec.motifs);
    // Motif cells resist dye: the pattern itself never stains, so a motif
    // can always still be sealed. The threat is the flood and the sacred
    // centre, not a motif stained before its ring closes.
    this.motifCells = new Set();
    for (let i = 0; i < this.motifs.length; i += 1) {
      for (let c = 0; c < this.motifs[i].cells.length; c += 1) {
        this.motifCells.add(this.index(this.motifs[i].cells[c].x, this.motifs[i].cells[c].y));
      }
    }
    this.naga = spec.boss ? makeNaga() : null;
    // Refill wax to the (possibly upgraded) capacity. Upgrades live on the
    // cloth across levels; only a fresh run clears them (resetUpgrades).
    this.wax = this.waxMax;
    this.lives = lives;
    this.score = score;
    this.wave = 0;
    this.wavesTotal = spec.waves;
    this.waveKind = 0;
    this.waveTimer = 1.5;
    this.spreadTimer = spec.spreadSeconds * difficulty.spreadMul;
    this.freezeTimer = 0;
    this.freezeCooldown = 0;
    this.invulnerable = 0;
    this.dyeCount = 0;
    this.events = [];
    this.sealedCount = 0;
    this.over = false;
    this.telegraph = null;
  }

  // Clear all upgrades (fresh run). Called once per run, never between cloths.
  // The difficulty's wax factor applies to the base capacity here, once.
  resetUpgrades(difficulty = DIFFICULTIES.batik) {
    this.brush = 0;
    this.waxMax = Math.round(WAX.max * difficulty.waxMul);
    this.waxRegen = WAX.regenPerSecond;
    this.freezeExtra = 0;
    this.scoreMul = 1;
    this.wax = this.waxMax;
  }

  // The base score of one seal on this cloth, before the combo multiplier.
  sealBase() {
    return SCORE.motif * (this.clothIndex + 1) * this.scoreMul;
  }

  // Flood fill from the border through every cell that is not wax.
  // Returns a Uint8Array marking the cells dye can still reach.
  reachable() {
    const seen = new Uint8Array(GRID.cols * GRID.rows);
    const queue = [];
    for (let x = 0; x < GRID.cols; x += 1) {
      queue.push(this.index(x, 0), this.index(x, GRID.rows - 1));
    }
    for (let y = 0; y < GRID.rows; y += 1) {
      queue.push(this.index(0, y), this.index(GRID.cols - 1, y));
    }
    while (queue.length > 0) {
      const at = queue.pop();
      if (seen[at]) continue;
      if (this.grid[at] === CELL.WAX) continue;
      seen[at] = 1;
      const x = at % GRID.cols;
      const y = Math.floor(at / GRID.cols);
      for (let d = 0; d < 4; d += 1) {
        const nx = x + DIRS[d][0];
        const ny = y + DIRS[d][1];
        if (this.inBounds(nx, ny)) queue.push(this.index(nx, ny));
      }
    }
    return seen;
  }

  // After wax or dye changes, seal every motif dye can no longer reach.
  checkSeals() {
    const reach = this.reachable();
    for (let i = 0; i < this.motifs.length; i += 1) {
      const motif = this.motifs[i];
      if (motif.sealed) continue;
      let open = false;
      for (let c = 0; c < motif.cells.length; c += 1) {
        if (reach[this.index(motif.cells[c].x, motif.cells[c].y)]) {
          open = true;
          break;
        }
      }
      if (!open) {
        motif.sealed = true;
        this.sealedCount += 1;
        this.score += this.sealBase();
        this.events.push({ type: EVENT_SEALED, motif });
      }
    }
    if (this.sealedCount === this.motifs.length) {
      this.events.push({ type: EVENT_CLEAR, cloth: this.clothIndex });
    }
  }

  // Paint wax at a cell (and its brush neighbours) if the meter affords it.
  // Wax also covers dye: hot wax seals a stain shut, at double cost, and
  // the covered dye leaves the dye count. So a ring can always be closed —
  // no stained cell can ever soft-lock a motif.
  paintWax(cx, cy) {
    let painted = 0;
    for (let y = cy - this.brush; y <= cy + this.brush; y += 1) {
      for (let x = cx - this.brush; x <= cx + this.brush; x += 1) {
        if (!this.inBounds(x, y)) continue;
        const at = this.index(x, y);
        const kind = this.grid[at];
        let cost = 0;
        if (kind === CELL.CLOTH) cost = WAX.costPerCell;
        else if (kind === CELL.DYE) cost = WAX.costPerCell * 2;
        else continue;
        if (this.wax < cost) continue;
        this.grid[at] = CELL.WAX;
        if (kind === CELL.DYE) this.dyeCount -= 1;
        this.wax -= cost;
        painted += 1;
      }
    }
    if (painted > 0) this.checkSeals();
    return painted;
  }

  // Erase wax back to plain cloth. Free, so a mistaken line is never fatal.
  eraseWax(cx, cy) {
    let erased = 0;
    for (let y = cy - this.brush; y <= cy + this.brush; y += 1) {
      for (let x = cx - this.brush; x <= cx + this.brush; x += 1) {
        if (!this.inBounds(x, y)) continue;
        const at = this.index(x, y);
        if (this.grid[at] !== CELL.WAX) continue;
        this.grid[at] = CELL.CLOTH;
        erased += 1;
      }
    }
    return erased;
  }

  freeze() {
    if (this.freezeCooldown > 0 || this.freezeTimer > 0) return false;
    this.freezeTimer = FREEZE.durationSeconds + this.freezeExtra;
    this.freezeCooldown = FREEZE.cooldownSeconds;
    return true;
  }

  // One dye spawn, by the current wave's behaviour. Every kind lands the
  // same number of cells — the tide stays linear — only WHERE differs.
  spawnDye(count) {
    const kind = kindFor(this.waveKind);
    if (kind.spawn === 'vortex') return this.spawnVortex(count);
    if (kind.spawn === 'seep') return this.spawnSeep(count);
    return this.spawnEdge(count);
  }

  // PUSARAN: dye lands on a ring around one random interior point, so the
  // flood starts as a circle the player must cut, not a border creep.
  spawnVortex(count) {
    let cx = 0;
    let cy = 0;
    for (let tries = 0; tries < 20; tries += 1) {
      cx = intInRange(this.rng, 8, GRID.cols - 9);
      cy = intInRange(this.rng, 6, GRID.rows - 7);
      if (!this.motifCells.has(this.index(cx, cy))) break;
    }
    let placed = 0;
    for (let i = 0; i < count; i += 1) {
      const angle = (i / Math.max(1, count)) * Math.PI * 2;
      const x = Math.round(cx + Math.cos(angle) * 4);
      const y = Math.round(cy + Math.sin(angle) * 3);
      if (!this.inBounds(x, y)) continue;
      const at = this.index(x, y);
      if (this.grid[at] !== CELL.CLOTH || this.motifCells.has(at)) continue;
      this.grid[at] = CELL.DYE;
      this.dyeColor[at] = this.waveKind;
      this.dyeCount += 1;
      placed += 1;
    }
    return placed;
  }

  // REMBESAN: dye lands on the telegraphed patch. Called only when the
  // telegraph fires, never directly — the warning always comes first.
  spawnSeep(count) {
    if (!this.telegraph) return 0;
    let placed = 0;
    for (let i = 0; i < this.telegraph.cells.length && placed < count; i += 1) {
      const at = this.telegraph.cells[i];
      if (this.grid[at] !== CELL.CLOTH || this.motifCells.has(at)) continue;
      this.grid[at] = CELL.DYE;
      this.dyeColor[at] = this.waveKind;
      this.dyeCount += 1;
      placed += 1;
    }
    return placed;
  }

  // Arm a seep telegraph: pick a patch of cells just outside a random
  // unsealed motif and warn the player for 2 seconds before dye lands.
  // Wind-up before strike — the threat is always readable first.
  armTelegraph(size) {
    const open = this.motifs.filter((m) => !m.sealed);
    const motif = open.length > 0 ? open[Math.floor(this.rng() * open.length)] : null;
    if (!motif) {
      this.spawnEdge(size);
      return;
    }
    const tx = motif.x + Math.floor(motif.w / 2) + (this.rng() < 0.5 ? -1 : 1) * (Math.floor(motif.w / 2) + 2);
    const ty = motif.y + Math.floor(motif.h / 2);
    const cells = [];
    for (let y = ty - 1; y <= ty + 1; y += 1) {
      for (let x = tx - 1; x <= tx + 1; x += 1) {
        if (this.inBounds(x, y)) cells.push(this.index(x, y));
      }
    }
    this.telegraph = { cells, timer: 2.0, size };
  }

  // One dye spawn on the border, at a random edge cell.
  spawnEdge(count) {
    const edge = Math.floor(this.rng() * 4);
    let placed = 0;
    let tries = 0;
    while (placed < count && tries < 60) {
      tries += 1;
      let x = 0;
      let y = 0;
      if (edge === 0) {
        x = intInRange(this.rng, 0, GRID.cols - 1);
        y = 0;
      } else if (edge === 1) {
        x = intInRange(this.rng, 0, GRID.cols - 1);
        y = GRID.rows - 1;
      } else if (edge === 2) {
        x = 0;
        y = intInRange(this.rng, 0, GRID.rows - 1);
      } else {
        x = GRID.cols - 1;
        y = intInRange(this.rng, 0, GRID.rows - 1);
      }
      const at = this.index(x, y);
      if (this.grid[at] !== CELL.CLOTH) continue;
      if (this.motifCells.has(at)) continue;
      this.grid[at] = CELL.DYE;
      this.dyeColor[at] = this.waveKind;
      this.dyeCount += 1;
      placed += 1;
    }
    return placed;
  }

  // One spread step: a fixed number of frontier dye cells each claim one
  // neighbour. The flood is a steady tide, not an explosion: its growth is
  // linear in time, so a player who walls early can always hold it back,
  // and the difficulty is the budget, which grows with the cloth.
  spreadDye() {
    const spec = CLOTHS[this.clothIndex];
    const budget = 5 + this.clothIndex;
    const frontier = [];
    for (let y = 0; y < GRID.rows; y += 1) {
      for (let x = 0; x < GRID.cols; x += 1) {
        if (this.grid[this.index(x, y)] !== CELL.DYE) continue;
        for (let d = 0; d < 4; d += 1) {
          const nx = x + DIRS[d][0];
          const ny = y + DIRS[d][1];
          if (!this.inBounds(nx, ny)) continue;
          const at = this.index(nx, ny);
          if (this.grid[at] === CELL.CLOTH && !this.motifCells.has(at)) {
            frontier.push({ x, y });
            break;
          }
        }
      }
    }
    for (let i = frontier.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.rng() * (i + 1));
      const tmp = frontier[i];
      frontier[i] = frontier[j];
      frontier[j] = tmp;
    }
    let spread = 0;
    for (let i = 0; i < frontier.length && spread < budget; i += 1) {
      const cell = frontier[i];
      const options = [];
      for (let d = 0; d < 4; d += 1) {
        const nx = cell.x + DIRS[d][0];
        const ny = cell.y + DIRS[d][1];
        if (!this.inBounds(nx, ny)) continue;
        const at = this.index(nx, ny);
        if (this.grid[at] === CELL.CLOTH && !this.motifCells.has(at)) options.push(at);
      }
      if (options.length === 0) continue;
      const at = options[Math.floor(this.rng() * options.length)];
      this.grid[at] = CELL.DYE;
      this.dyeColor[at] = this.dyeColor[this.index(cell.x, cell.y)];
      this.dyeCount += 1;
      spread += 1;
    }
    this.spreadTimer = spec.spreadSeconds * this.difficulty.spreadMul;
  }

  // Clear dye in a disc, used when a life is lost to give the player room.
  clearDyeAround(cx, cy, radius) {
    for (let y = cy - radius; y <= cy + radius; y += 1) {
      for (let x = cx - radius; x <= cx + radius; x += 1) {
        if (!this.inBounds(x, y)) continue;
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy > radius * radius) continue;
        const at = this.index(x, y);
        if (this.grid[at] === CELL.DYE) {
          this.grid[at] = CELL.CLOTH;
          this.dyeCount -= 1;
        }
      }
    }
  }

  // Lose a life, clear dye near the sacred centre, and grant brief safety.
  loseLife(reason) {
    if (this.invulnerable > 0) return;
    this.lives -= 1;
    this.invulnerable = 2;
    this.clearDyeAround(SACRED.x + 3, SACRED.y + 3, 8);
    this.events.push({ type: EVENT_LIFE, reason });
    if (this.lives <= 0) this.over = true;
  }

  // The boss moves along the top edge and spits dye.
  stepNaga(dt) {
    const naga = this.naga;
    if (!naga || !naga.alive) return;
    naga.x += naga.dir * naga.speed * dt;
    if (naga.x >= GRID.cols - 2) {
      naga.x = GRID.cols - 2;
      naga.dir = -1;
    } else if (naga.x <= 1) {
      naga.x = 1;
      naga.dir = 1;
    }
    naga.spitTimer -= dt;
    if (naga.spitTimer <= 0) {
      naga.spitTimer = naga.spitInterval;
      const hx = Math.floor(naga.x);
      for (let y = 1; y <= 3; y += 1) {
        for (let x = hx - 1; x <= hx + 1; x += 1) {
          if (!this.inBounds(x, y)) continue;
          const at = this.index(x, y);
          if (this.grid[at] === CELL.CLOTH) {
            this.grid[at] = CELL.DYE;
            this.dyeCount += 1;
          }
        }
      }
      this.events.push({ type: EVENT_BOSS, x: hx });
    }
  }

  // Advance the cloth by dt seconds. Returns nothing; read this.events after.
  step(dt) {
    this.events = [];
    if (this.over) return;
    if (this.invulnerable > 0) this.invulnerable -= dt;
    if (this.freezeCooldown > 0) this.freezeCooldown -= dt;
    this.wax = Math.min(this.waxMax, this.wax + this.waxRegen * dt);

    if (this.freezeTimer > 0) {
      this.freezeTimer -= dt;
      return;
    }

    // A telegraphed seep counts down and lands — the warning always precedes
    // the strike, so the player can wax over the marked patch first.
    if (this.telegraph) {
      this.telegraph.timer -= dt;
      if (this.telegraph.timer <= 0) {
        const size = this.telegraph.size;
        this.telegraph = null;
        this.spawnSeep(size);
      }
    }

    // Waves arrive on a timer until the cloth's quota is spent.
    if (this.wave < this.wavesTotal) {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) {
        this.wave += 1;
        this.waveKind = (this.wave - 1) % WAVE_KINDS.length;
        this.waveTimer = CLOTHS[this.clothIndex].dyeIntervalSeconds;
        const size = Math.round(3 * this.difficulty.waveMul) + this.clothIndex;
        if (kindFor(this.waveKind).spawn === 'seep') this.armTelegraph(size);
        else this.spawnDye(size);
        this.events.push({ type: EVENT_WAVE, wave: this.wave });
      }
    }

    this.spreadTimer -= dt;
    if (this.spreadTimer <= 0) this.spreadDye();

    if (this.naga) this.stepNaga(dt);

    // The sacred centre must never be dyed.
    let sacredHit = false;
    for (let y = SACRED.y; y < SACRED.y + SACRED.h; y += 1) {
      for (let x = SACRED.x; x < SACRED.x + SACRED.w; x += 1) {
        if (this.grid[this.index(x, y)] === CELL.DYE) sacredHit = true;
      }
    }
    if (sacredHit) this.loseLife('sacred');

    // Too much dye on the cloth also costs a life.
    const total = GRID.cols * GRID.rows;
    if (this.dyeCount / total > DYE_LIMIT) {
      this.loseLife('flood');
    }

    this.checkSeals();
  }

  dyeFraction() {
    return this.dyeCount / (GRID.cols * GRID.rows);
  }

  // The current wave's kind (name + colour), for the HUD.
  waveKindName() {
    return kindFor(this.waveKind).name;
  }

  // The next wave's kind, for the HUD's incoming preview.
  nextWaveName() {
    return kindFor(this.wave).name;
  }

  // The wave after that — the HUD shows a two-wave queue.
  nextNextWaveName() {
    return kindFor(this.wave + 1).name;
  }

  // Boss health, as motifs left to seal: each sealed motif wounds the Naga.
  nagaHp() {
    return { left: this.motifs.length - this.sealedCount, total: this.motifs.length };
  }
}
