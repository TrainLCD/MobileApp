---
name: plan-from-feedback
description: Fetch open feedback tickets from the private TrainLCD/Issues repo via `gh`, filter by triage level and Claude-estimated difficulty, and emit a short implementation plan per ticket in chat. Use when the user wants to pick up work from the feedback backlog — e.g., "フィードバックから着手できそうなチケットを数件出して実装プランを立てて" or "P1 の easy なやつを 3 件見繕って".
---

# plan-from-feedback

TrainLCD のフィードバック置き場（プライベートリポジトリ `TrainLCD/Issues`）から open issue を取得し、**トリアージレベル**と **Claude が推定する対応難易度**で絞り込んだ上で、各チケットに短い実装プランを付けてチャットに出力する **読み取り専用スキル**。

書き込み（コメント・ラベル編集・close・push・PR 作成）は一切行わない。後工程は `create-pr` など別スキルに委ねる。

## 入力

すべて任意。`key=value` のスペース区切りで受け取る想定（例: `/plan-from-feedback triage=P1,P2 difficulty=easy count=3`）。未指定キーは既定値を使う。

| 項目 | 既定値 | 説明 |
| ---- | ---- | ---- |
| `count` | `3` | 最終的に出力する候補数。 |
| `triage` | 未指定（=全て） | `P0` / `P1` / `P2` / `P3` / `untriaged` を単独または CSV。`untriaged` は P0-P3 ラベルが 1 つも付いていない issue。 |
| `difficulty` | 未指定（=全て） | `easy` / `medium` / `hard` を単独または CSV。Claude のヒューリスティック評価でフィルタ。 |
| `platform` | 未指定 | `iOS` / `Android` / `iPadOS` / `Other OS` / `App Clip` のいずれか（CSV 可）。 |
| `category` | 未指定 | `Bug` / `Improvement` / `Crash` / `Feedback` など。`Feedback` はほぼ全件に付くので単独指定しても絞り込み効果が薄い（注意事項参照）。 |
| `exclude_labels` | `💩 Spam`, `🐥 Canary` | 常に除外するラベル。指定で上書き。 |

`triage=P1` のように絵文字なしの略称で受け取り、スキル内部で実ラベル（`🟠 P1 / High` など）に照合する。

## 前提条件

- `gh` CLI が認証済みで、`TrainLCD/Issues` への read 権限を持つアカウントに紐づいていること。
- カレントディレクトリは MobileApp リポジトリ内（本文の実装プラン生成で `Grep` / `Glob` による軽い確認を行うため）。
- 書き込み系の操作は**しない**。`gh issue edit` / `gh issue comment` / `gh issue close` / `git commit` / `git push` は呼ばない。

## 参考: TrainLCD/Issues のラベルスキーマ

絞り込み引数を実ラベルに当てはめる際の対応表。Issues 側で新しいラベルが追加されている可能性があるので、候補が 0 件になる場合は `gh label list --repo TrainLCD/Issues` で最新を確認する。

- トリアージ: `🔴 P0 / Critical`（運用上将来追加の可能性あり）、`🟠 P1 / High`、`🟡 P2 / Medium`、`🟢 P3 / Low`
- カテゴリ: `🐛 Bug`、`🛠️ Improvement`、`🙏 Feedback`、`💣 Crash`、`❓ Unknown Type`、`💩 Spam`
- プラットフォーム: `🍎 iOS`、`🤖 Android`、`🍎 iPadOS`、`❓ Other OS`、`📎 App Clip`
- 環境: `🌏 Production`、`🐥 Canary`
- 機能: `🤖 Auto Mode`、`🤖 Auto Mode 1.0`、`🤖 Auto Mode 2.0`
- GitHub 標準: `bug` / `enhancement` / `question` / `documentation` / `good first issue` / `help wanted` / `duplicate` / `invalid` / `wontfix`

## 難易度ヒューリスティック

Issues リポジトリには difficulty ラベルが無いため、Claude が issue 本文と軽い repo 調査から以下のように推定する。

- **easy**: 単一コンポーネント／単一定数テーブル／アセット差し替えのみで完結しそう。例: 路線カラー定数の誤り、ナンバリング画像のファイル名誤り、文言修正、特定駅のメタデータ修正。
- **medium**: 複数ファイルに跨るが、既存パターンの踏襲で書ける。例: 既存テーマに新路線を追加、既存設定画面に項目追加、既存の放送テンプレに種別を追加。
- **hard**: 新しい抽象・状態管理・ネイティブ連携・外部 API との整合が必要。例: Auto Mode 2.0 に新モード、OS 側の権限設計、GraphQL スキーマ変更、新しいリアルタイム処理ループの追加。

判定時の調査は「当たりを付ける」程度でよい。本文を読むだけで判定できない場合に限り、該当しそうなファイル名を `Grep` / `Glob` で 1 - 2 回だけ確認する。深追いしない。

## 手順

1. **引数の解釈と既定値の適用**

   未指定キーは既定値で埋める。`triage` / `difficulty` / `platform` / `category` は CSV 対応。引数が渡されたが知らない値（例: `triage=P5`）の場合はユーザーに確認してから進める。

2. **issue 取得**

   候補プールを確保するため `--limit 50` で広めに取る。

   ```bash
   gh issue list \
     --repo TrainLCD/Issues \
     --state open \
     --limit 50 \
     --json number,title,labels,body,url,createdAt,updatedAt
   ```

   取得件数が少ない（候補プールが痩せる）場合に限り `--limit 100` まで引き上げてよい。それ以上は広げない。

