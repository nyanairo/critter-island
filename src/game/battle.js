// Deterministic battle helpers plus turn-by-turn battle state.

import { makeRng, hashString } from "./rng.js";
import { SPECIES_LIST } from "./species.js";
import { getMove, STARTER_IDS_FOR_SPECIES } from "./moves.js";

const RANKS = {
  E: { label: "E Rank", level: 1.00, reward: 80, oppHp: 70 },
  D: { label: "D Rank", level: 1.20, reward: 160, oppHp: 90 },
  C: { label: "C Rank", level: 1.45, reward: 280, oppHp: 110 },
};

export const RANK_LIST = Object.keys(RANKS);

function buildOpponent(rank, seed) {
  const rng = makeRng(hashString("opp:" + rank + ":" + seed));
  const sp = rng.pick(SPECIES_LIST);
  const cfg = RANKS[rank];
  const stats = {};
  for (const k of Object.keys(sp.base)) {
    stats[k] = Math.max(1, Math.round(sp.base[k] * cfg.level + rng.int(-6, 6)));
  }
  return {
    name: `${sp.name}-${rank}`,
    species: sp.id,
    stats,
    hpMax: Math.round(cfg.oppHp * cfg.level),
    equipped: STARTER_IDS_FOR_SPECIES(sp.id),
  };
}

function eff(stats, key, fatigue = 0) {
  const mult = 1 - Math.min(0.3, fatigue / 200);
  return Math.max(1, Math.floor(stats[key] * mult));
}

export function startBattleState({ monster, rank, seed }) {
  const cfg = RANKS[rank];
  if (!cfg) throw new Error("unknown rank " + rank);
  const battleSeed = (seed ^ hashString("battle:" + rank)) >>> 0;
  const opponent = buildOpponent(rank, seed);
  return {
    rank,
    seed: battleSeed,
    turn: 1,
    done: false,
    player: {
      hp: Math.max(40, monster.stats.hp + 30),
      hpMax: Math.max(40, monster.stats.hp + 30),
      sp: monster.spMax,
      spMax: monster.spMax,
      charge: 1,
      critTurns: 0,
    },
    opponent: {
      ...opponent,
      hp: opponent.hpMax,
      sp: 99,
      charge: 1,
      critTurns: 0,
    },
    log: [
      { kind: "info", text: `Battle start: ${monster.name} vs ${opponent.name}` },
      { kind: "info", text: `Turn 1. Choose a move.` },
    ],
  };
}

export function resolveTurn(activeBattle, monster, choice) {
  if (!activeBattle || activeBattle.done) return activeBattle;
  const rng = makeRng((activeBattle.seed ^ hashString("turn:" + activeBattle.turn)) >>> 0);
  const playerMove = choice === "wait" ? null : getMove(choice);
  if (playerMove && playerMove.sp > activeBattle.player.sp) {
    activeBattle.log.unshift({ kind: "bad", text: `Not enough SP for ${playerMove.name}.` });
    return activeBattle;
  }

  const oppMove = chooseOpponentMove(activeBattle, rng);
  const myInit = eff(monster.stats, "spd", monster.fatigue || 0) + rng.int(0, 8);
  const oInit = activeBattle.opponent.stats.spd + rng.int(0, 8);
  const sequence = myInit >= oInit ? ["player", "opponent"] : ["opponent", "player"];

  for (const who of sequence) {
    if (activeBattle.player.hp <= 0 || activeBattle.opponent.hp <= 0) break;
    if (who === "player") applyAction(activeBattle, "player", monster, activeBattle.opponent, playerMove, rng);
    else applyAction(activeBattle, "opponent", activeBattle.opponent, monster, oppMove, rng);
  }

  recoverSp(activeBattle.player);
  activeBattle.opponent.sp = Math.min(activeBattle.opponent.spMax || 99, activeBattle.opponent.sp + 10);

  if (activeBattle.player.critTurns > 0) activeBattle.player.critTurns -= 1;
  if (activeBattle.opponent.critTurns > 0) activeBattle.opponent.critTurns -= 1;

  const finished = activeBattle.player.hp <= 0 || activeBattle.opponent.hp <= 0 || activeBattle.turn >= 20;
  if (finished) finishBattle(activeBattle);
  else {
    activeBattle.turn += 1;
    activeBattle.log.unshift({ kind: "info", text: `Turn ${activeBattle.turn}. Choose a move.` });
  }
  return activeBattle;
}

