// CANTING v2: HUD and screens — everything drawn over the cloth.
// One file, one job: the top HUD bar (win/lose pills, score, combo, waves,
// meters), the bottom tool bar, and the title / upgrade / win / pause /
// over panels. The top-10 lesson: a screenshot must explain the game in
// two seconds, so the goal, the danger and the tools are always on screen.

import { CLOTHS, GRID, PALETTE, VIEW } from './config.js';
import { TOOL_ERASE, TOOL_FREEZE, TOOL_WAX } from './input.js';
import { boonById } from './boons.js';

const ORIGIN_Y = VIEW.hudHeight;
const TOOLBAR_Y = ORIGIN_Y + GRID.rows * GRID.cell;

function pill(ctx, x, y, w, h, bg, text, color) {
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();
  ctx.fillStyle = color || '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, x + w / 2, y + h / 2 + 4);
}

function bar(ctx, x, y, w, frac, fill, label) {
  ctx.fillStyle = '#2c3e6b';
  ctx.fillRect(x, y, w, 10);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), 10);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y - 4);
}

// The top HUD bar: cloth, score, combo, win/lose, waves, lives, meters.
export function drawHud(ctx, game) {
  const cloth = game.cloth;
  const spec = CLOTHS[cloth.clothIndex];
  ctx.fillStyle = '#101736';
  ctx.fillRect(0, 0, VIEW.width, VIEW.hudHeight);

  // Row 1: cloth + win pill + score + combo.
  ctx.fillStyle = PALETTE.ink;
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`KAIN ${cloth.clothIndex + 1}/7 · ${spec.name}`, 12, 22);
  pill(ctx, 300, 8, 210, 20, '#1e7d32', `MENANG: segel ${cloth.motifs.length} motif`, '#e8f5e9');
  ctx.textAlign = 'right';
  ctx.font = 'bold 20px sans-serif';
  const scoreText = game.score.toLocaleString('id-ID');
  const scoreW = ctx.measureText(scoreText).width;
  ctx.fillStyle = PALETTE.sealed;
  ctx.fillText(scoreText, 948, 24);
  if (game.combo >= 2) {
    ctx.fillStyle = '#ff8f00';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`KOMBO x${game.combo}`, 948 - scoreW - 12, 24);
  }

  // Row 2: lives + difficulty, wave + incoming, meters.
  let hearts = '';
  for (let i = 0; i < cloth.lives; i += 1) hearts += '♥ ';
  ctx.fillStyle = '#e74c3c';
  ctx.font = '15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(hearts, 12, 50);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = '12px sans-serif';
  ctx.fillText(`${game.difficultyLabel}  •  Beku ${cloth.freezeCooldown > 0 ? Math.ceil(cloth.freezeCooldown) + ' dtk' : 'siap'}`, 92, 50);
  ctx.textAlign = 'center';
  ctx.fillText(`Gelombang ${cloth.wave}/${cloth.wavesTotal} · ${cloth.waveKindName()}`, 340, 50);
  if (cloth.wave < cloth.wavesTotal) {
    ctx.fillStyle = PALETTE.dim;
    ctx.fillText(`Berikutnya: ${cloth.nextWaveName()}`, 520, 50);
  }
  // Lose pill, right side row 2.
  pill(ctx, 620, 34, 150, 18, '#922b21', 'KALAH: suci ternoda / >60%', '#fdecea');
  const frac = cloth.dyeFraction();
  bar(ctx, 790, 48, 70, cloth.wax / cloth.waxMax, PALETTE.wax, `MALAM ${Math.floor(cloth.wax)}`);
  bar(ctx, 880, 48, 70, frac, frac > 0.45 ? '#e74c3c' : '#8e44ad', `PEWARNA ${Math.round(frac * 100)}%`);
}

