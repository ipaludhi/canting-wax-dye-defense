# CANTING — Wax & Dye Defense

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/ipaludhi/canting-wax-dye-defense/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/ipaludhi/canting-wax-dye-defense/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A complete original 2D browser game for make.fun's **best-game-01** bounty.
You are a batik artisan. Dye floods in from the edges of the cloth — draw
lines of hot wax with the mouse to hold it back, seal every motif, and
protect the sacred motif in the middle.

## How to play

- **Mouse (drag):** draw wax lines. Wax is limited and refills over time.
- **1 / 2:** wax tool / erase tool. **3 or F:** freeze the dye for a few seconds.
- **Space / P:** pause. **R:** restart. **M:** mute.
- **Goal:** seal all motifs on the cloth to clear it. 7 cloths, a boss
  (Naga Pewarna) on the 7th, upgrades between cloths, 3 difficulties,
  and an Endless mode after you win.
- **Lose a life** if dye touches the sacred motif or covers more than 55%
  of the cloth. Lose all 3 lives and the cloth is ruined.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests: `game/index.html` and its ES modules
under `game/src/` are the whole game.

## Structure

- `game/src/config.js` — all tuning: grid, wax, waves, scoring, palette
- `game/src/random.js` — seeded RNG so every cloth is reproducible
- `game/src/input.js` — keyboard + mouse, held/pressed/released states
- `game/src/audio.js` — WebAudio synthesis, no audio files
- `game/src/cloth.js` — the grid: dye spread, wax, seal detection, boss
- `game/src/motifs.js` — motif shapes and the Naga boss
- `game/src/particles.js` — particles and screen shake
- `game/src/render.js` — drawing the cloth, HUD, and screens
- `game/src/game.js` — state machine: title, play, upgrade, pause, over, win
- `game/src/shots.js` — deterministic screenshot scenes (`?shot=…`)
- `game/src/main.js` — fixed-timestep game loop and bootstrap
- `main.ts` — the entry program: writes `game/`, `screenshots/`, `dossier.json`

## License

MIT — see `LICENSE`.
