// Single authoritative game state + explicit actions.

import { save, load, clear } from "./save.js";
import { getSpecies } from "./species.js";
import { MOVE_IDS, LEARNABLE_POOL, STARTER_IDS_FOR_SPECIES, LEGACY_MOVE_IDS } from "./moves.js";
import { makeRng, deriveSeed } from "./rng.js";

const STAT_CAP = 999;
const LIFESPAN_WEEKS = 50;
const START_MONEY = 100;

export const SCENES = {
  TITLE: "title",
  ISLAND: "island",
  SUMMON: "summon",
  TRAINING: "training",
  ARENA: "arena",
  BATTLE: "battle",
  HOME: "home",
  STATUS: "status",
  RESULT: "result",
  RETIRE: "retire",
};

export function initialGame() {
  return {
    createdAt: new Date().toISOString(),
    scene: SCENES.TITLE,
    money: START_MONEY,
    week: 1,
    log: [],
    monster: null,
    hallOfFame: [],
    lastBattle: null,
    activeBattle: null,
  };
}

export function loadOrInit() {
  const saved = load();
  if (saved && saved.game) return normalizeGame(saved.game);
  return initialGame();
}

export function normalizeGame(raw) {
  const base = initialGame();
  if (!raw || typeof raw !== "object") return base;
  const g = { ...base, ...raw };
  if (!Object.values(SCENES).includes(g.scene)) g.scene = SCENES.TITLE;
  if (!Array.isArray(g.log)) g.log = [];
  if (!Array.isArray(g.hallOfFame)) g.hallOfFame = [];
  if (!Number.isFinite(g.money)) g.money = base.money;
  if (!Number.isFinite(g.week) || g.week < 1) g.week = 1;
  if (g.monster && typeof g.monster !== "object") g.monster = null;
  if (g.monster) {
    if (!g.monster.stats || typeof g.monster.stats !== "object") g.monster = null;
    else normalizeMonster(g.monster);
  }
  if (g.scene !== SCENES.BATTLE && g.activeBattle && g.activeBattle.done) g.activeBattle = null;
  return g;
}

export function persist(game) {
  return save(game);
}

export function resetAll() {
  clear();
  return initialGame();
}

export function clampStat(v) {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > STAT_CAP) return STAT_CAP;
  return Math.floor(v);
}

function addLog(game, line, kind = "info") {
  game.log.unshift({ week: game.week, line, kind });
  if (game.log.length > 40) game.log.length = 40;
}

export function setScene(game, scene) {
  game.scene = scene;
}

export function adoptMonster(game, monster) {
  const clean = { ...monster };
  normalizeMonster(clean);
  game.monster = {
    ...clean,
    age: 0,
    fatigue: 0,
    wins: 0,
    losses: 0,
    retired: false,
  };
  addLog(game, `${clean.name} joined you.`, "good");
}

export function advanceWeek(game) {
  const m = game.monster;
  if (!m || m.retired) return { retired: false };
  m.age += 1;
  m.fatigue = Math.max(0, m.fatigue - 5);
  if (m.age >= LIFESPAN_WEEKS) {
    m.retired = true;
    addLog(game, `${m.name} retired and is ready for the hall of fame.`, "info");
    return { retired: true };
  }
  return { retired: false };
}

export function retireToHall(game) {
  const m = game.monster;
  if (!m) return;
  normalizeMonster(m);
  game.hallOfFame.unshift({
    name: m.name,
    species: m.species,
    variant: m.variant,
    stats: { ...m.stats },
    knownMoves: [...m.knownMoves],
    equipped: [...m.equipped],
    spMax: m.spMax,
    wins: m.wins,
    losses: m.losses,
    finalWeek: game.week,
    retiredAt: new Date().toISOString(),
  });
  if (game.hallOfFame.length > 20) game.hallOfFame.length = 20;
  game.monster = null;
}

