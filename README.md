# 🐣 クリッター・アイランド (MVP)

島でモンスターを召喚し、週ごとにトレーニングして闘技場で勝負するドット絵育成ゲーム。
クリッターキングダム系の島生活感 + モンスターファーム系の召喚・週次トレーニング・大会を組み合わせた**縦串1本**のプロトタイプ。

## 主要機能 (Phase 1 MVP)

- **島マップ** — 4施設 (祭壇 / 訓練所 / 闘技場 / ホーム) のドット絵島。クリックまたは数字キー (1〜4) で移動
- **召喚** — 入力ワードまたは石板 3種から、**同じ入力なら必ず同じ仲間**が呼び出される (シード化PRNG)。種・色変異・初期ステ補正・初期わざが派生
- **3種のモンスター** — リーフィ (葉/賢) / ファイロ (炎/力速) / アクオ (水/魂賢)
- **週次トレーニング 5種 + 休養** — 走り込み・ちから・敏捷・勉強・瞑想・休養。疲労60超で効果半減
- **闘技場 E/D/Cランク** — シード固定の自動バトル (再現可能)。勝利でG入手
- **寿命 50週** — 引退で殿堂入り。殿堂は最大20件保存
- **セーブ** — localStorage に `version` 付きで保存。破損時はクラッシュせず新規開始

## 起動方法

`type="module"` の都合上、`file://` では動きません。HTTPサーバが必要です。

プロジェクトのルート (このREADMEがあるディレクトリ) で:

**Node.js:**
```bash
npx serve -l 8000
# http://localhost:8000/
```

**Python:**
```bash
python -m http.server 8000
```

または GitHub Pages 版: https://nyanairo.github.io/critter-island/

## 操作

- マウス: 施設をクリックして移動、ボタンで各アクション
- キー: `1`=祭壇 / `2`=訓練所 / `3`=闘技場 / `4`=ホーム / `Esc` または `b` = 島に戻る

## ファイル構成

```
projects/critter-island/
├── README.md
├── index.html
├── style.css
└── src/
    ├── main.js              (画面遷移・入力配線)
    ├── game/
    │   ├── rng.js           (xorshift32 + FNV-1a)
    │   ├── save.js          (localStorage + バージョニング)
    │   ├── state.js         (単一権威state + actions)
    │   ├── species.js       (3種定義)
    │   ├── summon.js        (シード化召喚)
    │   ├── training.js      (5メニュー + 休養)
    │   └── battle.js        (シード固定自動バトル)
    └── ui/
        ├── sprites.js       (ドット絵スプライト)
        ├── renderer.js      (Canvas描画 - 状態純粋関数)
        └── input.js         (マウス/キーボード)
```

## アーキテクチャ方針 (Codex レビュー反映)

- **単一権威 state + 明示的アクション** — `state.js` の関数 (`adoptMonster`, `tickWeekForTraining`, `logBattleResult` 等) からしか mutate しない
- **シミュレーション/描画 分離** — `renderer.js` は `(ctx, game, view)` の純粋関数。Canvas は状態変化時のみ再描画 (rAFループなし)
- **層別決定論的召喚** — 入力ハッシュをタグごとに派生して種/変異/ステ/わざに展開
- **Canvas 整数スケーリング** — 内部解像度 384×216 固定、CSS で表示拡大、`imageSmoothingEnabled = false`
- **セーブは初日からバージョニング** — `{ version, createdAt, updatedAt, game }` 形式 + マイグレーション登録口

## セーブスキーマ (v1)

```json
{
  "version": 1,
  "createdAt": "...",
  "updatedAt": "...",
  "game": {
    "scene": "island",
    "money": 100,
    "week": 1,
    "log": [{"week": 1, "line": "...", "kind": "info"}],
    "monster": {
      "name": "リーフィくん",
      "species": "leaf",
      "variant": "つやめき",
      "stats": {"hp": 70, "pow": 30, "spd": 35, "smt": 55, "spr": 50},
      "move": "光の粒",
      "seed": 1234,
      "age": 0,
      "fatigue": 0,
      "wins": 0,
      "losses": 0,
      "retired": false
    },
    "hallOfFame": [],
    "lastBattle": null
  }
}
```

## 動作確認チェックリスト (Codex 提案)

- [ ] 同じ入力ワードで同じ仲間 (種・変異・ステ・わざ) が召喚される
- [ ] 異なる入力で見た目・性能が変わる
- [ ] 新規→セーブ→リロード→継続が成立する
- [ ] `localStorage` を手で壊しても新規開始できる
- [ ] 1トレーニング = 1週ぴったり進む (重複進行なし)
- [ ] ステが NaN・負・999超にならない
- [ ] バトルがシードから再現可能 (`result.seed` を保存)
- [ ] DPR の異なる端末でもドットがクッキリ表示される
- [ ] 寿命 50 週で引退、殿堂入りで次世代に移行できる

## Phase 2 以降の拡張余地

- ケガ・好物・道具
- D/C/B/A ランク以上の大会・トーナメント形式
- 島探索でのアイテムドロップ・素材
- 2体合体による新種誕生
- 殿堂入りモンスターからの継承システム
- BGM / SE
- 複数セーブスロット

## ライセンス

個人利用想定 / 自作ドット絵のみ (商標・著作物の借用なし)
