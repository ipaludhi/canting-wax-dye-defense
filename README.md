# CANTING — Wax & Dye Defense

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/ipaludhi/canting-wax-dye-defense/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/ipaludhi/canting-wax-dye-defense/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A complete original 2D browser game for make.fun's **best-game-01** bounty.
You are a batik artisan. Dye floods in from the edges of the cloth — draw
lines of hot wax with the mouse to hold it back, seal every motif, and
protect the sacred motif in the middle.

7 cloths · 7 realms · 4 motifs · 8 pusaka · 5 wave kinds · 4 tools · boss
Naga Pewarna · 3 difficulties + Endless.

## How to play

- **Mouse (drag):** draw wax lines. Wax is limited and refills over time.
- **1 / 2:** wax tool / erase tool. **3 or F:** freeze the dye for a few seconds.
  **4:** Ranjau Malam — click to place a wax mine. When dye touches it, the
  mine bursts into a ring of wax. Mines are limited (3 per cloth, +1 per wave),
  so placement is a decision: guard the sacred motif, or plug a gap the flood
  is about to take.
- **Space / P:** pause. **R:** restart. **M:** mute.
- **Goal:** seal all motifs on the cloth to clear it. 7 named cloths, each a
  realm with its own palette (Dataran Tenun, Hutan Kawung, Lereng Parang,
  Langit Mendung, Taman Ceplok, Kota Sogan, Sarang Naga), a boss
  (Naga Pewarna) on the 7th, pusaka (boon) picks between cloths, 3 difficulties
  with per-difficulty best scores and grades, and an Endless mode after you win.
- **Waves:** 5 kinds — TETES (Si Tetes), ARUS (Arus Liar), BANJIR (Banjir Besar),
  REMBESAN (Si Rembes — seeps in from inside, telegraphed with red markers 2
  seconds before it lands), PUSARAN (a dye ring). The HUD shows the INCOMING
  list with each foe's name and count.
- **Combo:** sealing motifs back-to-back (within 8 seconds) raises a multiplier
  up to x5. The HUD always shows the win condition, the lose condition, the
  next wave, and the four tools.
- **Lose a life** if dye touches the sacred motif or covers more than 60%
  of the cloth. Lose all 3 lives and the cloth is ruined.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests: `game/index.html` and its ES modules
under `game/src/` are the whole game.

## Structure

- `game/src/config.js` — all tuning: grid, wax, mines, scoring, palette, combo, grades, realms
- `game/src/waves.js` — wave kinds: names, foe names, colours, spawn behaviour, rotation
- `game/src/juice.js` — feel: trauma shake, hitstop, seal pops, easings
- `game/src/random.js` — seeded RNG so every cloth is reproducible
- `game/src/input.js` — keyboard + mouse, held/pressed/released states
- `game/src/audio.js` — WebAudio synthesis, no audio files
- `game/src/cloth.js` — the grid: dye spread, wax, mines, seal detection, boss
- `game/src/motifs.js` — motif shapes (Parang/Kawung/Mega Mendung/Ceplok) and the Naga boss
- `game/src/motif-art.js` — batik patterns inside motifs, the sacred ornament, the Naga
- `game/src/boons.js` — pusaka definitions (rarity, icon, effect) and picks
- `game/src/hud.js` — HUD bar, tool bar, pusaka chips, and title/upgrade/win panels
- `game/src/floaters.js` — floating score text (+1.500, KOMBO x3!)
- `game/src/particles.js` — pooled particles (bursts, splashes)
- `game/src/render.js` — drawing the cloth: realm field, dye flood, wax, mines, telegraphs
- `game/src/game.js` — state machine: title, play, upgrade, pause, over, win
- `game/src/shots.js` — deterministic screenshot scenes (`?shot=…`)
- `game/src/main.js` — fixed-timestep game loop and bootstrap
- `main.ts` — the entry program: writes `game/`, `screenshots/`, `dossier.json`

## License

MIT — see `LICENSE`.
