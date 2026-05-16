import { makeRng, deriveSeed } from "./rng.js";
import { getSpecies } from "./species.js";

export const MENUS = [
  { id: "hp", label: "走り込み", focus: "hp", fatigue: 14 },
  { id: "pow", label: "ちから訓練", focus: "pow", fatigue: 18 },
  { id: "spd", label: "素早さ訓練", focus: "spd", fatigue: 16 },
  { id: "smt", label: "勉強", focus: "smt", fatigue: 10 },
  { id: "spr", label: "瞑想", focus: "spr", fatigue: 8 },
  { id: "rest", label: "休養", focus: null, fatigue: -30 },
];

const SIDE_GAIN = 0.25;
const BASE_GAIN = 6;

export function computeTraining(monster, menuId, weekSeed) {
  const menu = MENUS.find(m => m.id === menuId);
  if (!menu) throw new Error("unknown menu " + menuId);
  const species = getSpecies(monster.species);
  const rng = makeRng(deriveSeed(weekSeed, "train:" + menuId));
  const deltas = { hp: 0, pow: 0, spd: 0, smt: 0, spr: 0 };

  if (menu.id === "rest") {
    return { menu: menu.id, deltas, fatigueAdd: menu.fatigue, message: `${monster.name} は休んだ。疲労-${Math.abs(menu.fatigue)}` };
  }

  const tired = monster.fatigue >= 60;
  const focusGain = Math.max(1, Math.round(
    (BASE_GAIN + rng.int(0, 4)) * species.growth[menu.focus] * (tired ? 0.5 : 1)
  ));
  deltas[menu.focus] += focusGain;

  const others = Object.keys(deltas).filter(k => k !== menu.focus);
  const sideKey = rng.pick(others);
  const sideGain = Math.max(0, Math.round(focusGain * SIDE_GAIN));
  if (sideGain > 0) deltas[sideKey] += sideGain;

  const message = tired
    ? `${monster.name} は疲れ気味... ${menu.label} +${focusGain} ${statLabel(menu.focus)}`
    : `${menu.label}: +${focusGain} ${statLabel(menu.focus)}${sideGain ? ` (+${sideGain} ${statLabel(sideKey)})` : ""}`;
  return { menu: menu.id, deltas, fatigueAdd: menu.fatigue, message };
}

function statLabel(key) {
  return ({ hp: "HP", pow: "力", spd: "速", smt: "賢", spr: "魂" })[key] || key.toUpperCase();
}
