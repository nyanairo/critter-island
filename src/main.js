import {
  loadOrInit, persist, resetAll, setScene, adoptMonster,
  applyTrainingResult, tickWeekForTraining, logBattleResult,
  addMoney, retireToHall, addFatigue, equipMove, SCENES,
} from "./game/state.js";
import { STONE_TABLETS, summonFromInput, getSpecies } from "./game/summon.js";
import { MENUS, computeTraining } from "./game/training.js";
import { startBattleState, resolveTurn, RANK_LIST, rankInfo } from "./game/battle.js";
import { getMove } from "./game/moves.js";
import { hashString } from "./game/rng.js";
import { setupCanvas, render, FACILITIES } from "./ui/renderer.js";
import { attachCanvasClick, attachKeyHandler } from "./ui/input.js";

const canvas = document.getElementById("screen");
const overlay = document.getElementById("overlay");
const panel = document.getElementById("panel");
const hintEl = document.getElementById("hint");
const actionsEl = document.getElementById("actions");
const hudEl = document.getElementById("hud");
const resetBtn = document.getElementById("resetBtn");
const ctx = setupCanvas(canvas);

let game = loadOrInit();
let view = { player: { x: 184, y: 130 }, hoverFacility: null, opponentSpecies: null, opponentName: null };
if (game.scene === SCENES.RESULT && game.lastBattle) {
  view.opponentSpecies = game.lastBattle.opponentSpecies || "leaf";
  view.opponentName = game.lastBattle.opponentName;
}
if (game.scene === SCENES.BATTLE && game.activeBattle) {
  view.opponentSpecies = game.activeBattle.opponent.species;
  view.opponentName = game.activeBattle.opponent.name;
}

function draw() {
  render(ctx, game, view);
  updateHud();
  updatePanel();
}

function updateHud() {
  const m = game.monster;
  if (!m) {
    hudEl.textContent = `第${game.week}週\n${game.money}G`;
    return;
  }
  const s = m.stats;
  hudEl.textContent =
    `第${game.week}週   ${game.money}G\n` +
    `HP${s.hp} 力${s.pow} 速${s.spd} 賢${s.smt} 魂${s.spr}\n` +
    `疲労${m.fatigue}  ${m.wins}勝${m.losses}敗`;
}

function updatePanel() {
  actionsEl.innerHTML = "";
  panel.querySelectorAll(".log,.status-grid,.battle-bars,.move-list").forEach(n => n.remove());
  switch (game.scene) {
    case SCENES.TITLE: return panelTitle();
    case SCENES.ISLAND: return panelIsland();
    case SCENES.SUMMON: return panelSummon();
    case SCENES.TRAINING: return panelTraining();
    case SCENES.ARENA: return panelArena();
    case SCENES.BATTLE: return panelBattle();
    case SCENES.HOME: return panelHome();
    case SCENES.STATUS: return panelStatus();
    case SCENES.RESULT: return panelResult();
    case SCENES.RETIRE: return panelRetire();
    default:
      setScene(game, SCENES.TITLE);
      return panelTitle();
  }
}

function btn(label, onClick, opts = {}) {
  const b = document.createElement("button");
  b.textContent = label;
  if (opts.primary) b.classList.add("primary");
  if (opts.ghost) b.classList.add("ghost");
  if (opts.disabled) b.disabled = true;
  b.addEventListener("click", onClick);
  actionsEl.appendChild(b);
  return b;
}

function setHint(text) {
  hintEl.textContent = text;
}

function panelTitle() {
  setHint("島で召喚 → 週ごとにトレーニング → 闘技場で勝負。\nコアループ一巡を体験できる MVP です。");
  btn("はじめる", () => { setScene(game, SCENES.ISLAND); saveAndDraw(); }, { primary: true });
  if (game.hallOfFame.length > 0) btn("殿堂を見る", () => { setScene(game, SCENES.RETIRE); saveAndDraw(); });
}

function panelIsland() {
  if (game.monster?.retired) {
    setHint(`${game.monster.name} は寿命を迎えました。殿堂入りして新しい仲間を呼び出しましょう。`);
    btn("殿堂入りさせる", () => { retireToHall(game); setScene(game, SCENES.RETIRE); saveAndDraw(); }, { primary: true });
    return;
  }
  setHint("施設をクリックして移動。 [1]祭壇  [2]訓練所  [3]闘技場  [4]ホーム  [S]ステータス");
  for (const f of FACILITIES) btn(f.label, () => { setScene(game, f.scene); saveAndDraw(); });
  if (game.monster) btn("ステータス", () => { setScene(game, SCENES.STATUS); saveAndDraw(); });
}

