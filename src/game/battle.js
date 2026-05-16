// Pure, seed-based auto battle. Replayable from { mySeed, oppSeed, seed }.
// Returns: { win, log:[lines], reward, opponentName, mySnap, oppSnap, seed }

import { makeRng, hashString } from "./rng.js";
import { SPECIES_LIST, getSpecies } from "./species.js";

// Difficulty determines opponent stat scale + reward.
const RANKS = {
  E: { label: "Eランク", level: 1.00, reward: 80,  oppHp: 70 },
  D: { label: "Dランク", level: 1.20, reward: 160, oppHp: 90 },
  C: { label: "Cランク", level: 1.45, reward: 280, oppHp: 110 },
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
    name: `${sp.name}・${rank}`,
    species: sp.id,
    stats,
    hp: Math.round(cfg.oppHp * cfg.level),
    move: rng.pick(sp.moves),
  };
}

function eff(stats, key, fatigue = 0) {
  // Fatigue from caller (player only). Reduces effective stats up to 30%.
  const mult = 1 - Math.min(0.3, fatigue / 200);
  return Math.max(1, Math.floor(stats[key] * mult));
}

export function runBattle({ monster, rank, seed }) {
  const cfg = RANKS[rank];
  if (!cfg) throw new Error("unknown rank " + rank);
  const battleSeed = (seed ^ hashString("battle:" + rank)) >>> 0;
  const rng = makeRng(battleSeed);

  const opp = buildOpponent(rank, seed);
  const meHpMax = Math.max(40, monster.stats.hp + 30);
  let meHp = meHpMax;
  let oppHp = opp.hp;
  const log = [];
  log.push({ kind: "info", text: `🏟️ vs ${opp.name} (HP ${opp.hp})` });
  log.push({ kind: "info", text: `${monster.name} (HP ${meHpMax}) のターン!` });

  const fatigue = monster.fatigue || 0;
  let turn = 0;
  const myPow = eff(monster.stats, "pow", fatigue);
  const mySpd = eff(monster.stats, "spd", fatigue);
  const mySmt = eff(monster.stats, "smt", fatigue);
  const mySpr = eff(monster.stats, "spr", fatigue);
  const oPow = opp.stats.pow;
  const oSpd = opp.stats.spd;
  const oSmt = opp.stats.smt;
  const oSpr = opp.stats.spr;

  // Action order each turn determined by spd + small RNG.
  while (meHp > 0 && oppHp > 0 && turn < 20) {
    turn++;
    const myInit = mySpd + rng.int(0, 8);
    const oInit  = oSpd  + rng.int(0, 8);
    const meFirst = myInit >= oInit;

    const sequence = meFirst ? ["me", "opp"] : ["opp", "me"];
    for (const who of sequence) {
      if (meHp <= 0 || oppHp <= 0) break;
      if (who === "me") {
        const crit = rng.chance(0.10 + mySmt / 1000) ? 1.6 : 1.0;
        const dmg = Math.max(3, Math.floor((myPow * (0.8 + rng.next() * 0.5) - oSpr * 0.4) * crit));
        oppHp -= dmg;
        log.push({ kind: "good", text: `T${turn}: ${monster.name} の「${monster.move || "たいあたり"}」! ${dmg} ダメージ${crit > 1 ? " (会心)" : ""}` });
      } else {
        const crit = rng.chance(0.08 + oSmt / 1200) ? 1.5 : 1.0;
        const dmg = Math.max(2, Math.floor((oPow * (0.8 + rng.next() * 0.5) - mySpr * 0.4) * crit));
        meHp -= dmg;
        log.push({ kind: "bad", text: `T${turn}: ${opp.name} の「${opp.move}」! ${dmg} ダメージ${crit > 1 ? " (会心)" : ""}` });
      }
    }
  }

  const win = oppHp <= 0 && meHp > 0;
  let reward = 0;
  if (win) {
    reward = cfg.reward;
    log.push({ kind: "good", text: `🎉 勝利! 報酬 ${reward}G` });
  } else if (meHp <= 0) {
    log.push({ kind: "bad", text: "💧 敗北..." });
  } else {
    log.push({ kind: "info", text: "⌛ 時間切れ。判定: " + (meHp >= oppHp ? "勝ち" : "負け") });
  }
  const timeoutWin = !win && meHp > 0 && meHp >= oppHp;
  if (timeoutWin) reward = Math.floor(cfg.reward * 0.6);

  return {
    win: win || timeoutWin,
    rank,
    reward,
    opponentName: opp.name,
    log,
    seed: battleSeed,
    finalHp: { me: Math.max(0, meHp), opp: Math.max(0, oppHp) },
  };
}

export function rankInfo(rank) {
  return RANKS[rank];
}
