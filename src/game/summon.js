// Layered deterministic summon:
//   input -> seed -> species -> variant -> stat bias -> starting move
// Same input always returns the same monster, but different inputs feel distinct.

import { hashString, makeRng, deriveSeed } from "./rng.js";
import { SPECIES_LIST, getSpecies } from "./species.js";

const VARIANTS = ["ふつう", "つやめき", "あかね", "あおぞら", "つきあかり"];

// Pure: given an input string, return a new monster object.
export function summonFromInput(input) {
  const raw = (input || "").trim() || "なまえ";
  const seed = hashString(raw);

  // Layer 1: species pick
  const rng1 = makeRng(deriveSeed(seed, "species"));
  const species = rng1.pick(SPECIES_LIST);

  // Layer 2: variant
  const rng2 = makeRng(deriveSeed(seed, "variant"));
  const variant = rng2.pick(VARIANTS);

  // Layer 3: stat bias (+/- up to 8 per stat)
  const rng3 = makeRng(deriveSeed(seed, "bias"));
  const stats = {};
  for (const k of Object.keys(species.base)) {
    stats[k] = Math.max(1, species.base[k] + rng3.int(-8, 8));
  }

  // Layer 4: starting move
  const rng4 = makeRng(deriveSeed(seed, "move"));
  const startMove = rng4.pick(species.moves);

  return {
    name: makeName(species, variant, seed),
    species: species.id,
    variant,
    stats,
    move: startMove,
    seed,
    sourceInput: raw,
  };
}

function makeName(species, variant, seed) {
  const tails = ["くん", "ちゃん", "さん", "丸", "助"];
  const tail = tails[seed % tails.length];
  return `${species.name}${tail}`;
}

// Preview without committing: useful for showing 3 stone-tablet candidates.
export function previewSeeds(seeds) {
  return seeds.map(s => summonFromInput(s));
}

// Three preset "stone tablets" — fixed, but each gives a distinct outcome.
export const STONE_TABLETS = [
  { label: "草の石板", input: "moss-stone-of-the-grove" },
  { label: "炎の石板", input: "ember-stone-of-the-volcano" },
  { label: "水の石板", input: "tide-stone-of-the-shore" },
];

export { getSpecies };
