// CANTING v3: waves — every wave kind, its spawn behaviour, and the rotation.
// One file, one job: decide WHAT each wave is and WHERE its dye lands.
// The tide stays linear (the same cell budget per tick for every kind) so
// the balance the autopilot proves never changes — kinds differ in WHERE dye
// appears and HOW it reads, not in how much of it there is. Lessons from
// GitHub tower-defense repos: kinds must differ in behaviour, not just
// colour; later waves must read as a mixed assault; a threat inside the
// cloth must be telegraphed before it strikes (wind-up → strike).

export const WAVE_KINDS = [
  { name: 'TETES', foe: 'Si Tetes', color: '#c0392b', spawn: 'edge', text: 'Tetes pewarna menetes dari tepi' },
  { name: 'ARUS', foe: 'Arus Liar', color: '#8e44ad', spawn: 'edge', text: 'Arus deras mendorong masuk' },
  { name: 'BANJIR', foe: 'Banjir Besar', color: '#16a085', spawn: 'edge', text: 'Banjir! Tahan garis malam' },
  { name: 'REMBESAN', foe: 'Si Rembes', color: '#d35400', spawn: 'seep', text: 'Rembesan! Pewarna muncul dari dalam' },
  { name: 'PUSARAN', foe: 'Pusaran', color: '#2980b9', spawn: 'vortex', text: 'Pusaran! Pewarna berputar masuk' },
];

// The kind of the wave with this 0-based index. Rotation is the mix: a
// 5-wave cloth already sees four different kinds, a 6-wave cloth all five.
export function kindFor(waveIndex) {
  const n = WAVE_KINDS.length;
  return WAVE_KINDS[((waveIndex % n) + n) % n];
}
