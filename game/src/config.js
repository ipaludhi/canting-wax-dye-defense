// CANTING v3 — Wax & Dye Defense: all tuning in one place.
// Every number the game uses lives here so balancing is a one-file job.
// v2: taller canvas (HUD 2 baris + tool bar bawah), kain bernama, gelombang
// bernama, combo, grade — semua supaya depth game kebaca dari screenshot.
// v3: wave kinds moved to waves.js (5 kinds, 2 with their own spawn
// behaviour); dye palette grew to 5 colours to match.

export const VIEW = {
  width: 960,
  height: 668,
  hudHeight: 64,
  toolbarHeight: 44,
};

// The cloth is a grid of cells. The playfield is VIEW minus HUD and toolbar.
export const GRID = {
  cols: 48,
  rows: 28,
  cell: 20,
};

// Cell kinds stored in the cloth grid.
export const CELL = {
  CLOTH: 0,
  WAX: 1,
  DYE: 2,
};

// How much of the cloth may be dyed before a life is lost (fraction 0..1).
export const DYE_LIMIT = 0.6;

// Wax is the player's ink. Drawing spends it, it refills over time.
export const WAX = {
  max: 70,
  regenPerSecond: 10,
  costPerCell: 5,
  brushRadius: 0,
};

// Freeze tool: stops dye spread for a while, then needs a cooldown.
export const FREEZE = {
  durationSeconds: 3,
  cooldownSeconds: 12,
};

export const LIVES_START = 3;

// Sealing motifs back-to-back builds a combo: each seal within the window
// raises the multiplier by one, and the multiplier applies to the seal score.
export const COMBO = {
  windowSeconds: 8,
  max: 5,
};

// Grade thresholds per difficulty, on the final score of a finished run.
// Shown on the title cards (as the S target) and on the win screen.
export const GRADES = {
  santai: { S: 50000, A: 38000, B: 26000 },
  batik: { S: 60000, A: 45000, B: 30000 },
  mahir: { S: 70000, A: 52000, B: 36000 },
};

export function gradeFor(score, difficultyKey) {
  const g = GRADES[difficultyKey] || GRADES.batik;
  if (score >= g.S) return 'S';
  if (score >= g.A) return 'A';
  if (score >= g.B) return 'B';
  return 'C';
}

// Wave kinds live in waves.js now (v3): 5 kinds, each with its own spawn
// behaviour, so a wave reads as a different threat, not a different colour.

// One cloth per entry: waves of dye, motifs to seal, and the boss flag.
export const CLOTHS = [
  { name: 'Kain Perdana', waves: 3, motifs: 2, dyeIntervalSeconds: 2.6, spreadSeconds: 0.55, boss: false },
  { name: 'Kain Kawung', waves: 4, motifs: 2, dyeIntervalSeconds: 2.4, spreadSeconds: 0.53, boss: false },
  { name: 'Kain Parang', waves: 4, motifs: 3, dyeIntervalSeconds: 2.3, spreadSeconds: 0.51, boss: false },
  { name: 'Kain Mega Mendung', waves: 5, motifs: 3, dyeIntervalSeconds: 2.2, spreadSeconds: 0.49, boss: false },
  { name: 'Kain Ceplok', waves: 5, motifs: 3, dyeIntervalSeconds: 2.1, spreadSeconds: 0.47, boss: false },
  { name: 'Kain Sogan', waves: 6, motifs: 4, dyeIntervalSeconds: 2.0, spreadSeconds: 0.45, boss: false },
  { name: 'Kain Naga', waves: 5, motifs: 4, dyeIntervalSeconds: 2.2, spreadSeconds: 0.45, boss: true },
];

export const CLOTH_COUNT = CLOTHS.length;

// Difficulty multiplies dye speed and wave size, and trims wax.
export const DIFFICULTIES = {
  santai: { label: 'Santai', spreadMul: 1.25, waveMul: 0.8, waxMul: 1.25 },
  batik: { label: 'Batik', spreadMul: 1.0, waveMul: 1.0, waxMul: 1.0 },
  mahir: { label: 'Mahir', spreadMul: 0.8, waveMul: 1.3, waxMul: 0.85 },
};

// Scoring. A seal pays motif * cloth number, times the combo multiplier.
export const SCORE = {
  motif: 500,
  waveClear: 150,
  clothClear: 1000,
  boss: 2000,
};

// Palette: indigo cloth, warm wax, dye colours per wave, gold for sealed motifs.
export const PALETTE = {
  cloth: '#1d2a5e',
  clothAlt: '#22316b',
  clothDeep: '#141d42',
  clothLight: '#2a3a7d',
  wax: '#f2c14e',
  waxHi: '#ffe9a8',
  waxEdge: '#c98f1b',
  dye: ['#c0392b', '#8e44ad', '#16a085', '#d35400', '#2980b9'],
  dyeEdge: '#f5b7b1',
  sealed: '#f5d76e',
  sacred: '#eaf2f8',
  ink: '#f8f6ee',
  dim: '#9aa5c7',
  gold: '#f5d76e',
  panel: '#1d2a5e',
  panelEdge: '#f2c14e',
  danger: '#e74c3c',
  ok: '#2ecc71',
};
