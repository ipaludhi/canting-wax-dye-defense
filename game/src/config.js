// CANTING — Wax & Dye Defense: all tuning in one place.
// Every number the game uses lives here so balancing is a one-file job.

export const VIEW = {
  width: 960,
  height: 616,
  hudHeight: 56,
};

// The cloth is a grid of cells. The playfield is VIEW minus the HUD strip.
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

// One cloth per entry: waves of dye, motifs to seal, and the boss flag.
export const CLOTHS = [
  { waves: 3, motifs: 2, dyeIntervalSeconds: 2.6, spreadSeconds: 0.55, boss: false },
  { waves: 4, motifs: 2, dyeIntervalSeconds: 2.4, spreadSeconds: 0.53, boss: false },
  { waves: 4, motifs: 3, dyeIntervalSeconds: 2.3, spreadSeconds: 0.51, boss: false },
  { waves: 5, motifs: 3, dyeIntervalSeconds: 2.2, spreadSeconds: 0.49, boss: false },
  { waves: 5, motifs: 3, dyeIntervalSeconds: 2.1, spreadSeconds: 0.47, boss: false },
  { waves: 6, motifs: 4, dyeIntervalSeconds: 2.0, spreadSeconds: 0.45, boss: false },
  { waves: 5, motifs: 4, dyeIntervalSeconds: 2.2, spreadSeconds: 0.45, boss: true },
];

export const CLOTH_COUNT = CLOTHS.length;

// Difficulty multiplies dye speed and wave size, and trims wax.
export const DIFFICULTIES = {
  santai: { label: 'Santai', spreadMul: 1.25, waveMul: 0.8, waxMul: 1.25 },
  batik: { label: 'Batik', spreadMul: 1.0, waveMul: 1.0, waxMul: 1.0 },
  mahir: { label: 'Mahir', spreadMul: 0.8, waveMul: 1.3, waxMul: 0.85 },
};

// Upgrades offered between cloths. Each has an id, a name, and a short line.
export const UPGRADES = [
  { id: 'wide', name: 'Canting Lebar', text: 'Garis malam 2 sel lebih lebar.' },
  { id: 'regen', name: 'Malam Mengalir', text: 'Malam terisi 60% lebih cepat.' },
  { id: 'tank', name: 'Wadah Besar', text: 'Kapasitas malam +50.' },
  { id: 'freeze', name: 'Embun Beku', text: 'Beku 2 detik lebih lama.' },
  { id: 'life', name: 'Kain Cadangan', text: '+1 nyawa, maks 5.' },
];

// Scoring.
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
  wax: '#f2c14e',
  waxEdge: '#c98f1b',
  dye: ['#c0392b', '#8e44ad', '#16a085', '#d35400'],
  sealed: '#f5d76e',
  sacred: '#eaf2f8',
  ink: '#f8f6ee',
  dim: '#9aa5c7',
};
