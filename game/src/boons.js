// CANTING v2: pusaka (boons) — the upgrades offered between cloths.
// One file, one job: define every boon (name, rarity, icon, effect text),
// apply it to a cloth, and track which ones a run already owns. Rarity is
// a display tier: Langka boons are the run-defining ones, Umum the steady
// ones. Effects are the same five upgrades v1 shipped — renamed, not rebalanced.

export const BOONS = [
  {
    id: 'wide',
    name: 'Canting Lebar',
    rarity: 'LANGKA',
    icon: 'brush',
    text: 'Garis malam 2 sel lebih lebar.',
    flavor: 'Sekali coret, dua jalur.',
    maxed: (cloth) => cloth.brush >= 1,
  },
  {
    id: 'regen',
    name: 'Malam Mengalir',
    rarity: 'UMUM',
    icon: 'drop',
    text: 'Malam terisi 40% lebih cepat.',
    flavor: 'Malam panas mengalir terus.',
    maxed: () => false,
  },
  {
    id: 'tank',
    name: 'Wadah Besar',
    rarity: 'UMUM',
    icon: 'pot',
    text: 'Kapasitas malam +50.',
    flavor: 'Wadah tembaga — malam awet.',
    maxed: () => false,
  },
  {
    id: 'freeze',
    name: 'Embun Beku',
    rarity: 'LANGKA',
    icon: 'snow',
    text: 'Beku 2 detik lebih lama.',
    flavor: 'Embun pagi membekukan pewarna.',
    maxed: () => false,
  },
  {
    id: 'life',
    name: 'Kain Cadangan',
    rarity: 'LANGKA',
    icon: 'heart',
    text: '+1 nyawa, maks 5.',
    flavor: 'Selembar kain cadangan.',
    maxed: (cloth) => cloth.lives >= 5,
  },
  {
    id: 'twin',
    name: 'Canting Kembar',
    rarity: 'LANGKA',
    icon: 'brush',
    text: 'Sapuan malam 5 sel lebar.',
    flavor: 'Dua canting, satu tarikan.',
    maxed: (cloth) => cloth.brush >= 2,
  },
  {
    id: 'gold',
    name: 'Timbangan Emas',
    rarity: 'LANGKA',
    icon: 'pot',
    text: 'Skor segel x1,5.',
    flavor: 'Motif tersegel ditimbang emas.',
    maxed: (cloth) => cloth.scoreMul > 1,
  },
  {
    id: 'mines',
    name: 'Ranjau Cadangan',
    rarity: 'UMUM',
    icon: 'mine',
    text: '+2 ranjau per kain.',
    flavor: 'Ranjau malam cadangan.',
    maxed: (cloth) => cloth.mineMax >= 7,
  },
];

export function boonById(id) {
  return BOONS.find((b) => b.id === id);
}

// Apply a boon's effect to the cloth. Returns true when applied.
export function applyBoon(cloth, id) {
  if (id === 'wide') cloth.brush = 1;
  else if (id === 'regen') cloth.waxRegen *= 1.4;
  else if (id === 'tank') {
    cloth.waxMax += 50;
    cloth.wax = cloth.waxMax;
  } else if (id === 'freeze') cloth.freezeExtra += 2;
  else if (id === 'life') cloth.lives = Math.min(5, cloth.lives + 1);
  else if (id === 'twin') cloth.brush = 2;
  else if (id === 'gold') cloth.scoreMul = 1.5;
  else if (id === 'mines') {
    cloth.mineMax += 2;
    cloth.mineCount = Math.min(cloth.mineMax, cloth.mineCount + 2);
  }
  else return false;
  return true;
}

// Pick three boons the run can still use, in a shuffled order.
export function offerBoons(cloth, rng) {
  const pool = BOONS.filter((b) => !b.maxed(cloth));
  const copy = pool.slice();
  const picked = [];
  while (picked.length < 3 && copy.length > 0) {
    picked.push(copy.splice(Math.floor(rng() * copy.length), 1)[0]);
  }
  return picked;
}
