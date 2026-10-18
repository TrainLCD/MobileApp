---
name: create-canary-pr
description: Cut a dev→canary release pull request for TrainLCD MobileApp. Prepare build numbers before opening the PR and skip the automatic bump workflow. Use when the user asks to open a canary release PR, dev→canary PR, or similar phrasing.
---

# create-canary-pr

`dev` から `canary` へのリリース PR を作成する。
先にビルド番号を `dev` へ反映し、canary PR の自動 bump をスキップする。
PR 作成本体は **`create-pr`** スキルに委譲する。

## 事前確認

- `git status --porcelain` で作業ツリーを確認する。未コミットの変更は混ぜず、必要なら別 worktree を使う。
- **判定前に `git fetch origin dev canary` を実行する**。失敗したら中断し、古い参照で比較しない。
- `git show-ref --verify --quiet refs/heads/dev` でローカル `dev` の有無を確認する。
  無ければ先行判定は不要。存在する場合は `git log --oneline origin/dev..dev` を確認する。
  先行コミットがあれば一覧を提示し、別ブランチへ切り出して PR にするか確認する。
  `dev` は protected のため直接 push を促さない。この判定は `create-pr` の push 手順より優先する。
- 以下で既存 canary PR を確認する。
  存在する場合は「事前 bump」へ進まず、「既存 canary PR」の処理だけを実行する。
  存在しない場合に限り、次の「事前 bump」へ進む。

  ```bash
  gh pr list --base canary --head dev --state open --json number,url,labels
  ```

## 事前 bump

canary リリースでは semver を据え置き、iOS ビルド番号と Android `versionCode` を更新する。
採番とファイル更新は `scripts/bump-version.js` に任せる。
Android アプリは +2、Wear OS は更新後のアプリ +1 に揃う。

1. `origin/dev` と `origin/canary` の以下の定義を比較する。
   各定義が整合し、両 OS の番号が canary より大きい場合は準備済みとして再 bump しない。
   片方だけ更新済み、定義の不一致、番号の逆転がある場合は中断して報告する。

   - `app.config.ts` の `ios.buildNumber` と `android.versionCode`
   - `ios/TrainLCD.xcodeproj/project.pbxproj` の `CURRENT_PROJECT_VERSION`
   - `android/app/build.gradle` の各フレーバーの `versionCode`
   - `android/wearable/build.gradle.kts` の各フレーバーの `versionCode`

2. 両 OS とも dev と canary の番号が一致する場合、最新の `origin/dev` から
   `release/canary-build-<origin/canary の短縮 SHA>` を切り出す。
   同名のローカル・リモートブランチや dev 向け PR があれば内容を確認して再利用する。
   bump 済みなら手順 3 を飛ばす。再 bump や上書きはしない。
   リモート参照の通信・認証エラーを「存在しない」とみなさない。
3. `npm run version:bump -- --no-version-increment` を実行する。
   `git diff` で semver が変わらず、変更が手順 1 のビルド番号定義だけであることを確認する。
4. `npm run lint` と `npm test -- --runInBand scripts/bump-version.test.js` を実行する。
   失敗した場合は commit / push しない。確認したファイルだけを stage し、日本語の単文で commit する。
   準備ブランチを push し、`dev` へ直接 push しない。
5. `create-pr` に委譲し、準備ブランチから `dev` へ bump 専用 PR を作成する。
   既存 PR があれば再利用する。テスト欄は実行結果に合わせ、未実行の項目を ON にしない。
   必要な CI が成功してマージ可能になったら、**bump 専用 PR だけを squash merge** する。
   リリース依頼でマージまで承認されている場合は追加確認せず進める。
   それ以外は bump PR の URL を提示してマージ承認を待ち、canary PR はまだ作成しない。
6. `git fetch origin dev canary` を再実行する。
   リモートの `dev` に bump が反映され、各定義が整合して両 OS の番号が canary より大きいことを確認する。
   取り込み中に canary が進んだ場合は再比較する。
   ローカルの commit や bump PR の作成だけで反映済みとみなさない。
7. open な dev→canary PR を再確認して重複を避け、「canary PR 作成」へ進む。

## canary PR 作成

事前 bump を完了してから、`create-pr` を以下の入力で呼び出す。

| 項目 | 値 |
| ---- | ---- |
| `base` | `canary` |
| `head` | `dev` |
| `title` | `canary` |
| `summary` | 省略（テンプレのコメントのみ） |
| `related_issue` | 省略 |
| `skip_checks` | `false`（`create-pr` の判定に従う） |
| `labels` | `["skip-version-bump"]` |

`gh pr create --label skip-version-bump` で PR 作成時にラベルを指定する。
GitHub CLI は PR 作成後、別の API 操作でラベルを付与するため、`opened` 時点のラベルは確定値ではない。
`.github/workflows/bump_version_on_canary_pr.yml` はジョブ開始後にラベルを再取得する。
5 秒間隔で最大 12 回確認し、ラベルがあれば checkout 以降をスキップする。
最後の確認でもラベルがなければ従来どおり bump する。取得エラー時はジョブを失敗させ、bump しない。
PR 本文のマーカーは判定に使わない。
スキルから `workflow_dispatch` を起動しない。
スキルを使わずラベルなしで開く PR の自動 bump は従来どおり残す。

## 既存 canary PR

- 新しい canary PR は作らず、既存 URL を再利用する。再実行だけを理由に番号を上げない。
- `skip-version-bump` 付きの PR は事前 bump の反映を確認する。
  不足している場合だけ「事前 bump」の手順 1〜6 で補い、自動 bump の手動起動はしない。
- ラベルなしの既存 PR は旧手順として扱う。以下で対応する自動 bump PR を確認する。
  `--search` の曖昧一致ではなく、`--head` / `--base` のブランチ名一致を使う。

  ```bash
  gh pr list --head "auto-version-bump-<canary_pr_number>" --base dev \
    --state all --json number,url,state,mergedAt
  ```

  open ならその PR を利用し、手動 bump を重ねない。マージ済みかどうかと実際の番号を確認する。
  未作成で workflow が待機中・実行中なら完了を待ち、手動 bump と競合させない。
  実行終了後も bump が不足している場合だけ「事前 bump」の手順 1〜6 で補う。

## リリース特有の注意

- タイトルは従来どおり `canary` 固定。ユーザーが別タイトルを希望した場合は確認する。
- canary PR の head は `dev` そのもの。ローカルの変更ではなく `origin/dev` の内容が PR に載る。
- 変更の種類・Assignee・テンプレ節構成は `create-pr` に従い、独自に本文を組み立て直さない。
- **canary PR は squash merge せず、通常の merge commit でマージする**。
- 完了報告では canary PR の URL、反映済みのビルド番号、`skip-version-bump` の有無を簡潔に示す。
