# Critter Island

A small browser game about summoning, training, and battling island critters.

## Run

Use any static HTTP server from the project root:

```bash
npx serve -l 8000
# http://localhost:8000/
```

or:

```bash
python -m http.server 8000
```

## Controls

- `1` Shrine
- `2` Training
- `3` Arena
- `4` Home
- `S` Status from any non-title scene
- `Esc` or `B` Back to island where available

## v0.2 Feature Set

- Fourteen id-based moves in `src/game/moves.js`.
- Each summoned critter starts with three species moves, known moves, equipped moves, and SP.
- Turn-by-turn battles with HP/SP bars, SP costs, SP recovery after actions, disabled unaffordable moves, and a wait fallback.
- Move learning after training and battles from a five-move learnable pool.
- Status scene with stat bars, equipped move swapping, and known move list.
- Save version is now `2`; older v1 saves are normalized on load.
