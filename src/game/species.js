// Three species with distinct stat personalities.

export const SPECIES = {
  leaf: {
    id: "leaf",
    name: "リーフィ",
    label: "葉のしずく",
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
    description: "落ち着いた青いクリッター。水際と賢さのバランス型。",
    palette: ["#0c1d2b", "#1d5a8a", "#5aaee5", "#cfeefc"],
    base: { hp: 65, pow: 35, spd: 45, smt: 50, spr: 55 },
    growth: { hp: 1.1, pow: 0.9, spd: 1.1, smt: 1.2, spr: 1.3 },
    moves: ["mizu-deppou", "uzumaki", "shizukanaru-inori"],
  },
};

export const SPECIES_LIST = Object.values(SPECIES);

export function getSpecies(id) {
  return SPECIES[id] || null;
}
