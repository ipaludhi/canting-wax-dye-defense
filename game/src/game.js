// CANTING: the game itself — a state machine over the cloth.
// Screens: title, play, upgrade, pause, over, win. Every transition goes
// through switchScreen(), which runs the old screen's exit and the new
// screen's enter. The cloth owns the rules; this class owns the flow,
// the score, the upgrades, and the buttons the player clicks.

import { CELL, CLOTH_COUNT, DIFFICULTIES, GRID, SCORE, UPGRADES, VIEW } from './config.js';
import { Cloth, EVENT_BOSS, EVENT_CLEAR, EVENT_LIFE, EVENT_SEALED, EVENT_WAVE } from './cloth.js';
import { Input, TOOL_ERASE, TOOL_FREEZE, TOOL_WAX } from './input.js';
import { Sound } from './audio.js';
import { Particles } from './particles.js';
import { drawBanner, drawCloth, drawHud, drawPanel } from './render.js';
import { shuffle } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

function loadBest() {
  try {
    return Number(window.localStorage.getItem('canting-best') || 0) || 0;
  } catch (err) {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem('canting-best', String(value));
  } catch (err) {
    // Storage is a nicety, never a failure.
  }
}

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.input = new Input(canvas);
    this.sound = new Sound();
    this.particles = new Particles(240);
    this.cloth = new Cloth();
    this.screen = SCREEN_TITLE;
    this.difficultyKey = 'batik';
    this.difficulty = DIFFICULTIES.batik;
    this.difficultyLabel = 'Batik';
    this.seed = 1;
    this.best = loadBest();
    this.score = 0;
    this.time = 0;
    this.tool = TOOL_WAX;
    this.lastCell = null;
    this.banner = '';
    this.bannerTime = 0;
    this.buttons = [];
    this.upgradeChoices = [];
    this.endless = false;
    this.endlessRound = 0;
    this.demoPainted = false;
    this.demoTime = 0;
    this.startCloth();
  }

  get score() {
    return this.cloth.score;
  }

  set score(value) {
    this.cloth.score = value;
  }

  switchScreen(next) {
    this.screen = next;
    this.buttons = [];
    if (next === SCREEN_TITLE) this.startCloth();
  }

  // A fresh cloth for the title backdrop, with a decorative wax ring.
  // Waves run on a real timer so dye creeps in behind the menu.
  startCloth() {
    this.cloth.reset(0, this.difficulty, this.seed, 3, 0);
    this.cloth.waveTimer = 2;
    for (let a = 0; a < 40; a += 1) {
      const angle = (a / 40) * Math.PI * 2;
      const cx = 24 + Math.round(Math.cos(angle) * 10);
      const cy = 14 + Math.round(Math.sin(angle) * 6);
      this.cloth.grid[cy * GRID.cols + cx] = CELL.WAX;
    }
    this.demoPainted = true;
  }

  startRun(difficultyKey) {
    this.difficultyKey = difficultyKey;
    this.difficulty = DIFFICULTIES[difficultyKey];
    this.difficultyLabel = this.difficulty.label;
    this.seed = (Math.random() * 1e9) | 0;
    this.endless = false;
    this.endlessRound = 0;
    this.cloth.reset(0, this.difficulty, this.seed, 3, 0);
    this.cloth.resetUpgrades(this.difficulty);
    this.showBanner('Kain 1 — segel semua motif!');
    this.switchScreen(SCREEN_PLAY);
  }

  nextCloth() {
    if (this.cloth.clothIndex + 1 >= CLOTH_COUNT) {
      this.finishWin();
      return;
    }
    this.cloth.reset(this.cloth.clothIndex + 1, this.difficulty, this.seed, this.cloth.lives, this.cloth.score);
    this.showBanner(`Kain ${this.cloth.clothIndex + 1} — segel semua motif!`);
    this.switchScreen(SCREEN_PLAY);
  }

  finishWin() {
    this.cloth.score += SCORE.boss;
    this.best = Math.max(this.best, this.cloth.score);
    saveBest(this.best);
    this.sound.gong();
    this.switchScreen(SCREEN_WIN);
  }

  startEndless() {
    this.endless = true;
    this.endlessRound += 1;
    this.cloth.reset(CLOTH_COUNT - 1, this.difficulty, this.seed + this.endlessRound * 131, this.cloth.lives, this.cloth.score);
    this.cloth.wavesTotal = 6 + this.endlessRound * 2;
    this.showBanner(`Endless ${this.endlessRound} — bertahanlah!`);
    this.switchScreen(SCREEN_PLAY);
  }

  showBanner(text) {
    this.banner = text;
    this.bannerTime = 2.2;
  }

  // Offer three upgrades the player does not already max out.
  offerUpgrades() {
    const pool = UPGRADES.filter((u) => {
      if (u.id === 'life' && this.cloth.lives >= 5) return false;
      if (u.id === 'wide' && this.cloth.brush >= 1) return false;
      return true;
    });
    const rng = Math.random;
    const picked = [];
    const copy = pool.slice();
    while (picked.length < 3 && copy.length > 0) {
      picked.push(copy.splice(Math.floor(rng() * copy.length), 1)[0]);
    }
    this.upgradeChoices = picked;
    this.switchScreen(SCREEN_UPGRADE);
  }

  applyUpgrade(id) {
    const cloth = this.cloth;
    if (id === 'wide') cloth.brush = 1;
    if (id === 'regen') cloth.waxRegen *= 1.4;
    if (id === 'tank') {
      cloth.waxMax += 50;
      cloth.wax = cloth.waxMax;
    }
    if (id === 'freeze') cloth.freezeExtra += 2;
    if (id === 'life') cloth.lives = Math.min(5, cloth.lives + 1);
    this.nextCloth();
  }

  // Convert a mouse position to a cloth cell, or null when outside the cloth.
  mouseCell() {
    const x = Math.floor(this.input.mouseX / GRID.cell);
    const y = Math.floor((this.input.mouseY - VIEW.hudHeight) / GRID.cell);
    if (x < 0 || y < 0 || x >= GRID.cols || y >= GRID.rows) return null;
    return { x, y };
  }

  // Paint wax along the line from the last cell to the current one.
  paintLineTo(cell) {
    if (!this.lastCell) {
      this.cloth.paintWax(cell.x, cell.y);
      this.lastCell = cell;
      return;
    }
    const steps = Math.max(Math.abs(cell.x - this.lastCell.x), Math.abs(cell.y - this.lastCell.y), 1);
    for (let i = 1; i <= steps; i += 1) {
      const x = Math.round(this.lastCell.x + ((cell.x - this.lastCell.x) * i) / steps);
      const y = Math.round(this.lastCell.y + ((cell.y - this.lastCell.y) * i) / steps);
      if (this.cloth.paintWax(x, y) > 0) this.sound.wax();
    }
    this.lastCell = cell;
  }

  // Which of the currently drawn buttons, if any, holds this point.
  buttonAt(x, y) {
    for (let i = 0; i < this.buttons.length; i += 1) {
      const b = this.buttons[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.id;
    }
    return null;
  }

  clickButtons() {
    if (!this.input.mousePressed) return null;
    return this.buttonAt(this.input.mouseX, this.input.mouseY);
  }

  update(dt) {
    this.time += dt;
    if (this.bannerTime > 0) this.bannerTime -= dt;
    this.particles.update(dt);

    if (this.screen === SCREEN_TITLE) {
      // The backdrop is alive: dye creeps in slowly behind the menu, and
      // the cloth is rebuilt every half minute so it never floods over.
      this.demoTime += dt;
      this.cloth.step(dt * 0.5);
      if (this.demoTime > 30 || this.cloth.over) {
        this.demoTime = 0;
        this.startCloth();
      }
      const clicked = this.clickButtons();
      if (clicked === 'santai' || clicked === 'batik' || clicked === 'mahir') {
        this.sound.unlock();
        this.startRun(clicked);
      }
      if (this.input.wasPressed('Digit1')) this.startRun('santai');
      if (this.input.wasPressed('Digit2')) this.startRun('batik');
      if (this.input.wasPressed('Digit3')) this.startRun('mahir');
      return;
    }

    if (this.screen === SCREEN_UPGRADE) {
      const clicked = this.clickButtons();
      if (clicked) this.applyUpgrade(clicked);
      if (this.input.wasPressed('Digit1') && this.upgradeChoices[0]) this.applyUpgrade(this.upgradeChoices[0].id);
      if (this.input.wasPressed('Digit2') && this.upgradeChoices[1]) this.applyUpgrade(this.upgradeChoices[1].id);
      if (this.input.wasPressed('Digit3') && this.upgradeChoices[2]) this.applyUpgrade(this.upgradeChoices[2].id);
      return;
    }

    if (this.screen === SCREEN_PAUSE) {
      if (this.input.wasPressed('Space') || this.input.wasPressed('KeyP') || this.input.wasPressed('Escape')) {
        this.switchScreen(SCREEN_PLAY);
      }
      return;
    }

    if (this.screen === SCREEN_OVER) {
      if (this.input.wasPressed('KeyR') || this.input.mousePressed || this.input.wasPressed('Enter')) {
        this.startRun(this.difficultyKey);
      }
      return;
    }

    if (this.screen === SCREEN_WIN) {
      const clicked = this.clickButtons();
      if (clicked === 'endless') this.startEndless();
      if (clicked === 'again') this.startRun(this.difficultyKey);
      if (clicked === 'menu') this.switchScreen(SCREEN_TITLE);
      return;
    }

    // SCREEN_PLAY
    if (this.input.wasPressed('Space') || this.input.wasPressed('KeyP') || this.input.wasPressed('Escape')) {
      this.switchScreen(SCREEN_PAUSE);
      return;
    }
    if (this.input.wasPressed('KeyR')) {
      this.startRun(this.difficultyKey);
      return;
    }
    if (this.input.wasPressed('KeyM')) this.sound.toggleMute();
    if (this.input.wasPressed('Digit1')) this.tool = TOOL_WAX;
    if (this.input.wasPressed('Digit2')) this.tool = TOOL_ERASE;
    if (this.input.wasPressed('Digit3') || this.input.wasPressed('KeyF')) {
      if (this.cloth.freeze()) {
        this.showBanner('Pewarna membeku!');
        this.sound.tone('seal', 880, 440, 0.3, 0.2);
      }
    }
    this.sound.unlock();

    if (this.input.mouseHeld) {
      const cell = this.mouseCell();
      if (cell) {
        if (this.tool === TOOL_WAX) this.paintLineTo(cell);
        else if (this.tool === TOOL_ERASE) this.cloth.eraseWax(cell.x, cell.y);
      }
    } else {
      this.lastCell = null;
    }

    this.cloth.step(dt);
    for (let i = 0; i < this.cloth.events.length; i += 1) {
      const event = this.cloth.events[i];
      if (event.type === EVENT_SEALED) {
        this.sound.pluck();
        const motif = event.motif;
        this.particles.burst((motif.x + motif.w / 2) * GRID.cell, VIEW.hudHeight + (motif.y + motif.h / 2) * GRID.cell, '#f5d76e', 24);
        this.showBanner('Motif tersegel! +' + SCORE.motif * (this.cloth.clothIndex + 1));
      } else if (event.type === EVENT_LIFE) {
        this.sound.hurt();
        this.particles.addShake(6);
        this.showBanner(event.reason === 'sacred' ? 'Motif suci ternoda!' : 'Kain kebanjiran pewarna!');
      } else if (event.type === EVENT_WAVE) {
        this.showBanner(`Gelombang ${event.wave} datang!`);
        this.sound.splash();
      } else if (event.type === EVENT_BOSS) {
        this.sound.boss();
      } else if (event.type === EVENT_CLEAR) {
        this.cloth.score += SCORE.clothClear;
        this.sound.gong();
        if (this.endless) {
          this.showBanner('Kain selesai! +1000');
          this.startEndless();
        } else if (this.cloth.clothIndex + 1 >= CLOTH_COUNT) {
          this.finishWin();
        } else {
          this.offerUpgrades();
        }
      }
    }

    if (this.cloth.over) {
      this.best = Math.max(this.best, this.cloth.score);
      saveBest(this.best);
      this.sound.hurt();
      this.switchScreen(SCREEN_OVER);
    }
  }

  render(ctx) {
    ctx.clearRect(0, 0, VIEW.width, VIEW.height);
    const shake = this.particles.offset();
    ctx.save();
    ctx.translate(shake.x, shake.y);
    drawCloth(ctx, this.cloth, this.time);
    this.particles.render(ctx);
    ctx.restore();
    drawHud(ctx, this);
    drawBanner(ctx, this.banner, Math.min(1, this.bannerTime));

    if (this.screen === SCREEN_TITLE) {
      this.buttons = drawPanel(
        ctx,
        'CANTING',
        ['Wax & Dye Defense — jaga kain batik dari banjir pewarna.', 'Gambar garis malam dengan mouse, segel motif, lindungi motif suci.', `Skor terbaik: ${this.best}`, 'Pilih tingkat kesulitan untuk mulai:'],
        [
          { id: 'santai', label: '1 — Santai (pewarna lambat)' },
          { id: 'batik', label: '2 — Batik (normal)' },
          { id: 'mahir', label: '3 — Mahir (pewarna deras)' },
        ],
      );
    } else if (this.screen === SCREEN_UPGRADE) {
      const actions = this.upgradeChoices.map((u, i) => ({ id: u.id, label: `${i + 1} — ${u.name}: ${u.text}` }));
      this.buttons = drawPanel(ctx, `Kain ${this.cloth.clothIndex + 1} selesai!`, ['Pilih satu peningkatan sebelum kain berikutnya:'], actions);
    } else if (this.screen === SCREEN_PAUSE) {
      this.buttons = drawPanel(ctx, 'Jeda', ['Pewarna menunggu. Tarik napas dulu.', 'Space / P — lanjut   •   R — mulai dari awal'], []);
    } else if (this.screen === SCREEN_OVER) {
      this.buttons = drawPanel(
        ctx,
        'Kain Rusak',
        [`Skor: ${this.cloth.score}`, `Skor terbaik: ${this.best}`, 'Klik atau tekan R untuk mencoba lagi.'],
        [],
      );
    } else if (this.screen === SCREEN_WIN) {
      this.buttons = drawPanel(
        ctx,
        'Mahakarya Selesai!',
        [`Kamu menamatkan 7 kain. Skor: ${this.cloth.score}`, `Skor terbaik: ${this.best}`],
        [
          { id: 'endless', label: 'Endless — bertahan selama mungkin' },
          { id: 'again', label: 'Main lagi dari kain 1' },
          { id: 'menu', label: 'Kembali ke menu' },
        ],
      );
    }
  }
}