export function addMoney(game, amount, reason) {
  game.money = Math.max(0, game.money + amount);
  if (reason) addLog(game, `${amount >= 0 ? "+" : ""}${amount}G (${reason})`, amount >= 0 ? "good" : "bad");
}

export function logBattleResult(game, result) {
  game.lastBattle = result;
  const m = game.monster;
  if (!m) return;
  if (result.win) m.wins += 1; else m.losses += 1;
  addLog(game, `vs ${result.opponentName}: ${result.win ? "win" : "loss"}`, result.win ? "good" : "bad");
  rollLearnMove(game, 0.15, "battle:" + game.week + ":" + (result.seed || 0));
}

export function applyTrainingResult(game, result) {
  const m = game.monster;
  if (!m || m.retired) return;
  for (const k of Object.keys(result.deltas)) {
    m.stats[k] = clampStat((m.stats[k] || 0) + result.deltas[k]);
  }
  m.fatigue = Math.max(0, Math.min(100, m.fatigue + result.fatigueAdd));
  m.spMax = computeSpMax(m);
  addLog(game, result.message, "info");
  rollLearnMove(game, 0.05, "training:" + game.week + ":" + result.menu);
}

export function addFatigue(game, amount) {
  const m = game.monster;
  if (!m || m.retired) return;
  m.fatigue = Math.max(0, Math.min(100, m.fatigue + amount));
}

export function tickWeekForTraining(game) {
  game.week += 1;
  return advanceWeek(game);
}

export function computeSpMax(monster) {
  return 12 + Math.floor(((monster && monster.stats && monster.stats.smt) || 0) / 10);
}

export function equipMove(game, slotIndex, moveId) {
  const m = game.monster;
  if (!m || m.retired) return false;
  normalizeMonster(m);
  if (!m.knownMoves.includes(moveId) || slotIndex < 0 || slotIndex >= 3) return false;
  m.equipped[slotIndex] = moveId;
  m.move = m.equipped[0];
  addLog(game, `${moveId} equipped.`, "info");
  return true;
}

export function normalizeMonster(monster) {
  const starters = STARTER_IDS_FOR_SPECIES(monster.species);
  const legacyMove = toMoveId(monster.move);
  const known = Array.isArray(monster.knownMoves) ? monster.knownMoves.map(toMoveId).filter(Boolean) : [];
  for (const id of starters) {
    if (!known.includes(id)) known.push(id);
  }
  if (legacyMove && !known.includes(legacyMove)) known.push(legacyMove);
  monster.knownMoves = known.filter(id => MOVE_IDS.includes(id));
  if (monster.knownMoves.length === 0) monster.knownMoves = starters;

  const equipped = Array.isArray(monster.equipped)
    ? monster.equipped.map(toMoveId).filter(id => monster.knownMoves.includes(id))
    : [];
  if (equipped.length === 0) equipped.push(...starters);
  monster.equipped = equipped.slice(0, 3);
  while (monster.equipped.length < 3 && monster.knownMoves.length > 0) {
    monster.equipped.push(monster.knownMoves[monster.equipped.length % monster.knownMoves.length]);
  }
  monster.spMax = computeSpMax(monster);
  monster.move = monster.equipped[0];
}

function toMoveId(value) {
  if (!value) return null;
  if (MOVE_IDS.includes(value)) return value;
  return LEGACY_MOVE_IDS[value] || null;
}

function rollLearnMove(game, chance, tag) {
  const m = game.monster;
  if (!m || m.retired) return null;
  normalizeMonster(m);
  const unknown = LEARNABLE_POOL.filter(id => !m.knownMoves.includes(id));
  if (unknown.length === 0) return null;
  const rng = makeRng(deriveSeed((m.seed || 0) ^ game.week, "learn:" + tag));
  if (!rng.chance(chance)) return null;
  const learned = rng.pick(unknown);
  m.knownMoves.push(learned);
  addLog(game, `${m.name} learned ${learned}.`, "good");
  return learned;
}

export const constants = { STAT_CAP, LIFESPAN_WEEKS, START_MONEY };