// The bottom tool bar: the three tools with their keys, the owned boons,
// and the controls — so no mechanic is keyboard-only invisible.
export function drawToolBar(ctx, game) {
  const cloth = game.cloth;
  ctx.fillStyle = '#0d1330';
  ctx.fillRect(0, TOOLBAR_Y, VIEW.width, VIEW.toolbarHeight);
  ctx.fillStyle = PALETTE.wax;
  ctx.fillRect(0, TOOLBAR_Y, VIEW.width, 2);
  const tools = [
    { id: TOOL_WAX, key: '1', label: 'MALAM', sub: 'gambar' },
    { id: TOOL_ERASE, key: '2', label: 'HAPUS', sub: 'hapus malam' },
    { id: TOOL_FREEZE, key: '3 / F', label: 'BEKU', sub: cloth.freezeCooldown > 0 ? `${Math.ceil(cloth.freezeCooldown)} dtk` : 'siap' },
  ];
  for (let i = 0; i < tools.length; i += 1) {
    const t = tools[i];
    const x = 12 + i * 140;
    const y = TOOLBAR_Y + 6;
    const active = game.tool === t.id;
    ctx.fillStyle = active ? '#2c3e6b' : '#1a2348';
    ctx.fillRect(x, y, 130, 32);
    ctx.strokeStyle = active ? PALETTE.wax : '#3a4a7d';
    ctx.lineWidth = active ? 2 : 1;
    ctx.strokeRect(x, y, 130, 32);
    ctx.fillStyle = active ? PALETTE.sealed : PALETTE.ink;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${t.key} · ${t.label}`, x + 8, y + 14);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '11px sans-serif';
    ctx.fillText(t.sub, x + 8, y + 28);
  }
  ctx.fillStyle = PALETTE.ink;
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  const counts = {};
  for (const id of game.boonsOwned) counts[id] = (counts[id] || 0) + 1;
  const owned = game.boonsOwned.length > 0
    ? Object.keys(counts).map((id) => (counts[id] > 1 ? `${boonById(id).name} x${counts[id]}` : boonById(id).name)).join(' · ')
    : 'belum ada — segel kain untuk memilih pusaka';
  ctx.fillText(`PUSAKA: ${owned}`, 440, TOOLBAR_Y + 18);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '11px sans-serif';
  ctx.fillText('Space jeda  •  R ulang  •  M suara  •  segel beruntun = kombo', 440, TOOLBAR_Y + 34);
}

// A dim panel with a title and lines of text, centred on the cloth.
export function drawPanel(ctx, title, lines, actions) {
  ctx.fillStyle = 'rgba(8, 12, 32, 0.78)';
  ctx.fillRect(0, ORIGIN_Y, VIEW.width, TOOLBAR_Y - ORIGIN_Y);
  const w = 560;
  const h = 120 + lines.length * 26 + actions.length * 44;
  const x = (VIEW.width - w) / 2;
  const y = ORIGIN_Y + (TOOLBAR_Y - ORIGIN_Y - h) / 2;
  ctx.fillStyle = '#1d2a5e';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = PALETTE.wax;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = PALETTE.sealed;
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, VIEW.width / 2, y + 44);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = '16px sans-serif';
  for (let i = 0; i < lines.length; i += 1) {
    ctx.fillText(lines[i], VIEW.width / 2, y + 78 + i * 26);
  }
  const buttons = [];
  for (let i = 0; i < actions.length; i += 1) {
    const bw = 400;
    const bh = 34;
    const bx = (VIEW.width - bw) / 2;
    const by = y + 92 + lines.length * 26 + i * 44;
    ctx.fillStyle = '#2c3e6b';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = PALETTE.wax;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = PALETTE.ink;
    ctx.font = '15px sans-serif';
    ctx.fillText(actions[i].label, VIEW.width / 2, by + 22);
    buttons.push({ x: bx, y: by, w: bw, h: bh, id: actions[i].id });
  }
  return buttons;
}

// A small boon icon, drawn with shapes: brush, drop, pot, snow, heart.
export function drawBoonIcon(ctx, icon, cx, cy, size, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  if (icon === 'brush') {
    ctx.beginPath();
    ctx.moveTo(cx - size, cy + size);
    ctx.lineTo(cx + size * 0.7, cy - size * 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + size * 0.7, cy - size * 0.7, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (icon === 'drop') {
    ctx.beginPath();
    ctx.moveTo(cx, cy - size);
    ctx.quadraticCurveTo(cx + size, cy + size * 0.4, cx, cy + size);
    ctx.quadraticCurveTo(cx - size, cy + size * 0.4, cx, cy - size);
    ctx.fill();
  } else if (icon === 'pot') {
    ctx.fillRect(cx - size * 0.8, cy - size * 0.4, size * 1.6, size);
    ctx.fillRect(cx - size * 0.8, cy - size * 0.8, size * 1.6, size * 0.4);
  } else if (icon === 'snow') {
    for (let a = 0; a < 3; a += 1) {
      const ang = (a * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(cx - Math.cos(ang) * size, cy - Math.sin(ang) * size);
      ctx.lineTo(cx + Math.cos(ang) * size, cy + Math.sin(ang) * size);
      ctx.stroke();
    }
  } else {
    ctx.beginPath();
    ctx.arc(cx - size * 0.45, cy - size * 0.3, size * 0.5, 0, Math.PI * 2);
    ctx.arc(cx + size * 0.45, cy - size * 0.3, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.85, cy);
    ctx.lineTo(cx + size * 0.85, cy);
    ctx.lineTo(cx, cy + size);
    ctx.closePath();
    ctx.fill();
  }
}

// Title screen as a poster: big gold title, 3 how-to cards with diagrams,
// difficulty cards with S target + best + grade, and a big START hint.
export function drawTitlePanel(ctx, game) {
  ctx.fillStyle = 'rgba(8, 12, 32, 0.82)';
  ctx.fillRect(0, ORIGIN_Y, VIEW.width, TOOLBAR_Y - ORIGIN_Y);
  const cx = VIEW.width / 2;
  ctx.fillStyle = PALETTE.sealed;
  ctx.font = 'bold 52px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CANTING', cx, ORIGIN_Y + 62);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText('WAX & DYE DEFENSE — jaga kain batik dari banjir pewarna', cx, ORIGIN_Y + 90);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '13px sans-serif';
  ctx.fillText('Gambar garis malam, segel semua motif, lindungi motif suci di tengah.', cx, ORIGIN_Y + 110);

  // Three how-to cards with a diagram each.
  const steps = [
    { n: '1', title: 'GAMBAR MALAM', text: 'Seret mouse untuk', text2: 'menggambar garis malam' },
    { n: '2', title: 'SEGEL MOTIF', text: 'Tutup semua jalan', text2: 'masuk ke motif' },
    { n: '3', title: 'LINDUNGI SUCI', text: 'Pewarna menyentuh', text2: 'motif suci = -1 nyawa' },
  ];
  for (let i = 0; i < 3; i += 1) {
    const x = 120 + i * 250;
    const y = ORIGIN_Y + 128;
    ctx.fillStyle = '#1d2a5e';
    ctx.fillRect(x, y, 230, 108);
    ctx.strokeStyle = PALETTE.wax;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, 230, 108);
    ctx.fillStyle = PALETTE.sealed;
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${steps[i].n} · ${steps[i].title}`, x + 12, y + 24);
    ctx.fillStyle = PALETTE.ink;
    ctx.font = '12px sans-serif';
    ctx.fillText(steps[i].text, x + 12, y + 44);
    ctx.fillText(steps[i].text2, x + 12, y + 60);
    // Diagram: a wax squiggle / a sealed ring / a sacred diamond.
    ctx.strokeStyle = PALETTE.wax;
    ctx.lineWidth = 3;
    if (i === 0) {
      ctx.beginPath();
      ctx.moveTo(x + 30, y + 92);
      ctx.quadraticCurveTo(x + 90, y + 72, x + 150, y + 92);
      ctx.quadraticCurveTo(x + 180, y + 104, x + 205, y + 88);
      ctx.stroke();
    } else if (i === 1) {
      ctx.strokeRect(x + 86, y + 70, 58, 26);
      ctx.strokeStyle = PALETTE.sealed;
      ctx.strokeRect(x + 96, y + 78, 38, 10);
    } else {
      ctx.beginPath();
      ctx.moveTo(x + 115, y + 70);
      ctx.lineTo(x + 135, y + 88);
      ctx.lineTo(x + 115, y + 104);
      ctx.lineTo(x + 95, y + 88);
      ctx.closePath();
      ctx.stroke();
    }
  }

  // Difficulty cards: name, S target, best + grade (or — when unplayed).
  const diffs = [
    { id: 'santai', label: 'SANTAI', sub: 'pewarna lambat' },
    { id: 'batik', label: 'BATIK', sub: 'normal' },
    { id: 'mahir', label: 'MAHIR', sub: 'pewarna deras' },
  ];
  const buttons = [];
  for (let i = 0; i < 3; i += 1) {
    const d = diffs[i];
    const x = 120 + i * 250;
    const y = ORIGIN_Y + 252;
    const best = game.bestByDiff[d.id] || 0;
    ctx.fillStyle = '#1d2a5e';
    ctx.fillRect(x, y, 230, 96);
    ctx.strokeStyle = PALETTE.wax;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, 230, 96);
    ctx.fillStyle = PALETTE.sealed;
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${i + 1} — ${d.label}`, cx - 360 + i * 250 + 115, y + 28);
    ctx.fillStyle = PALETTE.ink;
    ctx.font = '13px sans-serif';
    ctx.fillText(d.sub, cx - 360 + i * 250 + 115, y + 50);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '12px sans-serif';
    const target = (game.gradeTargets[d.id] || 60000).toLocaleString('id-ID');
    ctx.fillText(`Grade S ≥ ${target}`, cx - 360 + i * 250 + 115, y + 70);
    ctx.fillStyle = best > 0 ? PALETTE.sealed : PALETTE.dim;
    ctx.fillText(best > 0 ? `BEST ${best.toLocaleString('id-ID')} · ${game.gradeByDiff[d.id] || ''}` : 'BEST — belum main', cx - 360 + i * 250 + 115, y + 88);
    buttons.push({ x, y, w: 230, h: 96, id: d.id });
  }
  ctx.fillStyle = PALETTE.sealed;
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('▶  KLIK KARTU ATAU TEKAN 1 / 2 / 3 UNTUK MULAI', cx, ORIGIN_Y + 388);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '12px sans-serif';
  ctx.fillText('7 kain · boss Naga Pewarna di kain 7 · pusaka antar kain · Endless setelah menang', cx, ORIGIN_Y + 410);
  return buttons;
}

// Upgrade screen as a shop: stats row, 3 boon cards with rarity + icon,
// next-cloth preview, and the owned build list.
export function drawUpgradePanel(ctx, game) {
  ctx.fillStyle = 'rgba(8, 12, 32, 0.78)';
  ctx.fillRect(0, ORIGIN_Y, VIEW.width, TOOLBAR_Y - ORIGIN_Y);
  const cx = VIEW.width / 2;
  const cloth = game.cloth;
  ctx.fillStyle = PALETTE.sealed;
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`KAIN ${cloth.clothIndex + 1} SELESAI!`, cx, ORIGIN_Y + 48);
  // Stats row.
  const stats = [
    `SKOR ${game.score.toLocaleString('id-ID')}`,
    `MOTIF ${game.sealsTotal} tersegel`,
    `KOMBO MAX x${game.maxCombo}`,
    `NYAWA ${cloth.lives}`,
  ];
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = PALETTE.ink;
  ctx.fillText(stats.join('    •    '), cx, ORIGIN_Y + 76);
  ctx.fillStyle = PALETTE.sealed;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('PILIH 1 DARI 3 PUSAKA', cx, ORIGIN_Y + 112);

  const buttons = [];
  for (let i = 0; i < game.upgradeChoices.length; i += 1) {
    const b = game.upgradeChoices[i];
    const x = 120 + i * 250;
    const y = ORIGIN_Y + 128;
    const stacks = game.boonsOwned.filter((id) => id === b.id).length;
    ctx.fillStyle = '#1d2a5e';
    ctx.fillRect(x, y, 230, 168);
    ctx.strokeStyle = b.rarity === 'LANGKA' ? PALETTE.sealed : '#3a4a7d';
    ctx.lineWidth = b.rarity === 'LANGKA' ? 2.5 : 1.5;
    ctx.strokeRect(x, y, 230, 168);
    ctx.fillStyle = b.rarity === 'LANGKA' ? PALETTE.sealed : PALETTE.dim;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${i + 1} · ${b.rarity}${stacks > 0 ? ` · x${stacks + 1}` : ''}`, x + 12, y + 20);
    drawBoonIcon(ctx, b.icon, x + 115, y + 58, 16, b.rarity === 'LANGKA' ? PALETTE.sealed : '#9aa5c7');
    ctx.fillStyle = PALETTE.ink;
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(b.name, x + 115, y + 100);
    ctx.font = '13px sans-serif';
    ctx.fillText(b.text, x + 115, y + 122);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '12px sans-serif';
    ctx.fillText(b.flavor, x + 115, y + 142);
    buttons.push({ x, y, w: 230, h: 168, id: b.id });
  }
  // Next-cloth preview + owned build.
  const next = CLOTHS[Math.min(cloth.clothIndex + 1, CLOTHS.length - 1)];
  ctx.fillStyle = PALETTE.ink;
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`BERIKUTNYA: ${next.name} — ${next.motifs} motif · ${next.waves} gelombang${next.boss ? ' · BOSS NAGA PEWARNA' : ''}`, cx, ORIGIN_Y + 330);
  const owned = game.boonsOwned.length > 0
    ? game.boonsOwned.map((id) => boonById(id).name).join(' · ')
    : 'belum ada';
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '12px sans-serif';
  ctx.fillText(`PUSAKA DIMILIKI: ${owned}`, cx, ORIGIN_Y + 352);
  return buttons;
}

