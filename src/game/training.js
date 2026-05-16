import { makeRng, deriveSeed } from "./rng.js";
import { getSpecies } from "./species.js";

export const MENUS = [
  { id: "hp", label: "Endurance Run", focus: "hp", fatigue: 14 },
  { id: "pow", label: "Power Drill", focus: "pow", fatigue: 18 },
  { id: "spd", label: "Speed Course", focus: "spd", fatigue: 16 },
  { id: "smt", label: "Study", focus: "smt", fatigue: 10 },
  { id: "spr", label: "Meditation", focus: "spr", fatigue: 8 },
  { id: "rest", label: "Rest", focus: null, fatigue: -30 },
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
    return { menu: menu.id, deltas, fatigueAdd: menu.fatigue, message: `${monster.name} rested. Fatigue -${Math.abs(menu.fatigue)}.` };
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
    ? `${monster.name} was tired. ${menu.label} +${focusGain} ${menu.focus.toUpperCase()}.`
    : `${menu.label}: +${focusGain} ${menu.focus.toUpperCase()}${sideGain ? ` (+${sideGain} ${sideKey.toUpperCase()})` : ""}.`;
  return { menu: menu.id, deltas, fatigueAdd: menu.fatigue, message };
}
