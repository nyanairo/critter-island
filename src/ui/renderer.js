// Pure render from state -> Canvas. Event-driven; called whenever state changes.

import { drawMonster, drawPlayer } from "./sprites.js";
import { getSpecies } from "../game/species.js";
import { SCENES } from "../game/state.js";

const INTERNAL_W = 384;
const INTERNAL_H = 216;

// Facility layout on the island map (positions in internal coords)
export const FACILITIES = [
  { id: "shrine",   x: 60,  y: 60,  w: 56, h: 48, label: "祭壇",  scene: SCENES.SUMMON,   icon: "🜲" },
  { id: "training", x: 180, y: 50,  w: 56, h: 48, label: "訓練所", scene: SCENES.TRAINING, icon: "💪" },
  { id: "arena",    x: 290, y: 70,  w: 64, h: 56, label: "闘技場", scene: SCENES.ARENA,    icon: "⚔"  },
  { id: "home",     x: 130, y: 140, w: 56, h: 48, label: "ホーム", scene: SCENES.HOME,     icon: "⌂" },
];

export function setupCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  // Make backing store match DPR for crisp scaling.
  const dpr = window.devicePixelRatio || 1;
  // We keep the logical drawing size at INTERNAL_W x INTERNAL_H.
  // CSS scales the canvas. backing store stays at logical resolution times nothing —
  // we want pixelated; multiplying backing store would defeat the look.
  // Keep simple: logical = INTERNAL_W x INTERNAL_H. CSS does integer-ish scaling.
  canvas.width = INTERNAL_W;
  canvas.height = INTERNAL_H;
  return ctx;
}

function fillBg(ctx) {
  ctx.fillStyle = "#1d3a55";
  ctx.fillRect(0, 0, INTERNAL_W, INTERNAL_H);
}

function drawIslandBg(ctx) {
  // Water frame
  ctx.fillStyle = "#1f5070";
  ctx.fillRect(0, 0, INTERNAL_W, INTERNAL_H);
  // Wave specks
  ctx.fillStyle = "#3d80a8";
  for (let y = 8; y < INTERNAL_H; y += 16) {
    for (let x = (y / 16 | 0) * 4; x < INTERNAL_W; x += 32) {
      ctx.fillRect(x, y, 4, 1);
    }
  }

  // Island sand outline
  drawBlob(ctx, 16, 24, INTERNAL_W - 32, INTERNAL_H - 40, "#cbb16a", "#a08858");

  // Grass interior
  drawBlob(ctx, 28, 36, INTERNAL_W - 56, INTERNAL_H - 64, "#3a7b46", "#2f6a3a");

  // Path connecting facilities
  ctx.fillStyle = "#9a703f";
  ctx.fillRect(80, 90, 230, 6);
  ctx.fillRect(150, 96, 6, 50);
}

function drawBlob(ctx, x, y, w, h, fill, edge) {
  // Rounded-rect-ish with pixel softening at corners.
  ctx.fillStyle = fill;
  ctx.fillRect(x + 4, y, w - 8, h);
  ctx.fillRect(x, y + 4, w, h - 8);
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  // edge highlight (top)
  ctx.fillStyle = edge;
  ctx.fillRect(x + 4, y + h - 2, w - 8, 2);
  ctx.fillRect(x + w - 2, y + 4, 2, h - 8);
}

function drawFacility(ctx, fac, highlight) {
  const { x, y, w, h, label } = fac;
  // Wall
  ctx.fillStyle = highlight ? "#3c5876" : "#2c4863";
  ctx.fillRect(x, y + 12, w, h - 12);
  // Roof
  ctx.fillStyle = highlight ? "#7aa8d8" : "#4a6a8a";
  ctx.fillRect(x - 4, y + 6, w + 8, 8);
  ctx.fillRect(x, y + 2, w, 8);
  // Door
  ctx.fillStyle = "#1d2a3a";
  ctx.fillRect(x + w / 2 - 5, y + h - 14, 10, 14);
  // Sign
  ctx.fillStyle = highlight ? "#ffd95a" : "#c8a040";
  ctx.fillRect(x + 4, y + 16, w - 8, 8);
  ctx.fillStyle = "#1a1a1a";
  ctx.font = "8px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + w / 2, y + 21);
}

