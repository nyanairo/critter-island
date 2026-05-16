// Single authoritative game state + explicit actions.
// Every mutation goes through an action so persistence + time advance remain auditable.

import { save, load, clear } from "./save.js";

const STAT_CAP = 999;
const LIFESPAN_WEEKS = 50;
const START_MONEY = 100;

export const SCENES = {
  TITLE: "title",
  ISLAND: "island",
  SUMMON: "summon",
  TRAINING: "training",
  ARENA: "arena",
  HOME: "home",
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
    hallOfFame: [], // retired monsters
    lastBattle: null,
  };
}

export function loadOrInit() {
  const saved = load();
  if (saved && saved.game) return normalizeGame(saved.game);
  return initialGame();
}

// Defence in depth: same-version saves may be missing fields or have
// invalid scenes (manual edits, partial writes). Fill defaults rather than crash.
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
  }
  return g;
}

export function persist(game) {
  return save(game);
}

export function resetAll() {
  clear();
  return initialGame();
}

// --- Helpers ---

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

// --- Actions ---

export function setScene(game, scene) {
  game.scene = scene;
}

export function adoptMonster(game, monster) {
  game.monster = {
    ...monster,
    age: 0,
    fatigue: 0,
    wins: 0,
    losses: 0,
    retired: false,
  };
  addLog(game, `${monster.name} を仲間にした!`, "good");
}

// Returns { retired: bool } so callers can transition to retire scene.
export function advanceWeek(game) {
  const m = game.monster;
  if (!m || m.retired) return { retired: false };
  m.age += 1;
  // natural fatigue decay
  m.fatigue = Math.max(0, m.fatigue - 5);
  if (m.age >= LIFESPAN_WEEKS) {
    m.retired = true;
    addLog(game, `${m.name} は引退して殿堂入りした`, "info");
    return { retired: true };
  }
  return { retired: false };
}

export function retireToHall(game) {
  const m = game.monster;
  if (!m) return;
  game.hallOfFame.unshift({
    name: m.name,
    species: m.species,
    variant: m.variant,
    stats: { ...m.stats },
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
  addLog(game, `vs ${result.opponentName}: ${result.win ? "勝利!" : "敗北..."}`, result.win ? "good" : "bad");
}

export function applyTrainingResult(game, result) {
  // result: { menu, deltas: {hp,pow,spd,smt,spr}, fatigueAdd, message }
  const m = game.monster;
  if (!m || m.retired) return;
  for (const k of Object.keys(result.deltas)) {
    m.stats[k] = clampStat((m.stats[k] || 0) + result.deltas[k]);
  }
  m.fatigue = Math.max(0, Math.min(100, m.fatigue + result.fatigueAdd));
  addLog(game, result.message, "info");
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

export const constants = { STAT_CAP, LIFESPAN_WEEKS, START_MONEY };
