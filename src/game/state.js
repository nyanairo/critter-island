// Single authoritative game state + explicit actions.

import { save, load, clear } from "./save.js";
import { MOVE_IDS, LEARNABLE_POOL, STARTER_IDS_FOR_SPECIES, LEGACY_MOVE_IDS, getMove } from "./moves.js";
import { makeRng, deriveSeed } from "./rng.js";

const STAT_CAP = 999;
export const TRAINING_LIMIT = 20;
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
  DEX: "dex",
  COLLECTION: "collection",
  RESULT: "result",
};

export function initialGame() {
  return {
    createdAt: new Date().toISOString(),
    scene: SCENES.TITLE,
    money: START_MONEY,
    week: 1,
    log: [],
    monsters: [],
    activeMonsterId: null,
    lastBattle: null,
    lastTraining: null,
    activeBattle: null,
    dex: { summoned: [], encountered: [] },
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
  if (g.scene === "retire") g.scene = SCENES.COLLECTION;
  if (!Array.isArray(g.log)) g.log = [];
  if (!Number.isFinite(g.money)) g.money = base.money;
  if (!Number.isFinite(g.week) || g.week < 1) g.week = 1;
  normalizeDex(g);

  const migrated = [];
  if (Array.isArray(raw.monsters)) migrated.push(...raw.monsters);
  if (raw.monster && typeof raw.monster === "object" && raw.monster.stats) migrated.push(raw.monster);
  if (Array.isArray(raw.hallOfFame)) {
    for (const entry of raw.hallOfFame) {
      if (!entry || typeof entry !== "object" || !entry.stats) continue;
      migrated.push({
        ...entry,
        age: Number.isFinite(entry.finalWeek) ? entry.finalWeek : 0,
        fatigue: 0,
        trainingsUsed: TRAINING_LIMIT,
        seed: entry.seed || Date.now(),
      });
    }
  }

  g.monsters = [];
  for (const source of migrated) {
    const m = { ...source };
    delete m.retired;
    normalizeMonster(m);
    if (!g.monsters.some(existing => existing.id === m.id)) g.monsters.push(m);
    markDex(g, "summoned", m.species);
  }
  g.monsters = dedupeMonstersBySpecies(g.monsters);

  g.activeMonsterId = g.monsters.some(m => m.id === raw.activeMonsterId)
    ? raw.activeMonsterId
    : (bestMonster(g.monsters)?.id || null);
  delete g.monster;
  delete g.hallOfFame;
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

function normalizeDex(game) {
  if (!game.dex || typeof game.dex !== "object") game.dex = { summoned: [], encountered: [] };
  if (!Array.isArray(game.dex.summoned)) game.dex.summoned = [];
  if (!Array.isArray(game.dex.encountered)) game.dex.encountered = [];
}

function markDex(game, bucket, speciesId) {
  if (!speciesId) return;
  normalizeDex(game);
  if (!game.dex[bucket].includes(speciesId)) game.dex[bucket].push(speciesId);
}

function makeMonsterId(monster) {
  const seed = monster.seed ?? Math.floor(Math.random() * 0xffffffff);
  return `seed_${seed}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

export function getActiveMonster(game) {
  if (!game || !Array.isArray(game.monsters)) return null;
  return game.monsters.find(m => m.id === game.activeMonsterId) || null;
}

export function findMonsterBySpecies(game, speciesId) {
  if (!game || !Array.isArray(game.monsters)) return null;
  return game.monsters.find(m => m.species === speciesId) || null;
}

export function setScene(game, scene) {
  game.scene = scene;
}

export function adoptMonster(game, monster) {
  if (!Array.isArray(game.monsters)) game.monsters = [];
  const clean = { ...monster, id: monster.id || makeMonsterId(monster) };
  normalizeMonster(clean);
  game.monsters.push({
    ...clean,
    age: Number.isFinite(clean.age) ? clean.age : 0,
    fatigue: Number.isFinite(clean.fatigue) ? clean.fatigue : 0,
    trainingsUsed: Number.isFinite(clean.trainingsUsed) ? clean.trainingsUsed : 0,
    wins: Number.isFinite(clean.wins) ? clean.wins : 0,
    losses: Number.isFinite(clean.losses) ? clean.losses : 0,
  });
  game.activeMonsterId = clean.id;
  markDex(game, "summoned", clean.species);
  addLog(game, `${clean.name} を仲間にした!`, "good");
}

export function switchActiveMonster(game, id) {
  if (!Array.isArray(game.monsters) || !game.monsters.some(m => m.id === id)) return false;
  game.activeMonsterId = id;
  return true;
}

export function releaseMonster(game, id) {
  if (!Array.isArray(game.monsters)) return false;
  const before = game.monsters.length;
  game.monsters = game.monsters.filter(m => m.id !== id);
  if (game.monsters.length === before) return false;
  if (game.activeMonsterId === id) game.activeMonsterId = game.monsters[0]?.id || null;
  return true;
}

export function advanceWeek(game) {
  const m = getActiveMonster(game);
  if (!m) return { advanced: false };
  m.age += 1;
  m.fatigue = Math.max(0, m.fatigue - 8);
  return { advanced: true };
}

export function addMoney(game, amount, reason) {
  game.money = Math.max(0, game.money + amount);
  if (reason) addLog(game, `${amount >= 0 ? "+" : ""}${amount}G (${reason})`, amount >= 0 ? "good" : "bad");
}

export function logBattleResult(game, result) {
  game.lastBattle = result;
  const m = getActiveMonster(game);
  if (!m) return;
  if (result.opponentSpecies) markDex(game, "encountered", result.opponentSpecies);
  if (result.win) m.wins += 1; else m.losses += 1;
  addLog(game, `vs ${result.opponentName}: ${result.win ? "勝利!" : "敗北..."}`, result.win ? "good" : "bad");
  result.learned = rollLearnMove(game, 0.15, "battle:" + game.week + ":" + (result.seed || 0));
}

export function applyTrainingResult(game, result) {
  const m = getActiveMonster(game);
  if (!m || m.trainingsUsed >= TRAINING_LIMIT) return;
  for (const k of Object.keys(result.deltas)) {
    m.stats[k] = clampStat((m.stats[k] || 0) + result.deltas[k]);
  }
  m.trainingsUsed = Math.min(TRAINING_LIMIT, (m.trainingsUsed || 0) + 1);
  m.fatigue = Math.max(0, Math.min(100, m.fatigue + result.fatigueAdd));
  m.spMax = computeSpMax(m);
  addLog(game, result.message, "info");
  const learned = rollLearnMove(game, 0.05, "training:" + game.week + ":" + result.menu);
  game.lastTraining = { menu: result.menu, message: result.message, learned };
}

export function addFatigue(game, amount) {
  const m = getActiveMonster(game);
  if (!m) return;
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
  const m = getActiveMonster(game);
  if (!m) return false;
  normalizeMonster(m);
  if (!m.knownMoves.includes(moveId) || slotIndex < 0 || slotIndex >= 3) return false;
  m.equipped[slotIndex] = moveId;
  m.move = m.equipped[0];
  addLog(game, `「${getMove(moveId)?.name || moveId}」を装備した`, "info");
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
  monster.id = monster.id || makeMonsterId(monster);
  monster.age = Number.isFinite(monster.age) ? monster.age : 0;
  monster.fatigue = Number.isFinite(monster.fatigue) ? monster.fatigue : 0;
  monster.trainingsUsed = Number.isFinite(monster.trainingsUsed) ? Math.min(TRAINING_LIMIT, monster.trainingsUsed) : 0;
  monster.wins = Number.isFinite(monster.wins) ? monster.wins : 0;
  monster.losses = Number.isFinite(monster.losses) ? monster.losses : 0;
  monster.spMax = computeSpMax(monster);
  monster.move = monster.equipped[0];
  delete monster.retired;
}

function toMoveId(value) {
  if (!value) return null;
  if (MOVE_IDS.includes(value)) return value;
  return LEGACY_MOVE_IDS[value] || null;
}

function monsterStatTotal(monster) {
  const s = monster?.stats || {};
  return (s.hp || 0) + (s.pow || 0) + (s.spd || 0) + (s.smt || 0) + (s.spr || 0);
}

function bestMonster(monsters) {
  return (monsters || []).reduce((best, monster) => {
    if (!best) return monster;
    return monsterStatTotal(monster) > monsterStatTotal(best) ? monster : best;
  }, null);
}

function dedupeMonstersBySpecies(monsters) {
  const bySpecies = new Map();
  for (const monster of monsters) {
    const existing = bySpecies.get(monster.species);
    if (!existing || monsterStatTotal(monster) > monsterStatTotal(existing)) {
      bySpecies.set(monster.species, monster);
    }
  }
  return [...bySpecies.values()];
}

function rollLearnMove(game, chance, tag) {
  const m = getActiveMonster(game);
  if (!m) return null;
  normalizeMonster(m);
  const unknown = LEARNABLE_POOL.filter(id => !m.knownMoves.includes(id));
  if (unknown.length === 0) return null;
  const rng = makeRng(deriveSeed((m.seed || 0) ^ game.week, "learn:" + tag));
  if (!rng.chance(chance)) return null;
  const learned = rng.pick(unknown);
  m.knownMoves.push(learned);
  addLog(game, `「${getMove(learned)?.name || learned}」を覚えた!`, "good");
  return learned;
}

export const constants = { STAT_CAP, TRAINING_LIMIT, START_MONEY };



