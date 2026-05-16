// Entry point. Wires state -> actions -> render. Event-driven; no rAF loop.

import {
  loadOrInit, persist, resetAll, setScene, adoptMonster,
  applyTrainingResult, tickWeekForTraining, logBattleResult,
  addMoney, retireToHall, addFatigue, SCENES,
} from "./game/state.js";
import { STONE_TABLETS, summonFromInput, getSpecies } from "./game/summon.js";
import { MENUS, computeTraining } from "./game/training.js";
import { runBattle, RANK_LIST, rankInfo } from "./game/battle.js";
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
// Restore opponent visual after reload if we're in RESULT scene.
if (game.scene === SCENES.RESULT && game.lastBattle) {
  view.opponentSpecies = game.lastBattle.opponentSpecies || guessSpeciesFromName(game.lastBattle.opponentName);
  view.opponentName = game.lastBattle.opponentName;
}

function draw() {
  render(ctx, game, view);
  updateHud();
  updatePanel();
}

function updateHud() {
  const m = game.monster;
  if (!m) {
    hudEl.textContent = `第 ${game.week} 週\n${game.money}G`;
  } else {
    const s = m.stats;
    hudEl.textContent =
      `第 ${game.week} 週   ${game.money}G\n` +
      `HP${s.hp} 力${s.pow} 速${s.spd} 賢${s.smt} 魂${s.spr}\n` +
      `疲労${m.fatigue}  ${m.wins}勝${m.losses}敗`;
  }
}

