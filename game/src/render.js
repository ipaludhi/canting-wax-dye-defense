// CANTING: everything the player sees.
// The cloth is drawn cell by cell: indigo cloth, gold wax, spreading dye,
// motif outlines that turn gold when sealed, and the pale sacred centre.
// Screens (title, upgrade, pause, over, win) are panels drawn over the cloth.
// All coordinates are logical pixels; the canvas is scaled for HiDPI by main.js.

import { CELL, GRID, PALETTE, VIEW } from './config.js';
import { SACRED } from './motifs.js';

const CELL_PX = GRID.cell;
const ORIGIN_Y = VIEW.hudHeight;

function cellColor(x, y) {
  return (x + y) % 2 === 0 ? PALETTE.cloth : PALETTE.clothAlt;
}

function dyeColor(x, y) {
  return PALETTE.dye[(x * 7 + y * 3) % PALETTE.dye.length];
}

// Draw the cloth grid: wax, dye, motifs, sacred centre, boss.
export function drawCloth(ctx, cloth, time) {
  for (let y = 0; y < GRID.rows; y += 1) {
    for (let x = 0; x < GRID.cols; x += 1) {
      const px = x * CELL_PX;
      const py = ORIGIN_Y + y * CELL_PX;
      const kind = cloth.grid[y * GRID.cols + x];
      if (kind === CELL.WAX) {
        ctx.fillStyle = PALETTE.wax;
        ctx.fillRect(px + 1, py + 1, CELL_PX - 2, CELL_PX - 2);
      } else if (kind === CELL.DYE) {
        ctx.fillStyle = dyeColor(x, y);
        ctx.globalAlpha = 0.92;
        ctx.fillRect(px, py, CELL_PX, CELL_PX);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = cellColor(x, y);
        ctx.fillRect(px, py, CELL_PX, CELL_PX);
      }
    }
  }

  // Sacred centre: a pale square the player must protect.
  const pulse = 0.6 + 0.4 * Math.sin(time * 2);
  ctx.fillStyle = PALETTE.sacred;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(SACRED.x * CELL_PX, ORIGIN_Y + SACRED.y * CELL_PX, SACRED.w * CELL_PX, SACRED.h * CELL_PX);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#b9770e';
  ctx.lineWidth = 2;
  ctx.strokeRect(SACRED.x * CELL_PX + 2, ORIGIN_Y + SACRED.y * CELL_PX + 2, SACRED.w * CELL_PX - 4, SACRED.h * CELL_PX - 4);
  ctx.fillStyle = '#7d6608';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MOTIF SUCI', (SACRED.x + SACRED.w / 2) * CELL_PX, ORIGIN_Y + (SACRED.y + SACRED.h / 2) * CELL_PX + 5);

  // Motifs: coloured outlines, gold fill once sealed.
  for (let i = 0; i < cloth.motifs.length; i += 1) {
    const motif = cloth.motifs[i];
    ctx.strokeStyle = motif.sealed ? PALETTE.sealed : motif.color;
    ctx.lineWidth = motif.sealed ? 4 : 2;
    ctx.globalAlpha = motif.sealed ? 1 : 0.7 + 0.3 * pulse;
    ctx.strokeRect(motif.x * CELL_PX + 1, ORIGIN_Y + motif.y * CELL_PX + 1, motif.w * CELL_PX - 2, motif.h * CELL_PX - 2);
    if (motif.sealed) {
      ctx.fillStyle = PALETTE.sealed;
      ctx.globalAlpha = 0.25;
      ctx.fillRect(motif.x * CELL_PX, ORIGIN_Y + motif.y * CELL_PX, motif.w * CELL_PX, motif.h * CELL_PX);
    }
    ctx.globalAlpha = 1;
  }

  // The boss serpent, when the cloth has one.
  if (cloth.naga && cloth.naga.alive) {
    const naga = cloth.naga;
    for (let s = 0; s < naga.segments; s += 1) {
      const sx = (naga.x - s * naga.dir * 1.2) * CELL_PX;
      const sy = ORIGIN_Y + (1 + Math.sin(time * 3 + s * 0.8) * 0.4) * CELL_PX;
      ctx.fillStyle = s === 0 ? '#922b21' : '#c0392b';
      ctx.beginPath();
      ctx.arc(sx, sy, CELL_PX * (0.9 - s * 0.05), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#f5d76e';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NAGA PEWARNA', naga.x * CELL_PX, ORIGIN_Y + 46);
  }
}

// The top HUD bar: cloth, score, lives, wax meter, dye meter, motifs, freeze.
export function drawHud(ctx, game) {
  const cloth = game.cloth;
  ctx.fillStyle = '#101736';
  ctx.fillRect(0, 0, VIEW.width, VIEW.hudHeight);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`KAIN ${cloth.clothIndex + 1}/7`, 12, 24);
  ctx.font = '15px sans-serif';
  ctx.fillText(`Skor ${game.score}`, 12, 44);
  ctx.textAlign = 'center';
  ctx.fillText(`Motif ${cloth.sealedCount}/${cloth.motifs.length}`, 300, 24);
  ctx.fillText(`Gelombang ${cloth.wave}/${cloth.wavesTotal}`, 300, 44);

  // Lives as wax drops.
  ctx.textAlign = 'left';
  let hearts = '';
  for (let i = 0; i < cloth.lives; i += 1) hearts += '● ';
  ctx.fillStyle = '#e74c3c';
  ctx.font = '16px sans-serif';
  ctx.fillText(hearts, 430, 24);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = '13px sans-serif';
  ctx.fillText(`${game.difficultyLabel}  •  Beku ${cloth.freezeCooldown > 0 ? '…' : 'siap'}`, 430, 44);

  // Wax meter.
  ctx.fillStyle = '#2c3e6b';
  ctx.fillRect(620, 12, 160, 12);
  ctx.fillStyle = PALETTE.wax;
  ctx.fillRect(620, 12, 160 * (cloth.wax / cloth.waxMax), 12);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = '12px sans-serif';
  ctx.fillText('MALAM', 620, 38);

  // Dye meter: how much of the cloth is lost.
  const frac = cloth.dyeFraction();
  ctx.fillStyle = '#2c3e6b';
  ctx.fillRect(800, 12, 140, 12);
  ctx.fillStyle = frac > 0.45 ? '#e74c3c' : '#8e44ad';
  ctx.fillRect(800, 12, 140 * Math.min(1, frac), 12);
  ctx.fillStyle = PALETTE.ink;
  ctx.fillText(`PEWARNA ${Math.round(frac * 100)}%`, 800, 38);
}

// A dim panel with a title and lines of text, centred on the cloth.
export function drawPanel(ctx, title, lines, actions) {
  ctx.fillStyle = 'rgba(8, 12, 32, 0.82)';
  ctx.fillRect(0, ORIGIN_Y, VIEW.width, VIEW.height - ORIGIN_Y);
  const w = 560;
  const h = 120 + lines.length * 26 + actions.length * 44;
  const x = (VIEW.width - w) / 2;
  const y = ORIGIN_Y + (VIEW.height - ORIGIN_Y - h) / 2;
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
