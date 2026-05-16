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
    element: "闇",
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
  "hikari-no-ya": {
    id: "hikari-no-ya",
    name: "光の矢",
    element: "光",
    style: "特殊",
    power: 32,
    sp: 4,
    flavor: "まっすぐな光の矢を放つ。",
    effect: null,
  },
  shukufuku: {
    id: "shukufuku",
    name: "祝福",
    element: "光",
    style: "支援",
    power: 0,
    sp: 4,
    flavor: "やわらかな光で気力を満たす。",
    effect: { kind: "sp_heal", amount: 8 },
  },
  "shinsei-na-uta": {
    id: "shinsei-na-uta",
    name: "神聖な歌",
    element: "光",
    style: "支援",
    power: 0,
    sp: 5,
    flavor: "神聖な旋律で集中力を高める。",
    effect: { kind: "crit_up", turns: 2 },
  },
  kagenui: {
    id: "kagenui",
    name: "影縫い",
    element: "闇",
    style: "物理",
    power: 28,
    sp: 3,
    flavor: "影を縫い止めて隙を作る。",
    effect: { kind: "crit_bonus", amount: 0.18 },
  },
  "yami-no-kamitsuki": {
    id: "yami-no-kamitsuki",
    name: "闇のかみつき",
    element: "闇",
    style: "物理",
    power: 34,
    sp: 4,
    flavor: "黒い気配をまとって噛みつく。",
    effect: null,
  },
  juso: {
    id: "juso",
    name: "呪詛",
    element: "闇",
    style: "支援",
    power: 0,
    sp: 5,
    flavor: "不吉な言葉で急所を見抜く。",
    effect: { kind: "crit_up", turns: 2 },
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
    element: "闇",
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
  light: ["hikari-no-ya", "shukufuku", "shinsei-na-uta"],
  dark: ["kagenui", "yami-no-kamitsuki", "juso"],
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
  "静かな祈り": "shizukanaru-inori",
};

export function getMove(id) {
  return MOVES[id] || MOVES[LEGACY_MOVE_IDS[id]] || null;
}

export function moveEffectText(move) {
  if (!move) return "";
  const parts = [];
  if ((move.style === "物理" || move.style === "特殊") && move.power > 0) {
    parts.push(`威力 ${move.power}`);
  }
  if (move.effect?.kind === "charge") parts.push(`次の攻撃 ×${move.effect.mult}`);
  if (move.effect?.kind === "crit_up") parts.push(`${move.effect.turns}ターン 会心率↑`);
  if (move.effect?.kind === "crit_bonus") parts.push(`会心率 +${Math.round(move.effect.amount * 100)}%`);
  if (move.effect?.kind === "sp_heal") parts.push(`SP +${move.effect.amount} 回復`);
  parts.push(`(SP -${move.sp})`);
  return parts.join(" / ");
}

export function STARTER_IDS_FOR_SPECIES(speciesId) {
  return [...(STARTERS[speciesId] || [])];
}