3. **ハード除外フィルタ**

   `exclude_labels` に含まれるラベルが 1 つでも付いている issue を落とす。既定は `💩 Spam` と `🐥 Canary`。

4. **条件フィルタ**

   - `triage` 指定時: 指定値と一致するラベルのみ残す。`untriaged` が含まれる場合は P0-P3 ラベルが 1 つも付かない issue も残す。
   - `platform` 指定時: 指定プラットフォームラベルのみ残す。
   - `category` 指定時: 指定カテゴリラベルのみ残す。

   ここでプールが `count` を大きく下回る（例: 0-1 件）場合は、その旨を報告してユーザーに条件緩和を提案する。勝手に条件を外さない。

5. **難易度推定**

   残存 issue を triage（`P0` > `P1` > `P2` > `P3` > `untriaged`）、同 triage 内では `updatedAt`（新しい順）で一次ソートした上で、**先頭から `count * 4` 件を上限** に本文を読み、`easy` / `medium` / `hard` を推定する。先に母集団を正しく並べておかないと、`count * 4` の切り出しで P0/P1 を取りこぼす恐れがあるので必ずソートを先に行うこと。

   - 本文にある Gemini 要約（`## Geminiによる要約` 節）は原文優先・要約は補助情報として扱う。当たりを付けるためのヒントに留め、判断の根拠には原文の「症状」ブロックを使う。
   - 本文だけで判定に迷ったら、該当しそうなファイルを `Grep` / `Glob` で 1 - 2 回だけ軽く確認。深追いはしない。
   - 判定が付かない場合は `unknown` として残し、後段の difficulty フィルタでは除外候補にする。

6. **difficulty フィルタとランキング**

   - `difficulty` 指定時は一致する推定値のみ残す（`unknown` は除外）。
   - 残存から `count` 件を選ぶ。並び順は:
     1. triage（`P0` > `P1` > `P2` > `P3` > `untriaged`）
     2. difficulty（`easy` > `medium` > `hard`）
     3. `updatedAt` の新しい順

7. **簡易実装プラン生成**

   各 issue につき以下のブロックを作る。冗長にしない — 1 チケットあたり 10-15 行程度が目安。

   ```markdown
   ### #<番号> <タイトル>

   - URL: <url>
   - ラベル: triage=<P*|untriaged> / platform=<iOS|Android|iPadOS|...> / category=<Bug|Improvement|Crash|Feedback|...>
   - 推定難易度: <easy|medium|hard>（根拠: <1 行>）

   **要約**: <症状・要望の 1-2 行。Gemini 要約があればそれを流用・圧縮>

   **触りそうなファイル**:
   - `<path>:<line?>` — <短い説明>
   - `<path>` — <短い説明>

   **ざっくり手順**:
   1. <3-5 行の箇条書き>
   2. ...

   **未確定**: <あれば 1-2 行。無ければこの行自体を省略>
   ```

   注意書き:

   - Firebase の画像 URL やスタックトレース、レポーター UID 等は出力に含めない（プライバシー + トークン節約）。
   - `duplicate` / `wontfix` / `invalid` ラベルが付いている issue が候補に残った場合は、ラベル行の末尾に `⚠ <ラベル>付き` を添えて、ユーザーが気づけるようにする。

8. **サマリ出力**

   上で作った各ブロックをチャットに直接流し、先頭に以下のヘッダを置く:

   ```text
   plan-from-feedback サマリ (候補 <N> 件 / プール <M> 件 / 条件: triage=..., difficulty=..., platform=..., category=..., exclude=...)
   ```

   末尾に 1 行だけ提案を添える:「実装に進める場合は、対象チケット番号を指定して `create-pr` 等を呼んでください」。スキル側ではブランチ切り出し・PR 作成・コメント投稿を**しない**。

## 注意事項

- **書き込み禁止**: `gh issue edit` / `gh issue comment` / `gh issue close` / `gh label` / `git commit` / `git push` / `gh pr create` のいずれも呼ばない。このスキルは read-only 契約。
- **プール枯渇時は勝手に緩めない**: 条件を緩めるかどうかはユーザー判断。候補が 0-1 件なら「現条件では N 件しか該当しません。`triage` を外す／広げる等の緩和案があります」と報告する。
- **難易度推定は当たりを付ける程度で可**: 精度に自信が無ければ `unknown` として残し、`difficulty` 指定時には弾く。深掘りで消耗しないこと。
- **Feedback ラベルの扱い**: `🙏 Feedback` はフィードバック issue のほぼ全件に付く運用のため、`category=Feedback` 単独指定は絞り込み効果が薄い。ユーザーにもその旨を案内する。
- **P0 の扱い**: 現状のラベル一覧には `🔴 P0 / Critical` が観測されていないが、運用上将来付く可能性があるため、引数値としては受け入れる。該当 0 件なら 0 件でよい。
- **本文中の画像・UID**: Firebase Storage の画像 URL、`Sentry Event ID`、`レポーターUID` は出力に含めない。
- **Gemini 要約の扱い**: 本文の `## Geminiによる要約` は原文優先・要約は補助情報として扱う。判断は原文の「症状」ブロックを優先し、要約は当たりを付けるためのヒントに留める（要約が本文より楽観的な場合は要約を緩めて出力）。

## よくある使い方

```bash
# 既定: 3 件、Spam と Canary を除外
/plan-from-feedback

# 高優先度で easy を 2 件
/plan-from-feedback triage=P0,P1 difficulty=easy count=2

# Android だけ、トリアージなしでも可、5 件
/plan-from-feedback platform=Android count=5

# バグ + Crash、medium 以上
/plan-from-feedback category=Bug,Crash difficulty=medium,hard
```