function panelSummon() {
  if (game.monster && !game.monster.retired) {
    setHint(`${game.monster.name} がすでに仲間にいる。新しく呼び出すには引退まで待つか、最初からやり直そう。`);
    btn("島に戻る", goIsland);
    return;
  }
  setHint("石板を選ぶか、好きな言葉を入力して召喚しよう (同じ言葉なら同じ仲間が来る)");
  for (const tablet of STONE_TABLETS) btn(tablet.label, () => previewSummon(tablet.input));
  btn("言葉を入力して召喚", openInputOverlay, { primary: true });
  btn("島に戻る", goIsland, { ghost: true });
}

function previewSummon(input) {
  const candidate = summonFromInput(input);
  const sp = getSpecies(candidate.species);
  const stats = candidate.stats;
  setHint(
    `『${input}』からは…\n` +
    `${candidate.name} (${sp.label}・${candidate.variant}) が現れた!\n` +
    `HP${stats.hp} 力${stats.pow} 速${stats.spd} 賢${stats.smt} 魂${stats.spr}\n` +
    `初期技: ${candidate.equipped.map(id => `「${getMove(id).name}」`).join(" ")}`
  );
  actionsEl.innerHTML = "";
  btn("仲間にする", () => { adoptMonster(game, candidate); setScene(game, SCENES.ISLAND); saveAndDraw(); }, { primary: true });
  btn("やめる", () => updatePanel(), { ghost: true });
}

function openInputOverlay() {
  overlay.hidden = false;
  overlay.innerHTML = `
    <div>
      <h2>言葉を入力</h2>
      <p style="margin:4px 0; font-size:12px; color:#b8c5d8;">同じ言葉からは同じ仲間が呼び出される</p>
      <input type="text" id="ovInput" placeholder="例: ねこじゃらし" autocomplete="off" />
      <div class="row">
        <button id="ovOk" class="primary">召喚する</button>
        <button id="ovCancel" class="ghost">やめる</button>
      </div>
    </div>`;
  const input = overlay.querySelector("#ovInput");
  input.focus();
  overlay.querySelector("#ovOk").onclick = () => {
    const v = input.value.trim();
    overlay.hidden = true;
    if (v) previewSummon(v);
  };
  overlay.querySelector("#ovCancel").onclick = () => { overlay.hidden = true; };
  input.onkeydown = e => {
    if (e.key === "Enter") overlay.querySelector("#ovOk").click();
    else if (e.key === "Escape") overlay.querySelector("#ovCancel").click();
  };
}

function panelTraining() {
  if (!activeMonsterGuard()) return;
  const m = game.monster;
  setHint(`今週のトレーニングを選ぼう (1週進行)\n寿命まであと ${50 - m.age} 週 / 疲労 ${m.fatigue}/100`);
  for (const menu of MENUS) btn(menu.label, () => doTraining(menu.id));
  btn("島に戻る", goIsland, { ghost: true });
}

function doTraining(menuId) {
  const m = game.monster;
  const weekSeed = (m.seed ^ hashString("w:" + game.week)) >>> 0;
  const result = computeTraining(m, menuId, weekSeed);
  applyTrainingResult(game, result);
  const tick = tickWeekForTraining(game);
  if (tick.retired) setScene(game, SCENES.ISLAND);
  saveAndDraw();
}

function panelArena() {
  if (!activeMonsterGuard()) return;
  setHint("ランクを選んで挑戦。勝つと報酬がもらえる。1試合 = 1週進行");
  for (const r of RANK_LIST) {
    const info = rankInfo(r);
    btn(`${info.label} (報酬 ${info.reward}G)`, () => startBattle(r));
  }
  btn("島に戻る", goIsland, { ghost: true });
}

function startBattle(rank) {
  const m = game.monster;
  game.activeBattle = startBattleState({ monster: m, rank, seed: m.seed ^ hashString("b:" + game.week) });
  view.opponentSpecies = game.activeBattle.opponent.species;
  view.opponentName = game.activeBattle.opponent.name;
  setScene(game, SCENES.BATTLE);
  saveAndDraw();
}