function updatePanel() {
  actionsEl.innerHTML = "";
  switch (game.scene) {
    case SCENES.TITLE:        return panelTitle();
    case SCENES.ISLAND:       return panelIsland();
    case SCENES.SUMMON:       return panelSummon();
    case SCENES.TRAINING:     return panelTraining();
    case SCENES.ARENA:        return panelArena();
    case SCENES.HOME:         return panelHome();
    case SCENES.RESULT:       return panelResult();
    case SCENES.RETIRE:       return panelRetire();
    default:
      // Unknown scene from corrupted save — recover to title.
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
  b.addEventListener("click", () => { onClick(); });
  actionsEl.appendChild(b);
  return b;
}

function setHint(text) {
  hintEl.textContent = text;
}

function panelTitle() {
  setHint("島で召喚 → 週ごとにトレーニング → 闘技場で勝負。\nコアループ一巡を体験できる MVP です。");
  btn("はじめる", () => { setScene(game, SCENES.ISLAND); saveAndDraw(); }, { primary: true });
  if (game.hallOfFame.length > 0) {
    btn("殿堂を見る", () => { setScene(game, SCENES.RETIRE); saveAndDraw(); });
  }
}

function panelIsland() {
  if (game.monster && game.monster.retired) {
    setHint(`${game.monster.name} は寿命を迎えました。殿堂入りして新しい仲間を呼び出しましょう。`);
    btn("殿堂入りさせる", () => { retireToHall(game); setScene(game, SCENES.RETIRE); saveAndDraw(); }, { primary: true });
    return;
  }
  setHint("施設をクリックして移動。 [1]祭壇  [2]訓練所  [3]闘技場  [4]ホーム");
  for (const f of FACILITIES) {
    btn(f.label, () => { setScene(game, f.scene); saveAndDraw(); });
  }
}

function panelSummon() {
  if (game.monster && !game.monster.retired) {
    setHint(`${game.monster.name} がすでに仲間にいる。新しく呼び出すには引退まで待つか、最初からやり直そう。`);
    btn("島に戻る", () => { setScene(game, SCENES.ISLAND); saveAndDraw(); });
    return;
  }
  setHint("石板を選ぶか、好きな言葉を入力して召喚しよう (同じ言葉なら同じ仲間が来る)");
  for (const tablet of STONE_TABLETS) {
    btn(tablet.label, () => previewSummon(tablet.input));
  }
  btn("言葉を入力して召喚", () => openInputOverlay(), { primary: true });
  btn("島に戻る", () => { setScene(game, SCENES.ISLAND); saveAndDraw(); }, { ghost: true });
}

function previewSummon(input) {
  const candidate = summonFromInput(input);
  const sp = getSpecies(candidate.species);
  const stats = candidate.stats;
  setHint(
    `『${input}』からは…\n` +
    `${candidate.name} (${sp.label}・${candidate.variant}) が現れた!\n` +
    `HP${stats.hp} 力${stats.pow} 速${stats.spd} 賢${stats.smt} 魂${stats.spr} / 初期わざ「${candidate.move}」`
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
  input.onkeydown = (e) => {
    if (e.key === "Enter") overlay.querySelector("#ovOk").click();
    else if (e.key === "Escape") overlay.querySelector("#ovCancel").click();
  };
}

function panelTraining() {
  if (!game.monster) {
    setHint("先に祭壇で仲間を呼び出そう。");
    btn("島に戻る", () => { setScene(game, SCENES.ISLAND); saveAndDraw(); });
    return;
  }
  if (game.monster.retired) {
    setHint("この子は引退済み。新しい仲間を呼び出そう。");
    btn("島に戻る", () => { setScene(game, SCENES.ISLAND); saveAndDraw(); });
    return;
  }
  const m = game.monster;
  setHint(
    `今週のトレーニングを選ぼう (1週進行)\n` +
    `寿命まであと ${50 - m.age} 週 / 疲労 ${m.fatigue}/100`
  );
  for (const menu of MENUS) {
    btn(menu.label, () => doTraining(menu.id));
  }
  btn("島に戻る", () => { setScene(game, SCENES.ISLAND); saveAndDraw(); }, { ghost: true });
}

function doTraining(menuId) {
  const m = game.monster;
  const weekSeed = (m.seed ^ hashString("w:" + game.week)) >>> 0;
  const result = computeTraining(m, menuId, weekSeed);
  applyTrainingResult(game, result);
  const tick = tickWeekForTraining(game);
  if (tick.retired) {
    setScene(game, SCENES.ISLAND);
  }
  saveAndDraw();
}

function panelArena() {
  if (!game.monster || game.monster.retired) {
    setHint("出場するには元気な仲間が必要だよ。");
    btn("島に戻る", () => { setScene(game, SCENES.ISLAND); saveAndDraw(); });
    return;
  }
  setHint("ランクを選んで挑戦。 勝つと報酬がもらえる。1試合 = 1週進行");
  for (const r of RANK_LIST) {
    const info = rankInfo(r);
    btn(`${info.label} (報酬 ${info.reward}G)`, () => startBattle(r));
  }
  btn("島に戻る", () => { setScene(game, SCENES.ISLAND); saveAndDraw(); }, { ghost: true });
}

function startBattle(rank) {
  const m = game.monster;
  const result = runBattle({ monster: m, rank, seed: m.seed ^ hashString("b:" + game.week) });
  result.opponentSpecies = guessSpeciesFromName(result.opponentName);
  // Apply all consequences atomically BEFORE switching scenes, so a reload
  // during the result screen doesn't skip the week/reward/fatigue.
  logBattleResult(game, result);
  if (result.reward) addMoney(game, result.reward, `${rankInfo(result.rank).label}優勝`);
  addFatigue(game, 12);
  tickWeekForTraining(game);
  view.opponentSpecies = result.opponentSpecies;
  view.opponentName = result.opponentName;
  setScene(game, SCENES.RESULT);
  saveAndDraw();
}

function guessSpeciesFromName(name) {
  if (!name) return "leaf";
  if (name.startsWith("リーフィ")) return "leaf";
  if (name.startsWith("ファイロ")) return "flame";
  if (name.startsWith("アクオ")) return "aqua";
  return "leaf";
}

function panelResult() {
  const result = game.lastBattle;
  if (!result) {
    setScene(game, SCENES.ISLAND);
    return saveAndDraw();
  }
  const lines = (result.log || []).map(l => `<div class="line ${l.kind}">${escapeHtml(l.text)}</div>`).join("");
  const head = result.win
    ? `<strong style="color:#66c089">勝利!</strong>  報酬 +${result.reward}G`
    : `<strong style="color:#ef6a6a">敗北...</strong>`;
  hintEl.innerHTML = head;
  const log = document.createElement("div");
  log.className = "log";
  log.innerHTML = lines;
  // Insert log before actions, removing any stale log node first.
  panel.querySelectorAll(".log").forEach(n => n.remove());
  actionsEl.parentElement.insertBefore(log, actionsEl);

  btn("島に戻る", () => {
    setScene(game, SCENES.ISLAND);
    saveAndDraw();
  }, { primary: true });
}

function panelHome() {
  if (!game.monster) {
    setHint("まずは祭壇で仲間を呼び出そう。");
    btn("島に戻る", () => { setScene(game, SCENES.ISLAND); saveAndDraw(); });
    return;
  }
  const m = game.monster;
  const sp = getSpecies(m.species);
  setHint(
    `${m.name} (${sp.label}・${m.variant})\n` +
    `年齢 ${m.age}/50 週   疲労 ${m.fatigue}/100\n` +
    `戦績: ${m.wins}勝 ${m.losses}敗   初期わざ「${m.move}」`
  );
  btn("ゆっくり休む (1週・疲労-40)", () => {
    m.fatigue = Math.max(0, m.fatigue - 40);
    tickWeekForTraining(game);
    saveAndDraw();
  });
  if (m.retired) {
    btn("殿堂入りさせる", () => { retireToHall(game); setScene(game, SCENES.RETIRE); saveAndDraw(); }, { primary: true });
  }
  btn("島に戻る", () => { setScene(game, SCENES.ISLAND); saveAndDraw(); }, { ghost: true });
}

function panelRetire() {
  setHint("これまでの戦士たちを称えよう。新しい仲間は祭壇から。");
  btn("祭壇へ", () => {
    setScene(game, SCENES.SUMMON);
    // reset week clock for new generation? Keep cumulative week count for now.
    saveAndDraw();
  }, { primary: true });
  btn("島に戻る", () => { setScene(game, SCENES.ISLAND); saveAndDraw(); }, { ghost: true });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function saveAndDraw() {
  // Clean up any leftover battle log node when leaving result scene.
  if (game.scene !== SCENES.RESULT) {
    const log = panel.querySelector(".log");
    if (log) log.remove();
  }
  persist(game);
  draw();
}

// --- Wire input ---

attachCanvasClick(canvas, (pt, opts) => {
  if (game.scene === SCENES.ISLAND) {
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
  }
});

attachKeyHandler(key => {
  if (game.scene === SCENES.ISLAND) {
    const map = { "1": SCENES.SUMMON, "2": SCENES.TRAINING, "3": SCENES.ARENA, "4": SCENES.HOME };
    if (map[key]) { setScene(game, map[key]); saveAndDraw(); }
  } else if (key === "Escape" || key === "b") {
    if (game.scene !== SCENES.TITLE && game.scene !== SCENES.RESULT) {
      setScene(game, SCENES.ISLAND);
      saveAndDraw();
    }
  }
});

resetBtn.addEventListener("click", () => {
  if (!confirm("セーブを消して最初からやり直しますか?")) return;
  game = resetAll();
  view = { player: { x: 184, y: 130 }, hoverFacility: null, opponentSpecies: null, opponentName: null };
  saveAndDraw();
});

// Initial draw
draw();
