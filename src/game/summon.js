// Layered deterministic summon:
// input -> seed -> species -> variant -> stat variance.

import { hashString, makeRng, deriveSeed } from "./rng.js";
import { SPECIES_LIST, getSpecies } from "./species.js";
import { STARTER_IDS_FOR_SPECIES } from "./moves.js";

const VARIANTS = ["ふつう", "つよめ", "あかね", "あおぞら", "つきあかり"];

export function summonFromInput(input) {
  const raw = (input || "").trim() || "なまえ";
  const seed = hashString(raw);

  const rng1 = makeRng(deriveSeed(seed, "species"));
  const species = rng1.pick(SPECIES_LIST);

  const rng2 = makeRng(deriveSeed(seed, "variant"));
  const variant = rng2.pick(VARIANTS);

  const rng3 = makeRng(deriveSeed(seed, "bias"));
  const stats = {};
  for (const k of Object.keys(species.base)) {
    const mult = 0.85 + rng3.next() * 0.45;
    stats[k] = Math.max(1, Math.round(species.base[k] * mult));
  }

  const knownMoves = STARTER_IDS_FOR_SPECIES(species.id);
  const equipped = [...knownMoves];

  return {
    name: makeName(species, seed),
    species: species.id,
    variant,
    stats,
    knownMoves,
    equipped,
    spMax: 12 + Math.floor(stats.smt / 10),
    move: equipped[0],
    seed,
    sourceInput: raw,
  };
}

function makeName(species, seed) {
  const tails = ["くん", "ちゃん", "さん", "丸", "助"];
  return `${species.name}${tails[seed % tails.length]}`;
}

export function previewSeeds(seeds) {
  return seeds.map(s => summonFromInput(s));
}

export const STONE_TABLETS = [
  { label: "苔の石板", input: "moss-stone-of-the-grove" },
  { label: "炎の石板", input: "ember-stone-of-the-volcano" },
  { label: "水の石板", input: "tide-stone-of-the-shore" },
];

export { getSpecies };
