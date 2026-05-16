// Pure move catalog. Moves are stored by stable id; UI should display name.

export const MOVES = {
  "tsutade-utsu": {
    id: "tsutade-utsu",
    name: "tsutade-utsu",
    element: "leaf",
    style: "physical",
    power: 28,
    sp: 3,
    flavor: "Whip with a quick vine strike.",
    effect: null,
  },
  "hikari-no-tsubu": {
    id: "hikari-no-tsubu",
    name: "hikari-no-tsubu",
    element: "light",
    style: "special",
    power: 30,
    sp: 4,
    flavor: "Scatter small grains of light.",
    effect: null,
  },
  "mori-no-uta": {
    id: "mori-no-uta",
    name: "mori-no-uta",
    element: "leaf",
    style: "support",
    power: 0,
    sp: 5,
    flavor: "Sing a forest verse that sharpens the next hit.",
    effect: { kind: "charge", mult: 1.5 },
  },
  kamitsuki: {
    id: "kamitsuki",
    name: "kamitsuki",
    element: "beast",
    style: "physical",
    power: 32,
    sp: 3,
    flavor: "Bite down with raw force.",
    effect: null,
  },
  "hi-no-ko": {
    id: "hi-no-ko",
    name: "hi-no-ko",
    element: "flame",
    style: "special",
    power: 31,
    sp: 4,
    flavor: "Flick hot sparks at the foe.",
    effect: null,
  },
  tosshin: {
    id: "tosshin",
    name: "tosshin",
    element: "neutral",
    style: "physical",
    power: 44,
    sp: 5,
    flavor: "Commit to a full-body rush.",
    effect: null,
  },
  "mizu-deppou": {
    id: "mizu-deppou",
    name: "mizu-deppou",
    element: "aqua",
    style: "special",
    power: 30,
    sp: 4,
    flavor: "Fire a focused jet of water.",
    effect: null,
  },
  uzumaki: {
    id: "uzumaki",
    name: "uzumaki",
    element: "aqua",
    style: "physical",
    power: 29,
    sp: 3,
    flavor: "Spin into a compact whirlpool hit.",
    effect: null,
  },
  "shizukanaru-inori": {
    id: "shizukanaru-inori",
    name: "shizukanaru-inori",
    element: "light",
    style: "support",
    power: 0,
    sp: 4,
    flavor: "A quiet prayer that restores fighting spirit.",
    effect: { kind: "sp_heal", amount: 6 },
  },
  ganbaru: {
    id: "ganbaru",
    name: "ganbaru",
    element: "neutral",
    style: "support",
    power: 0,
    sp: 2,
    flavor: "Take a breath and recover SP.",
    effect: { kind: "sp_heal", amount: 6 },
  },
  tameru: {
    id: "tameru",
    name: "tameru",
    element: "neutral",
    style: "support",
    power: 0,
    sp: 3,
    flavor: "Gather power for the next strike.",
    effect: { kind: "charge", mult: 1.5 },
  },
  "kiai-no-sakebi": {
    id: "kiai-no-sakebi",
    name: "kiai-no-sakebi",
    element: "neutral",
    style: "support",
    power: 0,
    sp: 5,
    flavor: "Raise the chance of a decisive hit.",
    effect: { kind: "crit_up", turns: 2 },
  },
  "kaishin-gari": {
    id: "kaishin-gari",
    name: "kaishin-gari",
    element: "beast",
    style: "physical",
    power: 36,
    sp: 5,
    flavor: "Hunt for an exposed weak point.",
    effect: { kind: "crit_bonus", amount: 0.12 },
  },
  "zenryoku-tosshin": {
    id: "zenryoku-tosshin",
    name: "zenryoku-tosshin",
    element: "neutral",
    style: "physical",
    power: 50,
    sp: 7,
    flavor: "Crash forward with everything left.",
    effect: null,
  },
};

export const LEARNABLE_POOL = [
  "ganbaru",
  "tameru",
  "kiai-no-sakebi",
  "kaishin-gari",
  "zenryoku-tosshin",
];

export const MOVE_IDS = Object.keys(MOVES);
export const MOVE_NAMES = MOVE_IDS;

const STARTERS = {
  leaf: ["tsutade-utsu", "hikari-no-tsubu", "mori-no-uta"],
  flame: ["kamitsuki", "hi-no-ko", "tosshin"],
  aqua: ["mizu-deppou", "uzumaki", "shizukanaru-inori"],
};

export const LEGACY_MOVE_IDS = {
  "縺､縺溘〒謇薙▽": "tsutade-utsu",
  "蜈峨・邊・": "hikari-no-tsubu",
  "譽ｮ縺ｮ豁・": "mori-no-uta",
  "縺九∩縺､縺・": "kamitsuki",
  "轣ｫ縺ｮ邊・": "hi-no-ko",
  "遯・ｲ": "tosshin",
  "縺ｿ縺壹〒縺｣縺ｽ縺・": "mizu-deppou",
  "縺・★縺ｾ縺・": "uzumaki",
  "髱吶°縺ｪ繧狗･医ｊ": "shizukanaru-inori",
};

export function getMove(id) {
  return MOVES[id] || MOVES[LEGACY_MOVE_IDS[id]] || null;
}

export function STARTER_IDS_FOR_SPECIES(speciesId) {
  return [...(STARTERS[speciesId] || [])];
}
