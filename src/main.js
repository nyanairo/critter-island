import {
  loadOrInit, persist, resetAll, setScene, adoptMonster,
  applyTrainingResult, tickWeekForTraining, logBattleResult,
  addMoney, addFatigue, equipMove, getActiveMonster,
  switchActiveMonster, releaseMonster, TRAINING_LIMIT, SCENES,
  findMonsterBySpecies,
} from "./game/state.js";
import { STONE_TABLETS, summonFromInput, getSpecies } from "./game/summon.js";
import { SPECIES_LIST } from "./game/species.js";
import { MENUS, computeTraining } from "./game/training.js";
import { startBattleState, resolveTurn, RANK_LIST, rankInfo } from "./game/battle.js";
import { getMove, STARTER_IDS_FOR_SPECIES, moveEffectText } from "./game/moves.js";
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

const STAT_META = {
  hp: { label: "HP", color: "#ef6a6a" },
  pow: { label: "力", color: "#ef9a3a" },
  spd: { label: "速", color: "#ffd95a" },
  smt: { label: "賢", color: "#6aa6ef" },
  spr: { label: "魂", color: "#b07aef" },
};

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
  const m = getActiveMonster(game);
  if (!m) {
    hudEl.textContent = `第${game.week}週\n${game.money}G`;
    return;
  }
  const s = m.stats;
  hudEl.textContent =
    `第${game.week}週   ${game.money}G\n` +
    `HP${s.hp} 力${s.pow} 速${s.spd} 賢${s.smt} 魂${s.spr}\n` +
    `疲労${m.fatigue} 訓練${m.trainingsUsed}/${TRAINING_LIMIT} ${m.wins}勝${m.losses}敗`;
}

