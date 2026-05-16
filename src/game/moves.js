// Pure move catalog. Moves are stored by stable id; UI should display name.

export const MOVES = {
  "tsutade-utsu": {
    id: "tsutade-utsu",
    name: "つたで打つ",
    element: "草",
    style: "物理",
    power: 28,
    sp: 3,
    flavor: "蔓を振って素早く打ち付ける。",
    effect: null,
  },
  "hikari-no-tsubu": {
    id: "hikari-no-tsubu",
    name: "光の粒",
    element: "光",
    style: "特殊",
    power: 30,
    sp: 4,
    flavor: "小さな光の粒を飛ばす。",
    effect: null,
  },
  "mori-no-uta": {
    id: "mori-no-uta",
    name: "森の歌",
    element: "草",
    style: "支援",
    power: 0,
    sp: 5,
    flavor: "森の歌で次の一撃を鋭くする。",
    effect: { kind: "charge", mult: 1.5 },
  },
  kamitsuki: {
    id: "kamitsuki",
    name: "かみつき",
    element: "牙",
    style: "物理",
    power: 32,
    sp: 3,
    flavor: "力強く食らいつく。",
    effect: null,
  },
  "hi-no-ko": {
    id: "hi-no-ko",
    name: "火の粉",
    element: "炎",
    style: "特殊",
    power: 31,
    sp: 4,
    flavor: "熱い火の粉を浴びせる。",
    effect: null,
  },
  tosshin: {
    id: "tosshin",
    name: "突進",
    element: "無",
    style: "物理",
    power: 44,
    sp: 5,
    flavor: "全身でぶつかる体当たり。",
    effect: null,
  },
  "mizu-deppou": {
    id: "mizu-deppou",
    name: "みずでっぽう",
    element: "水",
    style: "特殊",
    power: 30,
    sp: 4,
    flavor: "狙いを定めた水流を放つ。",
    effect: null,
  },
  uzumaki: {
    id: "uzumaki",
    name: "うずまき",
    element: "水",
    style: "物理",
    power: 29,
    sp: 3,
    flavor: "渦に巻き込んで叩き付ける。",
    effect: null,
  },
  "shizukanaru-inori": {
    id: "shizukanaru-inori",
    name: "静かなる祈り",
    element: "光",
    style: "支援",
    power: 0,
    sp: 4,
    flavor: "静かな祈りで気魂を取り戻す。",
    effect: { kind: "sp_heal", amount: 6 },
  },
  ganbaru: {
    id: "ganbaru",
    name: "がんばる",
    element: "無",
    style: "支援",
    power: 0,
    sp: 2,
    flavor: "一息ついて SP を少し回復する。",
    effect: { kind: "sp_heal", amount: 6 },
  },
  tameru: {
    id: "tameru",
    name: "ためる",
    element: "無",
    style: "支援",
    power: 0,
    sp: 3,
    flavor: "力をためて次の攻撃を強化する。",
    effect: { kind: "charge", mult: 1.5 },
  },
  "kiai-no-sakebi": {
    id: "kiai-no-sakebi",
    name: "気合のさけび",
    element: "無",
    style: "支援",
    power: 0,
    sp: 5,
    flavor: "気合の叫びで会心率を上げる。",
    effect: { kind: "crit_up", turns: 2 },
  },
  "kaishin-gari": {
    id: "kaishin-gari",
    name: "会心狙い",
    element: "牙",
    style: "物理",
    power: 36,
    sp: 5,
    flavor: "弱点を狙って一撃を入れる。",
    effect: { kind: "crit_bonus", amount: 0.12 },
  },
  "zenryoku-tosshin": {
    id: "zenryoku-tosshin",
    name: "全力突進",
    element: "無",
    style: "物理",
    power: 50,
    sp: 7,
    flavor: "残った力を振り絞って突っ込む。",
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
  "つたで打つ": "tsutade-utsu",
  "光の粒": "hikari-no-tsubu",
  "森の歌": "mori-no-uta",
  "かみつき": "kamitsuki",
  "火の粉": "hi-no-ko",
  "突進": "tosshin",
  "みずでっぽう": "mizu-deppou",
  "うずまき": "uzumaki",
  "静かなる祈り": "shizukanaru-inori",
};

export function getMove(id) {
  return MOVES[id] || MOVES[LEGACY_MOVE_IDS[id]] || null;
}

export function STARTER_IDS_FOR_SPECIES(speciesId) {
  return [...(STARTERS[speciesId] || [])];
}
