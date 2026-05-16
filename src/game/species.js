// Species catalog with distinct stat personalities.

export const TYPES = ["草", "炎", "水", "光", "闇"];

export const TYPE_EFFECTIVENESS = {
  "炎": { "草": 2, "水": 0.5 },
  "草": { "水": 2, "炎": 0.5 },
  "水": { "炎": 2, "草": 0.5 },
  "光": { "闇": 2 },
  "闇": { "光": 2 },
};

export function typeMultiplier(attackerType, defenderType) {
  return TYPE_EFFECTIVENESS[attackerType]?.[defenderType] ?? 1;
}

export const SPECIES = {
  leaf: {
    id: "leaf",
    name: "リーフィ",
    label: "葉のしずく",
    type: "草",
    description: "穏やかで、賢さと粘りが伸びる森のクリッター。",
    palette: ["#1c2a18", "#2f7a3a", "#74c474", "#cdf4b0"],
    base: { hp: 70, pow: 30, spd: 35, smt: 55, spr: 50 },
    growth: { hp: 1.2, pow: 0.8, spd: 1.0, smt: 1.3, spr: 1.1 },
    moves: ["tsutade-utsu", "hikari-no-tsubu", "mori-no-uta"],
  },
  flame: {
    id: "flame",
    name: "ファイロ",
    label: "炎のかけら",
    type: "炎",
    description: "気性が熱く、ちからとすばやさで押していくクリッター。",
    palette: ["#2a0e0e", "#a02b1a", "#ef7a3a", "#ffd070"],
    base: { hp: 60, pow: 55, spd: 50, smt: 30, spr: 40 },
    growth: { hp: 1.0, pow: 1.4, spd: 1.2, smt: 0.7, spr: 0.9 },
    moves: ["kamitsuki", "hi-no-ko", "tosshin"],
  },
  aqua: {
    id: "aqua",
    name: "アクオ",
    label: "波の雫",
    type: "水",
    description: "落ち着いた青いクリッター。水際と賢さのバランス型。",
    palette: ["#0c1d2b", "#1d5a8a", "#5aaee5", "#cfeefc"],
    base: { hp: 65, pow: 35, spd: 45, smt: 50, spr: 55 },
    growth: { hp: 1.1, pow: 0.9, spd: 1.1, smt: 1.2, spr: 1.3 },
    moves: ["mizu-deppou", "uzumaki", "shizukanaru-inori"],
  },
  light: {
    id: "light",
    name: "ルクス",
    label: "光のかけら",
    type: "光",
    description: "神聖な光をまとうクリッター。光の力で味方を励まし、闇を打ち祓う。",
    palette: ["#1a1a2a", "#c8a040", "#ffd95a", "#fff8d6"],
    base: { hp: 65, pow: 35, spd: 40, smt: 55, spr: 60 },
    growth: { hp: 1.0, pow: 0.8, spd: 1.0, smt: 1.35, spr: 1.35 },
    moves: ["hikari-no-ya", "shukufuku", "shinsei-na-uta"],
  },
  dark: {
    id: "dark",
    name: "ニグマ",
    label: "闇のかけら",
    type: "闇",
    description: "影に潜むトリックスター。素早さと急所狙いで翻弄する。",
    palette: ["#1a0e1a", "#3a1a3a", "#7a3a7a", "#ef6aef"],
    base: { hp: 55, pow: 50, spd: 60, smt: 40, spr: 35 },
    growth: { hp: 0.9, pow: 1.2, spd: 1.4, smt: 1.0, spr: 0.8 },
    moves: ["kagenui", "yami-no-kamitsuki", "juso"],
  },
};

export const SPECIES_LIST = Object.values(SPECIES);

export function getSpecies(id) {
  return SPECIES[id] || null;
}