function panelBattle() {
  if (!game.monster || !game.activeBattle) {
    setScene(game, SCENES.ARENA);
    return saveAndDraw();
  }
  const b = game.activeBattle;
  if (b.done) return finishActiveBattle();
  setHint(`ターン ${b.turn}: 技を選ぼう`);
  insertBattleBars(b);
  const moves = game.monster.equipped.map(getMove).filter(Boolean);
  const affordable = moves.filter(move => move.sp <= b.player.sp);
  for (const move of moves) {
    btn(`${move.name} (${move.sp}SP)`, () => {
      resolveTurn(game.activeBattle, game.monster, move.id);
      if (game.activeBattle.done) finishActiveBattle();
      else saveAndDraw();
    }, { disabled: move.sp > b.player.sp });
  }
  if (affordable.length === 0) {
    btn("待機", () => {
      resolveTurn(game.activeBattle, game.monster, "wait");
      if (game.activeBattle.done) finishActiveBattle();
      else saveAndDraw();
    }, { primary: true });
  }
}

function insertBattleBars(b) {
  const wrap = document.createElement("div");
  wrap.className = "battle-bars";
  wrap.innerHTML = `
    ${barHtml(game.monster.name, b.player.hp, b.player.hpMax, "hp")}
    ${barHtml("SP", b.player.sp, b.player.spMax, "sp")}
    ${barHtml(b.opponent.name, b.opponent.hp, b.opponent.hpMax, "hp enemy")}
  `;
  actionsEl.parentElement.insertBefore(wrap, actionsEl);
}

function barHtml(label, value, max, cls) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return `<div class="battle-bar ${cls}"><span>${escapeHtml(label)}</span><div class="track"><div class="fill" style="width:${pct}%"></div></div><b>${value}/${max}</b></div>`;
}

function finishActiveBattle() {
  const result = game.activeBattle.result;
  logBattleResult(game, result);
  if (result.reward) addMoney(game, result.reward, `${rankInfo(result.rank).label}優勝`);
  addFatigue(game, 12);
  tickWeekForTraining(game);
  game.activeBattle = null;
  view.opponentSpecies = result.opponentSpecies;
  view.opponentName = result.opponentName;
  setScene(game, SCENES.RESULT);
  saveAndDraw();
}

function panelResult() {
  const result = game.lastBattle;
  if (!result) {
    setScene(game, SCENES.ISLAND);
    return saveAndDraw();
  }
  hintEl.innerHTML = result.win
    ? `<strong style="color:#66c089">勝利!</strong> 報酬 +${result.reward}G`
    : `<strong style="color:#ef6a6a">敗北...</strong>`;
  const log = document.createElement("div");
  log.className = "log";
  log.innerHTML = (result.log || []).map(l => `<div class="line ${l.kind}">${escapeHtml(l.text)}</div>`).join("");
  actionsEl.parentElement.insertBefore(log, actionsEl);
  btn("島に戻る", goIsland, { primary: true });
}

function panelHome() {
  if (!game.monster) {
    setHint("まずは祭壇で仲間を呼び出そう。");
    btn("島に戻る", goIsland);
    return;
  }
  const m = game.monster;
  const sp = getSpecies(m.species);
  setHint(`${m.name} (${sp.label}・${m.variant})\n年齢 ${m.age}/50 週   疲労 ${m.fatigue}/100\n戦績: ${m.wins}勝${m.losses}敗`);
  btn("ゆっくり休む (1週・疲労-40)", () => {
    m.fatigue = Math.max(0, m.fatigue - 40);
    tickWeekForTraining(game);
    saveAndDraw();
  });
  btn("ステータス", () => { setScene(game, SCENES.STATUS); saveAndDraw(); });
  if (m.retired) btn("殿堂入りさせる", () => { retireToHall(game); setScene(game, SCENES.RETIRE); saveAndDraw(); }, { primary: true });
  btn("島に戻る", goIsland, { ghost: true });
}