// Win screen with a stats grid and the grade — proof the run is complete.
export function drawWinPanel(ctx, game) {
  ctx.fillStyle = 'rgba(8, 12, 32, 0.78)';
  ctx.fillRect(0, ORIGIN_Y, VIEW.width, TOOLBAR_Y - ORIGIN_Y);
  const cx = VIEW.width / 2;
  const cloth = game.cloth;
  ctx.fillStyle = PALETTE.sealed;
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MAHAKARYA SELESAI!', cx, ORIGIN_Y + 56);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = '16px sans-serif';
  ctx.fillText('Kamu menamatkan 7 kain. Kain batik ini selamat dari banjir pewarna.', cx, ORIGIN_Y + 84);
  const stats = [
    ['SKOR', game.score.toLocaleString('id-ID')],
    ['GRADE', game.finalGrade || '—'],
    ['MOTIF TERSEGEL', String(game.sealsTotal)],
    ['KOMBO MAX', `x${game.maxCombo}`],
    ['WAKTU', game.runTimeText()],
    ['NYAWA TERSISA', String(cloth.lives)],
  ];
  for (let i = 0; i < stats.length; i += 1) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 190 + col * 200;
    const y = ORIGIN_Y + 128 + row * 64;
    ctx.fillStyle = '#1d2a5e';
    ctx.fillRect(x, y, 180, 52);
    ctx.strokeStyle = PALETTE.wax;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, 180, 52);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(stats[i][0], x + 90, y + 18);
    ctx.fillStyle = PALETTE.sealed;
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(stats[i][1], x + 90, y + 42);
  }
  const actions = [
    { id: 'endless', label: 'Endless — bertahan selama mungkin' },
    { id: 'again', label: 'Main lagi dari kain 1' },
    { id: 'menu', label: 'Kembali ke menu' },
  ];
  const buttons = [];
  for (let i = 0; i < actions.length; i += 1) {
    const bw = 400;
    const bh = 34;
    const bx = (VIEW.width - bw) / 2;
    const by = ORIGIN_Y + 280 + i * 44;
    ctx.fillStyle = '#2c3e6b';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = PALETTE.wax;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = PALETTE.ink;
    ctx.font = '15px sans-serif';
    ctx.fillText(actions[i].label, VIEW.width / 2, by + 22);
    buttons.push({ x: bx, y: by, w: bw, h: bh, id: actions[i].id });
  }
  return buttons;
}

// Banner text across the middle of the cloth (wave warnings, seals).
export function drawBanner(ctx, text, alpha) {
  if (!text || alpha <= 0) return;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = '#101736';
  ctx.fillRect(0, VIEW.height / 2 - 28, VIEW.width, 56);
  ctx.fillStyle = PALETTE.sealed;
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, VIEW.width / 2, VIEW.height / 2 + 9);
  ctx.globalAlpha = 1;
}