function chooseOpponentMove(activeBattle, rng) {
  const affordable = activeBattle.opponent.equipped
    .map(getMove)
    .filter(move => move && move.sp <= activeBattle.opponent.sp);
  return rng.pick(affordable.length ? affordable : activeBattle.opponent.equipped.map(getMove).filter(Boolean));
}

function applyAction(battle, side, actor, defender, move, rng) {
  const self = side === "player" ? battle.player : battle.opponent;
  const target = side === "player" ? battle.opponent : battle.player;
  const kind = side === "player" ? "good" : "bad";
  const actorName = actor.name;

  if (!move) {
    battle.log.unshift({ kind: "info", text: `${actorName} waits and recovers.` });
    recoverSp(self);
    return;
  }

  self.sp = Math.max(0, self.sp - move.sp);
  if (move.effect?.kind === "sp_heal") {
    self.sp = Math.min(self.spMax, self.sp + move.effect.amount);
    battle.log.unshift({ kind, text: `${actorName} used ${move.name} and restored SP.` });
    return;
  }
  if (move.effect?.kind === "charge") {
    self.charge = Math.max(self.charge || 1, move.effect.mult);
    battle.log.unshift({ kind, text: `${actorName} used ${move.name} and charged up.` });
    return;
  }
  if (move.effect?.kind === "crit_up") {
    self.critTurns = move.effect.turns;
    battle.log.unshift({ kind, text: `${actorName} used ${move.name} and focused.` });
    return;
  }

  const atkKey = move.style === "special" ? "smt" : "pow";
  const defKey = move.style === "special" ? "spr" : "spr";
  const fatigue = side === "player" ? actor.fatigue || 0 : 0;
  const atk = eff(actor.stats, atkKey, fatigue);
  const def = eff(defender.stats, defKey, side === "opponent" ? defender.fatigue || 0 : 0);
  const critChance = 0.08 + eff(actor.stats, "smt", fatigue) / 1200 + (self.critTurns > 0 ? 0.18 : 0) + (move.effect?.kind === "crit_bonus" ? move.effect.amount : 0);
  const crit = rng.chance(critChance) ? 1.6 : 1.0;
  const charge = self.charge || 1;
  self.charge = 1;
  const raw = move.power + atk * (0.55 + rng.next() * 0.25) - def * 0.28;
  const dmg = Math.max(2, Math.floor(raw * crit * charge));
  target.hp = Math.max(0, target.hp - dmg);
  battle.log.unshift({ kind, text: `${actorName} used ${move.name}: ${dmg} damage${crit > 1 ? " critical" : ""}.` });
}

function recoverSp(pool) {
  pool.sp = Math.min(pool.spMax, pool.sp + Math.floor(pool.spMax * 0.12));
}

function finishBattle(battle) {
  const timeoutWin = battle.player.hp > 0 && battle.player.hp >= battle.opponent.hp;
  const win = battle.opponent.hp <= 0 || timeoutWin;
  const cfg = RANKS[battle.rank];
  const reward = win ? (battle.opponent.hp <= 0 ? cfg.reward : Math.floor(cfg.reward * 0.6)) : 0;
  battle.done = true;
  battle.result = {
    win,
    rank: battle.rank,
    reward,
    opponentName: battle.opponent.name,
    opponentSpecies: battle.opponent.species,
    log: [...battle.log].reverse(),
    seed: battle.seed,
    finalHp: { me: Math.max(0, battle.player.hp), opp: Math.max(0, battle.opponent.hp) },
  };
  battle.log.unshift({ kind: win ? "good" : "bad", text: win ? `Victory! Reward ${reward}G.` : "Defeat." });
}

export function runBattle({ monster, rank, seed }) {
  const battle = startBattleState({ monster, rank, seed });
  while (!battle.done) {
    const affordable = monster.equipped.map(getMove).filter(move => move && move.sp <= battle.player.sp);
    resolveTurn(battle, monster, affordable[0]?.id || "wait");
  }
  return battle.result;
}

export function rankInfo(rank) {
  return RANKS[rank];
}