function panelStatus() {
  if (!game.monster) {
    setHint("いま一緒にいる仲間はいないよ。");
    btn("島に戻る", goIsland);
    return;
  }
  const m = game.monster;
  const sp = getSpecies(m.species);
  setHint(`${m.name} (${sp.label}・${m.variant}) のステータス`);
  const box = document.createElement("div");
  box.className = "status-grid";
  box.innerHTML = Object.entries(m.stats).map(([k, v]) => statBar(statLabel(k), v)).join("");
  actionsEl.parentElement.insertBefore(box, actionsEl);

  const moves = document.createElement("div");
  moves.className = "move-list";
  moves.innerHTML = `
    <h3>装備中の技</h3>
    ${m.equipped.map((id, i) => `<button class="move-row" data-slot="${i}">${i + 1}. ${escapeHtml(getMove(id)?.name || id)}</button>`).join("")}
    <h3>習得済みの技</h3>
    ${m.knownMoves.map(id => `<div class="known-move">${escapeHtml(getMove(id)?.name || id)} <span>${getMove(id)?.sp ?? "?"}SP</span></div>`).join("")}
  `;
  actionsEl.parentElement.insertBefore(moves, actionsEl);
  moves.querySelectorAll(".move-row").forEach(row => {
    row.addEventListener("click", () => openSwapModal(Number(row.dataset.slot)));
  });
  btn("島に戻る", goIsland, { ghost: true });
}

function statLabel(key) {
  return ({ hp: "HP", pow: "力", spd: "速", smt: "賢", spr: "魂" })[key] || key.toUpperCase();
}

function statBar(label, value) {
  const pct = Math.max(4, Math.min(100, Math.round(value / 10)));
  return `<div class="stat-bar"><span class="label">${label}</span><span class="track"><span class="fill" style="width:${pct}%"></span></span><span class="num">${value}</span></div>`;
}

function openSwapModal(slotIndex) {
  const m = game.monster;
  overlay.hidden = false;
  overlay.innerHTML = `
    <div>
      <h2>スロット${slotIndex + 1}の技を変更</h2>
      <div class="row">
        ${m.knownMoves.map(id => `<button data-move="${id}">${escapeHtml(getMove(id)?.name || id)}</button>`).join("")}
        <button id="ovCancel" class="ghost">やめる</button>
      </div>
    </div>`;
  overlay.querySelectorAll("[data-move]").forEach(b => {
    b.addEventListener("click", () => {
      equipMove(game, slotIndex, b.dataset.move);
      overlay.hidden = true;
      saveAndDraw();
    });
  });
  overlay.querySelector("#ovCancel").onclick = () => { overlay.hidden = true; };
}

function panelRetire() {
  setHint("これまでの戦士たちを称えよう。新しい仲間は祭壇から。");
  btn("祭壇へ", () => { setScene(game, SCENES.SUMMON); saveAndDraw(); }, { primary: true });
  btn("島に戻る", goIsland, { ghost: true });
}

function activeMonsterGuard() {
  if (!game.monster || game.monster.retired) {
    setHint("出場するには元気な仲間が必要だよ。");
    btn("島に戻る", goIsland);
    return false;
  }
  return true;
}

function goIsland() {
  setScene(game, SCENES.ISLAND);
  saveAndDraw();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function saveAndDraw() {
  persist(game);
  draw();
}

attachCanvasClick(canvas, (pt, opts) => {
  if (game.scene !== SCENES.ISLAND) return;
  const hit = FACILITIES.find(f => pt.x >= f.x && pt.x < f.x + f.w && pt.y >= f.y && pt.y < f.y + f.h);
  if (opts?.hover) {
    const newHover = hit ? hit.id : null;
    if (newHover !== view.hoverFacility) {
      view.hoverFacility = newHover;
      canvas.style.cursor = hit ? "pointer" : "default";
      draw();
    }
    return;
  }
  if (hit) {
    setScene(game, hit.scene);
    saveAndDraw();
  }
});

attachKeyHandler(key => {
  if (key.toLowerCase() === "s" && game.scene !== SCENES.TITLE && game.monster) {
    setScene(game, SCENES.STATUS);
    saveAndDraw();
    return;
  }
  if (game.scene === SCENES.ISLAND) {
    const map = { "1": SCENES.SUMMON, "2": SCENES.TRAINING, "3": SCENES.ARENA, "4": SCENES.HOME };
    if (map[key]) { setScene(game, map[key]); saveAndDraw(); }
  } else if ((key === "Escape" || key.toLowerCase() === "b") && ![SCENES.TITLE, SCENES.RESULT, SCENES.BATTLE].includes(game.scene)) {
    goIsland();
  }
});

resetBtn.addEventListener("click", () => {
  if (!confirm("セーブを消して最初からやり直しますか?")) return;
  game = resetAll();
  view = { player: { x: 184, y: 130 }, hoverFacility: null, opponentSpecies: null, opponentName: null };
  saveAndDraw();
});

draw();
