// CANTING: bootstrap and the game loop.
// The loop runs at a fixed 60 Hz step with an accumulator, so the game plays
// the same speed on every monitor. Frame time is capped at 0.25 seconds so a
// tab that was hidden cannot flood the game with catch-up steps.
// With ?shot=title|play|boss|end in the URL the game stages that scene once
// (same seed, same frame, every run) and draws it without starting the loop,
// which is how the screenshots are taken.

import { Game, SCREEN_PLAY } from './game.js';
import { stageShot } from './shots.js';
import { VIEW } from './config.js';

const FIXED_DT = 1 / 60;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// HiDPI: keep logical coordinates for all game math, scale the backing store.
function setupCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = VIEW.width * dpr;
  canvas.height = VIEW.height * dpr;
  canvas.style.width = VIEW.width + 'px';
  canvas.style.height = VIEW.height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
setupCanvas();
window.addEventListener('resize', setupCanvas);

const game = new Game(canvas);
window.__canting = game;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  const seed = Number(params.get('seed') || 1);
  stageShot(shot, game, seed);
  game.render(ctx);
} else {
  let lastTime = 0;
  let accumulator = 0;
  let started = false;
  function loop(timestamp) {
    requestAnimationFrame(loop);
    if (!started) {
      started = true;
      lastTime = timestamp;
      return;
    }
    const frameTime = Math.min((timestamp - lastTime) / 1000, 0.25);
    lastTime = timestamp;
    accumulator += frameTime;
    while (accumulator >= FIXED_DT) {
      game.update(FIXED_DT);
      accumulator -= FIXED_DT;
    }
    game.render(ctx);
    game.input.endFrame();
  }
  requestAnimationFrame(loop);
}
