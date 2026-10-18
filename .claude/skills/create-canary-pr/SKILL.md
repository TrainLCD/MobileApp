---
name: create-canary-pr
description: Create a canary release PR for TrainLCD MobileApp by branching from dev, including the build-number bump in that same PR, and skipping automatic bump. Use when the user asks for a canary release or dev→canary PR.
---

# create-canary-pr

dev の履歴を保ってリリースブランチを切り、ビルド番号の更新を含めて `canary` へ PR を作成する。
bump 専用 PR は作成しない。PR 作成本体は **`create-pr`** スキルに委譲する。

## 事前確認

- `git status --porcelain` で作業ツリーを確認する。未コミットの変更は混ぜず、必要なら別 worktree を使う。
- **判定前に `git fetch origin dev canary` を実行する**。失敗したら中断し、古い参照で比較しない。
- ローカル `dev` がある場合だけ `git log --oneline origin/dev..dev` で先行コミットを確認する。
  先行していれば一覧を提示し、リリースに含めるか確認する。
  含める場合はローカル `dev` の SHA、含めない場合や先行がない場合は `origin/dev` の SHA を起点にする。
  回答前に依存する準備を進めない。選んだ SHA を `source_sha` として記録する。
  ローカル `dev` を選ぶ際は、最新の `origin/dev` がその祖先であることも確認する。
  分岐していれば取り込み方を確認し、リモートの変更を黙って除外しない。
  リリースブランチへの cherry-pick や `dev` への直接 push は行わない。
  ローカル `dev` がない場合の起点は `origin/dev` とする。
- 以下で既存 canary PR を確認する。head を `dev` に限定しない。

  ```bash
  gh pr list --base canary --state open \
    --json number,url,headRefName,headRefOid,labels
  ```

  同じリリースの PR があれば「既存 PR・再実行」へ進む。複数あれば対象を確認する。
  新しい PR が必要な場合だけ、次の準備を行う。

## リリースブランチとビルド番号の準備

1. `source_sha`、`origin/dev` と `origin/canary` の SHA を記録する。
   起点の semver と、起点・canary 双方のビルド番号を記録する。
   `app.config.ts` と各ネイティブ定義が整合していることを確認する。
   不一致や数値でない定義があれば中断し、推測で採番しない。

   - `app.config.ts` の `ios.buildNumber` と `android.versionCode`
   - `ios/TrainLCD.xcodeproj/project.pbxproj` の `CURRENT_PROJECT_VERSION`
   - `android/app/build.gradle` の各フレーバーの `versionCode`
   - `android/wearable/build.gradle.kts` の各フレーバーの `versionCode`

2. 記録した `source_sha` から次のブランチを切り出す。
   `release/canary-<source_sha の短縮値>-<canary SHA の短縮値>` とし、元のコミット履歴を保つ。
   同名のローカル・リモートブランチがあれば内容を確認して再利用し、上書きしない。
   リモート参照の通信・認証エラーを「存在しない」とみなさない。
3. 過去の canary の bump が dev に入っていない場合でもマージできるよう、canary の履歴を取り込む。
   `origin/canary` が HEAD の祖先でなければ、
   `git merge --no-ff --no-commit origin/canary` を行う。
   競合の有無にかかわらず semver は手順 1 で記録した起点の値に揃える。
   ビルド番号の競合箇所は一旦起点の値で解消し、競合マーカーを残さない。次の手順で採番し直す。
   ファイル全体を ours / theirs で置き換えない。その他の競合は中断して報告する。
4. 起点と canary の両方を基準に、配信済みの番号と衝突しない次の値を計算する。
   起点の番号だけを基準にしない。bump を dev へ戻す PR は作らない。

   - iOS: 両ブランチの iOS ビルド番号の最大値 +1。
   - Android アプリ: 両ブランチのアプリと Wear OS の `versionCode` の最大値 +1。
   - Wear OS: 更新後の Android アプリ +1（スクリプトが設定する）。

   ```bash
   npm run version:bump -- --no-version-increment \
     --ios-build <次のiOSビルド番号> --android-version <次のAndroidアプリ番号>
   ```

   採番とファイル更新は `scripts/bump-version.js` に任せる。
   semver が起点の値から変わらず、手順 1 の各定義が次の番号に揃ったことを確認する。
   `git diff` と `git diff --cached` の両方を確認し、無関係な変更を混ぜない。
5. `npm run lint` と `npm test -- --runInBand scripts/bump-version.test.js` を実行する。
   失敗した場合は commit / push しない。確認したパスだけを stage し、日本語の単文で commit する。
   手順 3 のマージが未完了なら、この commit で完了する。リリースブランチを push する。
6. PR 作成直前に dev と canary を再 fetch する。手順 1 の SHA から進んでいれば再比較する。
   承認された起点を別のローカル `dev` の SHA へ黙って差し替えない。
   新たな canary の番号を超えていることと、PR がマージ可能であることを確認する。
   他のリリース PR ができていれば重複作成せず、対象を確認する。

## canary PR 作成

ビルド番号の更新を commit / push した**リリースブランチから直接 canary へ**作成する。
`create-pr` を以下の入力で呼び出す。dev への事前反映や bump PR のマージ待ちは行わない。

| 項目 | 値 |
| ---- | ---- |
| `base` | `canary` |
| `head` | 準備した `release/canary-...` ブランチ |
| `title` | `canary` |
| `summary` | dev の変更とビルド番号更新を含む canary リリースである旨 |
| `related_issue` | 省略 |
| `skip_checks` | 実際の実行結果に従う。未実行の項目を ON にしない |
| `labels` | `["skip-version-bump"]` |

`gh pr create --label skip-version-bump` で PR 作成時にラベルを指定する。
GitHub CLI は PR 作成後、別の API 操作でラベルを付与するため、`opened` 時点のラベルは確定値ではない。
`.github/workflows/bump_version_on_canary_pr.yml` はジョブ開始後にラベルを再取得する。
5 秒間隔で最大 12 回確認し、ラベルがあれば checkout 以降をスキップする。
最後の確認でもラベルがなければ従来どおり bump する。取得エラー時はジョブを失敗させ、bump しない。
PR 本文のマーカーは判定に使わず、スキルから `workflow_dispatch` を起動しない。
スキルを使わずラベルなしで開く PR の自動 bump は従来どおり残す。

## 既存 PR・再実行

- 同じリリースブランチの open PR があれば URL を再利用し、再実行だけを理由に番号を上げない。
  ラベル、commit 済みの bump、両 OS の番号と canary に対するマージ可否を確認する。
- PR 作成前に中断していた場合は、記録した起点とブランチの内容を確認する。
  bump 済みなら再 bump せず、未完了の検証・push・PR 作成から再開する。
- 旧手順の `dev` を head とする PR は、リリースブランチへ head を変更できないため自動で置き換えない。
  URL と状態を報告し、置き換え方を確認する。dev への bump 専用 PR は作成しない。
  既存の自動 bump workflow が待機中・実行中なら完了を待ち、並行して番号を更新しない。

## リリース特有の注意

- タイトルは従来どおり `canary` 固定。ユーザーが別タイトルを希望した場合は確認する。
- 変更の種類・Assignee・テンプレ節構成は `create-pr` に従う。
- **canary PR は squash merge せず、通常の merge commit でマージする**。
- 完了報告では canary PR の URL、head ブランチ、ビルド番号、`skip-version-bump` の有無を示す。