function drawText(ctx, text, x, y, color = "#fff", size = 10, align = "left") {
  ctx.fillStyle = color;
  ctx.font = `${size}px monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillText(text, x, y);
}

function drawShadow(ctx, x, y, w, h) {
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(x, y + h, w, 2);
}

export function render(ctx, game, view) {
  fillBg(ctx);
  switch (game.scene) {
    case SCENES.TITLE:   return renderTitle(ctx, game);
    case SCENES.ISLAND:  return renderIsland(ctx, game, view);
    case SCENES.SUMMON:  return renderRoom(ctx, game, "祭壇", "#3a2a4a", "石板を選んでモンスターを呼び出そう");
    case SCENES.TRAINING:return renderRoom(ctx, game, "訓練所", "#2a3a2a", "今週のトレーニングを選ぼう");
    case SCENES.ARENA:   return renderArena(ctx, game, view);
    case SCENES.HOME:    return renderRoom(ctx, game, "ホーム", "#2a2a3a", "ステータスを確認・休養できる");
    case SCENES.RESULT:  return renderArena(ctx, game, view);
    case SCENES.RETIRE:  return renderRetire(ctx, game);
    default: return renderTitle(ctx, game);
  }
}

function renderTitle(ctx, game) {
  ctx.fillStyle = "#0c1620";
  ctx.fillRect(0, 0, INTERNAL_W, INTERNAL_H);
  // simple starfield
  ctx.fillStyle = "#3a5070";
  for (let i = 0; i < 60; i++) {
    const x = (i * 137) % INTERNAL_W;
    const y = (i * 71) % INTERNAL_H;
    ctx.fillRect(x, y, 1, 1);
  }
  drawText(ctx, "クリッター・アイランド", INTERNAL_W / 2, 60, "#ffd95a", 18, "center");
  drawText(ctx, "〜 召喚と育成と勝負の島 〜", INTERNAL_W / 2, 90, "#b8c5d8", 10, "center");
  drawText(ctx, "「はじめる」を押してね", INTERNAL_W / 2, 140, "#eef3fb", 11, "center");
  // demo monster
  const sp = getSpecies("leaf");
  drawMonster(ctx, "leaf", sp.palette, INTERNAL_W / 2 - 24, 160, 4);
}

function renderIsland(ctx, game, view) {
  drawIslandBg(ctx);
  for (const f of FACILITIES) {
    drawFacility(ctx, f, view?.hoverFacility === f.id);
  }
  // Player position (center of island for simplicity)
  const p = view?.player || { x: 180, y: 130 };
  drawShadow(ctx, p.x, p.y + 12, 16, 4);
  drawPlayer(ctx, p.x, p.y, 1);

  // HUD overlay top-left
  drawText(ctx, `第 ${game.week} 週   ${game.money}G`, 8, 6, "#ffd95a", 10);
  if (game.monster) {
    drawText(ctx, `${game.monster.name} (${game.monster.age}/50)`, 8, 18, "#eef3fb", 9);
  } else {
    drawText(ctx, "仲間: なし — 祭壇で召喚しよう", 8, 18, "#b8c5d8", 9);
  }
}

function renderRoom(ctx, game, title, bg, hint) {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, INTERNAL_W, INTERNAL_H);
  // floor
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, INTERNAL_H - 32, INTERNAL_W, 32);
  // back wall stripes
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  for (let x = 0; x < INTERNAL_W; x += 16) ctx.fillRect(x, 0, 1, INTERNAL_H - 32);

  drawText(ctx, title, INTERNAL_W / 2, 12, "#ffd95a", 14, "center");
  drawText(ctx, hint, INTERNAL_W / 2, 34, "#b8c5d8", 10, "center");

  if (game.monster) {
    const sp = getSpecies(game.monster.species);
    drawMonster(ctx, game.monster.species, sp.palette, INTERNAL_W / 2 - 24, 90, 4);
    drawText(ctx, `${game.monster.name}`, INTERNAL_W / 2, 154, "#eef3fb", 12, "center");
    drawText(ctx, `${sp.label}・${game.monster.variant}`, INTERNAL_W / 2, 168, "#b8c5d8", 9, "center");
    drawText(ctx, `疲労 ${game.monster.fatigue}`, INTERNAL_W - 8, 6, "#b8c5d8", 9, "right");
  }
  drawText(ctx, `第 ${game.week} 週  ${game.money}G`, 8, 6, "#ffd95a", 10);
}

function renderArena(ctx, game, view) {
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, 0, INTERNAL_W, INTERNAL_H);
  // ring floor
  ctx.fillStyle = "#553a2a";
  ctx.fillRect(40, 110, INTERNAL_W - 80, 70);
  ctx.fillStyle = "#704c36";
  ctx.fillRect(46, 116, INTERNAL_W - 92, 58);
  // crowd dots
  ctx.fillStyle = "#3c2a44";
  for (let y = 30; y < 100; y += 8) {
    for (let x = 16; x < INTERNAL_W - 16; x += 12) {
      ctx.fillRect(x + ((y / 8 | 0) % 2 === 0 ? 0 : 6), y, 4, 5);
    }
  }

  drawText(ctx, "闘技場", INTERNAL_W / 2, 10, "#ffd95a", 14, "center");

  // Monster vs opponent
  if (game.monster) {
    const sp = getSpecies(game.monster.species);
    drawMonster(ctx, game.monster.species, sp.palette, 70, 124, 3);
    drawText(ctx, game.monster.name, 88, 168, "#eef3fb", 9, "center");
  }
  if (view?.opponentSpecies) {
    const sp = getSpecies(view.opponentSpecies);
    drawMonster(ctx, view.opponentSpecies, sp.palette, INTERNAL_W - 70 - 36, 124, 3);
    drawText(ctx, view.opponentName || "相手", INTERNAL_W - 88, 168, "#eef3fb", 9, "center");
  }
}

function renderRetire(ctx, game) {
  ctx.fillStyle = "#1a1a2a";
  ctx.fillRect(0, 0, INTERNAL_W, INTERNAL_H);
  drawText(ctx, "🏆 殿堂入り 🏆", INTERNAL_W / 2, 40, "#ffd95a", 16, "center");
  const last = game.hallOfFame[0];
  if (last) {
    drawText(ctx, `${last.name}`, INTERNAL_W / 2, 70, "#eef3fb", 14, "center");
    drawText(ctx, `戦績: ${last.wins}勝 ${last.losses}敗`, INTERNAL_W / 2, 94, "#b8c5d8", 11, "center");
    const sp = getSpecies(last.species);
    if (sp) drawMonster(ctx, last.species, sp.palette, INTERNAL_W / 2 - 24, 110, 4);
  }
  drawText(ctx, "新しいモンスターを呼び出そう", INTERNAL_W / 2, 180, "#b8c5d8", 10, "center");
}