function updatePanel() {
  actionsEl.innerHTML = "";
  panel.querySelectorAll(".log,.status-grid,.battle-bars,.move-list,.training-feedback,.dex-list,.collection-list").forEach(n => n.remove());
  switch (game.scene) {
    case SCENES.TITLE: return panelTitle();
    case SCENES.ISLAND: return panelIsland();
    case SCENES.SUMMON: return panelSummon();
    case SCENES.TRAINING: return panelTraining();
    case SCENES.ARENA: return panelArena();
    case SCENES.BATTLE: return panelBattle();
    case SCENES.HOME: return panelHome();
    case SCENES.STATUS: return panelStatus();
    case SCENES.DEX: return panelDex();
    case SCENES.COLLECTION: return panelCollection();
    case SCENES.RESULT: return panelResult();
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
  setHint("島で召喚、週ごとにトレーニング、闘技場で勝負。育てたい仲間を選んで始めよう。");
  btn("はじめる", () => { setScene(game, SCENES.ISLAND); saveAndDraw(); }, { primary: true });
  if ((game.monsters || []).length > 0) btn("コレクションを見る", () => { setScene(game, SCENES.COLLECTION); saveAndDraw(); });
}

function panelIsland() {
  setHint("施設をクリックして移動。 [1]祭壇  [2]訓練所  [3]闘技場  [4]ホーム  [S]ステータス");
  for (const f of FACILITIES) btn(f.label, () => { setScene(game, f.scene); saveAndDraw(); });
  if (getActiveMonster(game)) btn("ステータス", () => { setScene(game, SCENES.STATUS); saveAndDraw(); });
}

function panelSummon() {
  setHint("石板を選ぶか、好きな言葉を入力して召喚しよう。同じ言葉なら同じ仲間が来るよ。");
  for (const tablet of STONE_TABLETS) btn(tablet.label, () => previewSummon(tablet.input));
  btn("言葉を入力して召喚", openInputOverlay, { primary: true });
  btn("図鑑を見る", () => { setScene(game, SCENES.DEX); saveAndDraw(); });
  btn("島に戻る", goIsland, { ghost: true });
}

function previewSummon(input) {
  const candidate = summonFromInput(input);
  const sp = getSpecies(candidate.species);
  const existing = findMonsterBySpecies(game, candidate.species);
  setHint(
    `「${input}」から...\n` +
    `${candidate.name} (${sp.label}・${candidate.variant}) が現れた!\n` +
    `${varianceLine(candidate.stats, sp.base)}\n` +
    `初期技: ${candidate.equipped.map(id => `「${getMove(id).name}」`).join(" ")}` +
    (existing ? `\nすでに ${existing.name} (${sp.label}・${existing.variant}・経過 ${existing.age}週・訓練 ${existing.trainingsUsed}/20) がいる。` : "")
  );
  actionsEl.innerHTML = "";
  if (existing) {
    btn(`${existing.name} と入れ替える`, () => {
      releaseMonster(game, existing.id);
      adoptMonster(game, candidate);
      setScene(game, SCENES.ISLAND);
      saveAndDraw();
    }, { primary: true });
  } else {
    btn("仲間にする", () => { adoptMonster(game, candidate); setScene(game, SCENES.ISLAND); saveAndDraw(); }, { primary: true });
  }
  btn("やめる", () => updatePanel(), { ghost: true });
}

function varianceLine(stats, base) {
  return Object.keys(STAT_META).map(k => {
    const pct = Math.round(((stats[k] / base[k]) - 1) * 100);
    return `${STAT_META[k].label} ${stats[k]} (${pct >= 0 ? "+" : ""}${pct}%)`;
  }).join(" / ");
}

function openInputOverlay() {
  overlay.hidden = false;
  overlay.innerHTML = `
    <div>
      <h2>言葉を入力</h2>
      <p style="margin:4px 0; font-size:12px; color:#b8c5d8;">同じ言葉からは同じ仲間が呼び出されるよ</p>
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
  const m = activeMonsterGuard();
  if (!m) return;
  const capped = m.trainingsUsed >= TRAINING_LIMIT;
  setHint(capped
    ? `訓練の上限に達した (${TRAINING_LIMIT}/${TRAINING_LIMIT})`
    : `今週のトレーニングを選ぼう (1週進行)\n経過 ${m.age}週 / 訓練 ${m.trainingsUsed}/${TRAINING_LIMIT} / 疲労 ${m.fatigue}/100`);
  insertTrainingFeedback();
  for (const menu of MENUS) btn(menu.label, () => doTraining(menu.id), { disabled: capped });
  btn("島に戻る", goIsland, { ghost: true });
}

function insertTrainingFeedback() {
  if (!game.lastTraining) return;
  const wrap = document.createElement("div");
  wrap.className = "training-feedback";
  const learned = game.lastTraining.learned ? getMove(game.lastTraining.learned) : null;
  wrap.innerHTML =
    `<div>前回: ${escapeHtml(game.lastTraining.message)}</div>` +
    (learned ? `<div class="learned-banner">🎉 新しい技「${escapeHtml(learned.name)}」を覚えた!</div>` : "");
  actionsEl.parentElement.insertBefore(wrap, actionsEl);
}

function doTraining(menuId) {
  const m = getActiveMonster(game);
  if (!m || m.trainingsUsed >= TRAINING_LIMIT) return saveAndDraw();
  const weekSeed = (m.seed ^ hashString("w:" + game.week)) >>> 0;
  const result = computeTraining(m, menuId, weekSeed);
  applyTrainingResult(game, result);
  tickWeekForTraining(game);
  saveAndDraw();
}

function panelArena() {
  const m = activeMonsterGuard();
  if (!m) return;
  setHint("ランクを選んで挑戦。勝つと報酬がもらえる。試合後は1週進行するよ。");
  for (const r of RANK_LIST) {
    const info = rankInfo(r);
    btn(`${info.label} (報酬 ${info.reward}G)`, () => startBattle(r));
  }
  btn("島に戻る", goIsland, { ghost: true });
}

function startBattle(rank) {
  const m = getActiveMonster(game);
  if (!m) return goIsland();
  game.activeBattle = startBattleState({ monster: m, rank, seed: m.seed ^ hashString("b:" + game.week) });
  view.opponentSpecies = game.activeBattle.opponent.species;
  view.opponentName = game.activeBattle.opponent.name;
  setScene(game, SCENES.BATTLE);
  saveAndDraw();
}

function panelBattle() {
  const m = getActiveMonster(game);
  if (!m || !game.activeBattle) {
    setScene(game, SCENES.ARENA);
    return saveAndDraw();
  }
  const b = game.activeBattle;
  if (b.done) return finishActiveBattle();
  setHint(`ターン ${b.turn}: 技を選ぼう`);
  insertBattleBars(b, m);
  const moves = m.equipped.map(getMove).filter(Boolean);
  const affordable = moves.filter(move => move.sp <= b.player.sp);
  for (const move of moves) addBattleMoveButton(move, m, b);
  if (affordable.length === 0) {
    btn("待機", () => {
      resolveTurn(game.activeBattle, m, "wait");
      if (game.activeBattle.done) finishActiveBattle();
      else saveAndDraw();
    }, { primary: true });
  }
}

function addBattleMoveButton(move, m, b) {
  const bEl = document.createElement("button");
  bEl.className = "battle-move";
  bEl.disabled = move.sp > b.player.sp;
  bEl.innerHTML = `${escapeHtml(move.name)} (${move.sp}SP)<span class="move-desc">${escapeHtml(move.element)}・${escapeHtml(move.style)} / ${escapeHtml(move.flavor)} <span class="move-effect">${escapeHtml(moveEffectText(move))}</span></span>`;
  bEl.addEventListener("click", () => {
    resolveTurn(game.activeBattle, m, move.id);
    if (game.activeBattle.done) finishActiveBattle();
    else saveAndDraw();
  });
  actionsEl.appendChild(bEl);
}

function insertBattleBars(b, m) {
  const wrap = document.createElement("div");
  wrap.className = "battle-bars";
  wrap.innerHTML = `
    ${barHtml("相手HP", b.opponent.hp, b.opponent.hpMax, "hp enemy")}
    ${barHtml(`あなたHP (${m.name})`, b.player.hp, b.player.hpMax, "hp")}
    ${barHtml("SP", b.player.sp, b.player.spMax, "sp")}
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
  if (result.reward) addMoney(game, result.reward, `${rankInfo(result.rank).label}勝利`);
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
  const learned = result.learned ? getMove(result.learned) : null;
  hintEl.innerHTML = result.win
    ? `<strong style="color:#66c089">勝利!</strong> 報酬 +${result.reward}G`
    : `<strong style="color:#ef6a6a">敗北...</strong>`;
  if (learned) hintEl.innerHTML += `<div class="learned-banner">🎉 新しい技「${escapeHtml(learned.name)}」を覚えた!</div>`;
  const log = document.createElement("div");
  log.className = "log";
  log.innerHTML = (result.log || []).map(l => `<div class="line ${l.kind}">${escapeHtml(l.text)}</div>`).join("");
  actionsEl.parentElement.insertBefore(log, actionsEl);
  btn("島に戻る", goIsland, { primary: true });
}

function panelHome() {
  const m = getActiveMonster(game);
  if (!m) {
    setHint("まずは祭壇で仲間を呼び出そう。");
    btn("祭壇へ", () => { setScene(game, SCENES.SUMMON); saveAndDraw(); }, { primary: true });
    btn("島に戻る", goIsland, { ghost: true });
    return;
  }
  const sp = getSpecies(m.species);
  setHint(`${m.name} (${sp.label}・${m.variant})\n経過 ${m.age}週   訓練 ${m.trainingsUsed}/${TRAINING_LIMIT}   疲労 ${m.fatigue}/100\n戦績: ${m.wins}勝${m.losses}敗`);
  btn("ゆっくり休む (1週・疲労-40)", () => {
    m.fatigue = Math.max(0, m.fatigue - 40);
    tickWeekForTraining(game);
    saveAndDraw();
  });
  btn("ステータス", () => { setScene(game, SCENES.STATUS); saveAndDraw(); });
  if ((game.monsters || []).length > 1) btn("他の子にかえる", () => { setScene(game, SCENES.COLLECTION); saveAndDraw(); });
  btn("この子を解放する", () => releaseWithConfirm(m.id, m.name));
  btn("島に戻る", goIsland, { ghost: true });
}

function panelStatus() {
  const m = getActiveMonster(game);
  if (!m) {
    setHint("いま一緒にいる仲間はいないよ。");
    btn("島に戻る", goIsland);
    return;
  }
  const sp = getSpecies(m.species);
  setHint(`${m.name} (${sp.label}・${m.variant}) のステータス\n経過 ${m.age}週 / 訓練 ${m.trainingsUsed}/${TRAINING_LIMIT}`);
  const box = document.createElement("div");
  box.className = "status-grid";
  box.innerHTML = Object.entries(m.stats).map(([k, v]) => statBar(k, v, sp.base[k])).join("");
  actionsEl.parentElement.insertBefore(box, actionsEl);

  const moves = document.createElement("div");
  moves.className = "move-list";
  moves.innerHTML = `
    <h3>装備中の技</h3>
    ${m.equipped.map((id, i) => moveRowHtml(id, i)).join("")}
    <h3>習得済みの技</h3>
    ${m.knownMoves.map(id => knownMoveHtml(id)).join("")}
  `;
  actionsEl.parentElement.insertBefore(moves, actionsEl);
  moves.querySelectorAll(".move-row").forEach(row => {
    row.addEventListener("click", () => openSwapModal(Number(row.dataset.slot)));
  });
  btn("島に戻る", goIsland, { ghost: true });
}

function moveRowHtml(id, slot) {
  const move = getMove(id);
  if (!move) return `<button class="move-row" data-slot="${slot}">${slot + 1}. ${escapeHtml(id)}</button>`;
  return `<button class="move-row" data-slot="${slot}"><span class="move-name">${slot + 1}. ${escapeHtml(move.name)}</span>${moveDetailsHtml(move)}</button>`;
}

function knownMoveHtml(id) {
  const move = getMove(id);
  if (!move) return `<div class="known-move"><span class="move-name">${escapeHtml(id)}</span></div>`;
  return `<div class="known-move"><span class="move-name">${escapeHtml(move.name)}</span>${moveDetailsHtml(move)}</div>`;
}

function moveDetailsHtml(move) {
  return `<span class="move-meta">${escapeHtml(move.element)}・${escapeHtml(move.style)}・${move.sp}SP</span><span class="move-desc">${escapeHtml(move.flavor)} <span class="move-effect">${escapeHtml(moveEffectText(move))}</span></span>`;
}

function panelDex() {
  setHint("モンスター図鑑");
  const dex = game.dex || { summoned: [], encountered: [] };
  const list = document.createElement("div");
  list.className = "dex-list";
  list.innerHTML = SPECIES_LIST.map(sp => dexEntryHtml(sp, dex)).join("");
  actionsEl.parentElement.insertBefore(list, actionsEl);
  btn("祭壇に戻る", () => { setScene(game, SCENES.SUMMON); saveAndDraw(); }, { primary: true });
}

function dexEntryHtml(sp, dex) {
  const summoned = dex.summoned.includes(sp.id);
  const encountered = summoned || dex.encountered.includes(sp.id);
  if (!encountered) {
    return `<section class="dex-entry locked"><div class="silhouette"></div><h3>???</h3><p>まだ出会っていないクリッター。</p></section>`;
  }
  const moves = STARTER_IDS_FOR_SPECIES(sp.id).map(id => getMove(id)?.name || id).join(" / ");
  return `
    <section class="dex-entry">
      <div class="dex-head">
        <h3>${escapeHtml(sp.name)}</h3>
        <span class="dex-badge ${summoned ? "summoned" : "seen"}">${summoned ? "召喚済み" : "未召喚"}</span>
      </div>
      <p class="dex-label">${escapeHtml(sp.label)}</p>
      <p>${escapeHtml(sp.description)}</p>
      <div class="dex-stats">${Object.entries(sp.base).map(([k, v]) => statBar(k, v, v)).join("")}</div>
      <p>初期技: ${escapeHtml(moves)}</p>
      ${summoned ? `<p class="dex-favorite">お気に入りの仲間</p>` : ""}
    </section>`;
}

function panelCollection() {
  const monsters = game.monsters || [];
  setHint("仲間のコレクション。育てる子を選べるよ。");
  const list = document.createElement("div");
  list.className = "collection-list";
  list.innerHTML = monsters.length
    ? monsters.map(collectionRowHtml).join("")
    : `<div class="collection-row"><p>まだ仲間がいないよ。</p></div>`;
  actionsEl.parentElement.insertBefore(list, actionsEl);
  list.querySelectorAll("[data-active-id]").forEach(b => {
    b.addEventListener("click", () => { switchActiveMonster(game, b.dataset.activeId); goIsland(); });
  });
  list.querySelectorAll("[data-release-id]").forEach(b => {
    b.addEventListener("click", () => releaseWithConfirm(b.dataset.releaseId, b.dataset.releaseName));
  });
  btn("祭壇で新しい仲間を呼ぶ", () => { setScene(game, SCENES.SUMMON); saveAndDraw(); }, { primary: true });
  btn("島に戻る", goIsland, { ghost: true });
}

function collectionRowHtml(m) {
  const sp = getSpecies(m.species);
  const active = m.id === game.activeMonsterId;
  return `
    <section class="collection-row ${active ? "active" : ""}">
      <div>
        <h3>${escapeHtml(m.name)} ${active ? `<span class="active-badge">アクティブ</span>` : ""}</h3>
        <p>${escapeHtml(sp.label)}・${escapeHtml(m.variant)} / ${statSummary(m.stats)}</p>
        <p>訓練 ${m.trainingsUsed}/${TRAINING_LIMIT} / 経過 ${m.age}週 / ${m.wins}勝${m.losses}敗</p>
      </div>
      <div class="collection-actions">
        ${active ? "" : `<button data-active-id="${escapeHtml(m.id)}">アクティブにする</button>`}
        <button data-release-id="${escapeHtml(m.id)}" data-release-name="${escapeHtml(m.name)}">解放する</button>
      </div>
    </section>`;
}

function statSummary(stats) {
  return Object.keys(STAT_META).map(k => `${STAT_META[k].label}${stats[k]}`).join(" ");
}

function statBar(key, value, baseValue = 0) {
  const meta = STAT_META[key] || { label: key.toUpperCase(), color: "#66c089" };
  const pct = Math.min(100, Math.max(0, value / 2));
  const tickPct = Math.min(100, Math.max(0, baseValue / 2));
  return `<div class="stat-bar"><span class="label">${meta.label}</span><span class="track"><span class="fill" style="width:${pct}%;background:${meta.color}"></span><span class="tick" style="left:${tickPct}%"></span></span><span class="num">${value}</span></div>`;
}

function openSwapModal(slotIndex) {
  const m = getActiveMonster(game);
  if (!m) return;
  overlay.hidden = false;
  overlay.innerHTML = `
    <div>
      <h2>スロット${slotIndex + 1}の技を変更</h2>
      <div class="row swap-options">
        ${m.knownMoves.map(id => swapOptionHtml(id)).join("")}
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

function swapOptionHtml(id) {
  const move = getMove(id);
  if (!move) return `<button data-move="${escapeHtml(id)}">${escapeHtml(id)}</button>`;
  return `<button data-move="${escapeHtml(id)}"><span class="move-name">${escapeHtml(move.name)}</span>${moveDetailsHtml(move)}</button>`;
}

function activeMonsterGuard() {
  const m = getActiveMonster(game);
  if (!m) {
    setHint("出場するには元気な仲間が必要だよ。");
    btn("祭壇へ", () => { setScene(game, SCENES.SUMMON); saveAndDraw(); }, { primary: true });
    btn("島に戻る", goIsland, { ghost: true });
    return null;
  }
  return m;
}

function releaseWithConfirm(id, name) {
  if (!confirm(`${name}を解放しますか?`)) return;
  releaseMonster(game, id);
  setScene(game, getActiveMonster(game) ? SCENES.COLLECTION : SCENES.SUMMON);
  saveAndDraw();
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
  if (key.toLowerCase() === "s" && game.scene !== SCENES.TITLE && getActiveMonster(game)) {
    setScene(game, SCENES.STATUS);
    saveAndDraw();
    return;
  }
  if (game.scene === SCENES.ISLAND) {
    const map = { "1": SCENES.SUMMON, "2": SCENES.TRAINING, "3": SCENES.ARENA, "4": SCENES.HOME };
    if (map[key]) { setScene(game, map[key]); saveAndDraw(); }
  } else if ((key === "Escape" || key.toLowerCase() === "b") && ![SCENES.TITLE, SCENES.RESULT, SCENES.BATTLE, SCENES.DEX].includes(game.scene)) {
    goIsland();
  }
});

resetBtn.addEventListener("click", () => {
  if (!confirm("セーブを削除して最初からやり直しますか?")) return;
  game = resetAll();
  view = { player: { x: 184, y: 130 }, hoverFacility: null, opponentSpecies: null, opponentName: null };
  saveAndDraw();
});

draw();
