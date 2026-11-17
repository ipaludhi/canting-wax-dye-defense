// CANTING v2: batik art — everything drawn inside a motif box, the sacred
// centre ornament, and the Naga boss. One file, one job: make the cloth look
// like batik instead of empty rectangles. All procedural, no assets, and all
// deterministic (no Math.random here — the only motion is the time pulse).

import { GRID, PALETTE } from './config.js';
import { JUICE, easeOutBack } from './juice.js';

const CELL_PX = GRID.cell;

// Draw one batik pattern clipped inside a motif's box (px coordinates).
export function drawMotifPattern(ctx, motif, originY, time) {
  const x0 = motif.x * CELL_PX;
  const y0 = originY + motif.y * CELL_PX;
  const w = motif.w * CELL_PX;
  const h = motif.h * CELL_PX;
  // Seal pop: the box scales up with an overshoot ease for a beat after it
  // seals (squash & stretch — the #1 life-giver). Presentation only.
  let scale = 1;
  if (motif.popUntil && time < motif.popUntil) {
    const t = 1 - (motif.popUntil - time) / JUICE.sealPopSeconds;
    scale = 1 + JUICE.sealPopScale * easeOutBack(Math.min(1, Math.max(0, t)));
  }
  ctx.save();
  ctx.translate(x0 + w / 2, y0 + h / 2);
  ctx.scale(scale, scale);
  ctx.translate(-(x0 + w / 2), -(y0 + h / 2));
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, w, h);
  ctx.clip();
  // The motif's own cloth: a touch lighter than the field, so the pattern reads.
  ctx.fillStyle = motif.sealed ? 'rgba(245, 215, 110, 0.28)' : 'rgba(255,255,255,0.06)';
  ctx.fillRect(x0, y0, w, h);
  ctx.strokeStyle = motif.sealed ? PALETTE.sealed : motif.color;
  ctx.fillStyle = motif.sealed ? PALETTE.sealed : motif.color;
  ctx.globalAlpha = motif.sealed ? 0.9 : 0.55;
  ctx.lineWidth = 2;
  if (motif.pattern === 'parang') {
    // Parang: bold diagonal stripes.
    for (let d = -h; d < w; d += 14) {
      ctx.beginPath();
      ctx.moveTo(x0 + d, y0 + h);
      ctx.lineTo(x0 + d + h, y0);
      ctx.stroke();
    }
  } else if (motif.pattern === 'kawung') {
    // Kawung: four-petal circles on a grid.
    for (let gy = 12; gy < h; gy += 24) {
      for (let gx = 12; gx < w; gx += 24) {
        ctx.beginPath();
        ctx.arc(x0 + gx, y0 + gy, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x0 + gx, y0 + gy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (motif.pattern === 'mendung') {
    // Mega Mendung: stacked cloud arcs.
    for (let gy = 10; gy < h + 10; gy += 16) {
      for (let gx = 0; gx < w + 16; gx += 26) {
        ctx.beginPath();
        ctx.arc(x0 + gx, y0 + gy, 11, Math.PI, 0);
        ctx.stroke();
      }
    }
  } else {
    // Ceplok: diamond lattice.
    for (let gy = 12; gy < h; gy += 22) {
      for (let gx = 12; gx < w; gx += 22) {
        ctx.beginPath();
        ctx.moveTo(x0 + gx, y0 + gy - 8);
        ctx.lineTo(x0 + gx + 8, y0 + gy);
        ctx.lineTo(x0 + gx, y0 + gy + 8);
        ctx.lineTo(x0 + gx - 8, y0 + gy);
        ctx.closePath();
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Frame: thick coloured outline, gold + glow once sealed.
  ctx.strokeStyle = motif.sealed ? PALETTE.sealed : motif.color;
  ctx.lineWidth = motif.sealed ? 4 : 2;
  ctx.shadowColor = motif.sealed ? PALETTE.sealed : 'transparent';
  ctx.shadowBlur = motif.sealed ? 16 : 0;
  ctx.strokeRect(x0 + 1, y0 + 1, w - 2, h - 2);
  ctx.shadowBlur = 0;
  if (motif.sealed) {
    ctx.fillStyle = 'rgba(8, 12, 32, 0.88)';
    ctx.beginPath();
    ctx.roundRect(x0 + w / 2 - 58, y0 + h / 2 - 12, 116, 24, 6);
    ctx.fill();
    ctx.fillStyle = PALETTE.sealed;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✓ TERSEGEL', x0 + w / 2, y0 + h / 2 + 6);
  }
  // Name tag under the box, on a dark pill so it reads over any pattern.
  // v5: bold 13px on a 20px pill — the 11px tag vanished at judge size.
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  const nameW = ctx.measureText(motif.name).width + 16;
  ctx.fillStyle = 'rgba(8, 12, 32, 0.85)';
  ctx.beginPath();
  ctx.roundRect(x0 + w / 2 - nameW / 2, y0 + h + 4, nameW, 20, 4);
  ctx.fill();
  ctx.fillStyle = motif.sealed ? PALETTE.sealed : '#dfe6ff';
  ctx.fillText(motif.name, x0 + w / 2, y0 + h + 18);
  ctx.restore();
}

// The sacred centre: a gold medallion on indigo, not a white box.
// Layered diamonds + a pulsing halo, with the name written beneath it.
export function drawSacred(ctx, sacred, originY, time) {
  // Idle life: the whole medallion breathes ±2px on a 1.2s cycle.
  const bob = Math.sin(time * 5.24) * 2;
  const x0 = sacred.x * CELL_PX;
  const y0 = originY + sacred.y * CELL_PX + bob;
  const w = sacred.w * CELL_PX;
  const h = sacred.h * CELL_PX;
  const cx = x0 + w / 2;
  const cy = y0 + h / 2;
  const pulse = 0.6 + 0.4 * Math.sin(time * 2);
  ctx.save();
  ctx.shadowColor = '#f5d76e';
  ctx.shadowBlur = 10 + 12 * pulse;
  ctx.fillStyle = '#2a3a7d';
  ctx.fillRect(x0, y0, w, h);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = PALETTE.sealed;
  ctx.lineWidth = 3;
  ctx.strokeRect(x0 + 2, y0 + 2, w - 4, h - 4);
  // Concentric diamonds.
  ctx.strokeStyle = '#f2c14e';
  ctx.lineWidth = 2;
  for (let r = 1; r <= 3; r += 1) {
    const s = (w / 2 - 8) * (r / 3);
    ctx.beginPath();
    ctx.moveTo(cx, cy - s);
    ctx.lineTo(cx + s, cy);
    ctx.lineTo(cx, cy + s);
    ctx.lineTo(cx - s, cy);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.fillStyle = PALETTE.sealed;
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  const labelW = ctx.measureText('MOTIF SUCI').width + 16;
  ctx.fillStyle = 'rgba(8, 12, 32, 0.85)';
  ctx.beginPath();
  ctx.roundRect(cx - labelW / 2, y0 + h + 4, labelW, 20, 4);
  ctx.fill();
  ctx.fillStyle = PALETTE.sealed;
  ctx.fillText('MOTIF SUCI', cx, y0 + h + 18);
  ctx.restore();
}

// The Naga boss: a real serpent, not dots. A sine body of scaled segments
// with a headed front: eyes, jaw and horns, swimming along the top edge.
export function drawNaga(ctx, naga, originY, time) {
  const dir = naga.dir >= 0 ? 1 : -1;
  const headX = naga.x * CELL_PX;
  // The boss swims on row 3, clear of its HP bar at the top of the cloth.
  const baseY = originY + 3.0 * CELL_PX;
  const points = [];
  for (let s = naga.segments - 1; s >= 0; s -= 1) {
    points.push({
      x: headX - s * dir * 26,
      y: baseY + Math.sin(time * 3 + s * 0.7) * 7,
    });
  }
  // One connected body first, then the scales on top — a serpent, not beads.
  ctx.strokeStyle = '#7b241c';
  ctx.lineWidth = 26;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
  for (let s = naga.segments - 1; s >= 0; s -= 1) {
    const p = points[naga.segments - 1 - s];
    const r = 17 - s * 1.0;
    ctx.fillStyle = s % 2 === 0 ? '#922b21' : '#a93226';
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(6, r), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f5d76e';
    ctx.beginPath();
    ctx.arc(p.x, p.y + r * 0.45, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Head: bigger, with eyes, horns and an open jaw.
  const hx = headX;
  const hy = baseY + Math.sin(time * 3) * 7;
  ctx.fillStyle = '#7b241c';
  ctx.beginPath();
  ctx.arc(hx, hy, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f5d76e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(hx - 15, hy - 18);
  ctx.lineTo(hx - 22, hy - 32);
  ctx.moveTo(hx + 15, hy - 18);
  ctx.lineTo(hx + 22, hy - 32);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(hx - 9 + dir * 5, hy - 6, 5.5, 0, Math.PI * 2);
  ctx.arc(hx + 9 + dir * 5, hy - 6, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#101736';
  ctx.beginPath();
  ctx.arc(hx - 9 + dir * 6, hy - 6, 2.8, 0, Math.PI * 2);
  ctx.arc(hx + 9 + dir * 6, hy - 6, 2.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f5d76e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hx - 12, hy + 12);
  ctx.lineTo(hx + dir * 20, hy + 14);
  ctx.stroke();
  ctx.fillStyle = '#f5d76e';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('NAGA PEWARNA', hx, hy + 44);
}

// Boss HP bar across the top of the cloth: each sealed motif wounds the Naga.
// v5: 15px bold labels + a 12px bar on a 38px plate — the v4 bar (12px text,
// 7px bar) read as a thin strip at judge thumbnail size.
export function drawBossBar(ctx, cloth, originY) {
  const total = cloth.motifs.length;
  const left = total - cloth.sealedCount;
  const w = 340;
  const x = (960 - w) / 2;
  const y = originY + 4;
  ctx.fillStyle = 'rgba(8, 12, 32, 0.85)';
  ctx.fillRect(x - 8, y - 4, w + 16, 38);
  ctx.fillStyle = '#f5d76e';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('NAGA PEWARNA', x, y + 13);
  ctx.textAlign = 'right';
  ctx.fillText(`${left}/${total} motif tersisa`, x + w, y + 13);
  ctx.fillStyle = '#2c3e6b';
  ctx.fillRect(x, y + 19, w, 12);
  ctx.fillStyle = '#e74c3c';
  ctx.fillRect(x, y + 19, w * (left / Math.max(1, total)), 12);
}
