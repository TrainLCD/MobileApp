---
name: finalize-release
description: Run the full post-release finishing flow for TrainLCD MobileApp in one shot — tag origin/master HEAD, publish a GitHub Release with auto-generated notes, and open a dev<-master sync PR. Thin orchestrator over publish-release + sync-dev-from-master that consolidates mid-flow approvals into a single upfront confirmation. Use after a production release PR (release/vX.Y.Z → master) has been merged.
---

# finalize-release

本番リリース PR が master にマージされた直後の仕上げを **一気通貫** で行うラッパー。`publish-release`（タグ作成・GitHub Release 公開）→ `sync-dev-from-master`（dev への同期PR作成）を順に走らせる。各スキルが持つ個別承認ゲートを **1 回の実行計画承認に統合** するのが主目的。

## 委譲先

1. **publish-release**: master HEAD に annotated tag を打ち、`gh release create --generate-notes --latest` で GitHub Release を即公開。
2. **sync-dev-from-master**: `chore/dev-from-master` を master から切り出し、`dev<-master` タイトルのマージPRを作成。

各スキル自体の仕様（安全弁・検証・本文テンプレ・squash merge 禁止警告）はそのまま流用する。このスキルは **差分情報の先読み** と **承認の統合** のみを担い、独自の破壊的操作は追加しない。

## 入力

| 項目 | 必須 | 既定値 |
| ---- | ---- | ---- |
| `version` | 任意 | 未指定なら `origin/master:package.json` の `version` を使う（先頭 `v` は剥がす） |

sync 側の走行は **必須**。master→dev 差分が 0 件の場合のみ自動スキップする。ユーザーが sync だけ飛ばしたい場合は `publish-release` を直接呼んでもらう（このスキルに skip オプションは持たせない）。

## 前提条件

- 本番リリース PR が **既に master にマージ済み**。未マージなら中断。
- `gh` CLI 認証済み、`git` が使える。
- 作業ツリーがクリーン（未コミット変更なし）。残っている場合は中断し、ユーザーにクリーンアップを依頼する。
- リモート `origin/master` / `origin/dev` が存在する。

## 手順

1. **共通前処理（フェッチと version 解決）**

   ```bash
   git fetch origin dev master --tags
   ```

   `version` が未指定なら:
   ```bash
   git show origin/master:package.json | python3 -c "import json,sys;print(json.load(sys.stdin)['version'])"
   ```
   で取得。`MAJOR.MINOR.PATCH` 形式（SemVer）でなければ中断。

2. **プレフライト（全サブスキルの実行計画を先読み）**

   **この段階では何も書き換え・push しない**。以下を全部先に確認し、実行計画を 1 本にまとめる。失敗条件（重複タグ・version 不一致・既存枝に未マージコミット等）はここで検知し、承認ゲート前に中断する。

   **publish-release 側の先読み**:
   - 既存タグ・Release 重複: `git tag --list "v<version>"`, `git ls-remote --tags origin "refs/tags/v<version>"`, `gh release view "v<version>" --json tagName 2>/dev/null` → いずれかヒットで中断。
   - master HEAD SHA: `git rev-parse origin/master`
   - master HEAD 件名: `git log -1 --format='%s' origin/master`
   - package.json version 一致確認 → 不一致で中断。

   **sync-dev-from-master 側の先読み**:
   - master→dev 差分件数: `git rev-list --count origin/dev..origin/master` と `git log --pretty='- %s' origin/dev..origin/master`
     - **0 件なら sync をスキップ** としてプランに記録（中断ではない）。
   - 既存 open な dev<-master PR: `gh pr list --base dev --head chore/dev-from-master --state open --json number,url`
     - 既に open なら **新規作成はスキップし既存 URL を流用** としてプランに記録。
   - 既存 `chore/dev-from-master` の状態（open PR が無い前提で）:
     - `git ls-remote --heads origin chore/dev-from-master` と `gh pr list --base dev --head chore/dev-from-master --state all --limit 1 --json number,state,url`
     - ローカル未 push コミット有無: `git show-ref --verify --quiet refs/heads/chore/dev-from-master` でローカル枝の存在を確認し、有るなら `git cherry origin/chore/dev-from-master` を実行。出力が空でなければ **中断** してユーザーに確認（自動では削除しない）。
     - 直近 PR が `MERGED` → 承認後に削除・再作成予定としてプランに記録。
     - それ以外（`CLOSED` のみ、PR 無し等）→ 中断してユーザーに確認（自動では削除しない）。

3. **承認ゲート（一括）**

   以下フォーマットで実行計画を要約し、**1 回だけ** ユーザー承認を取る。承認が出たら手順 4〜5 を連続実行し、途中で止めない。

   ```
   finalize-release 実行計画 (version=v<version>)

   [publish-release]
     - タグ: v<version> (annotated, メッセージ "v<version>")
     - 対象 SHA: <origin/master SHA>
     - master HEAD 件名: <件名>
     - package.json version 一致: OK
     - GitHub Release: --target master --generate-notes --latest

   [sync-dev-from-master]
     - master→dev 差分: <N> 件
     - 既存 chore/dev-from-master: <有り (直近 PR #<M> MERGED) → 削除・再作成 | 無し → 新規作成>
     - PR: base=dev, head=chore/dev-from-master, title="dev<-master"
     - ⚠ Squash merge 禁止（マージ時は Create a merge commit）
   ```

   スキップ判定時は該当セクションを以下に差し替える:
   - 差分 0 件: `[sync-dev-from-master] skip (master は dev と同期済み)`
   - 既存 open PR あり: `[sync-dev-from-master] 既存 PR を流用 (URL: <url>)`

   承認が得られなければ中断。

4. **publish-release の実体を実行（承認済み前提）**

   `publish-release` スキルの手順 4〜5 を走らせる:
   ```bash
   git tag -a "v<version>" -m "v<version>" <origin/master SHA>
   git push origin "v<version>"
   gh release create "v<version>" --target master --title "v<version>" --generate-notes --latest
   ```

   プレフライトで確認済みの項目（タグ・Release 重複、version 一致、SHA）は、破壊操作直前に **非対話で再検証** する（追加承認は取らない）。再検証で不一致が出た場合（並行リリース等で状態が変わっている）は安全のため中断し、検知内容のみ報告する。

5. **sync-dev-from-master の実体を実行（プレフライト判定に従う）**

   - **スキップ判定** → 手順を飛ばす。
   - **既存 open PR 流用** → その URL を完了報告に使い、ブランチ再作成や PR 新規作成はしない。
   - **通常実行** → `sync-dev-from-master` スキルの手順 3〜6 を走らせる:
     1. 必要なら `git push origin --delete chore/dev-from-master`（プレフライトで承認済み前提、再承認しない）。
     2. `git switch -c chore/dev-from-master origin/master` → `git push -u origin chore/dev-from-master`
     3. PR 本文をテンプレ準拠で組み立てて `gh pr create`（`release_version` には手順 1 の `version` を渡す）。

6. **完了報告**

   1 レスポンスで以下を報告する:

   - **publish-release** の結果: タグ名、対象 SHA、Release URL、Latest 判定、Release 本文の冒頭数行サマリ
   - **sync-dev-from-master** の結果:
     - 通常実行時: PR URL、取り込みコミット件数、変更の種類・テスト欄チェック状態
     - スキップ時: `skip (差分なし)`
     - 流用時: `既存 PR を流用: <url>`
   - **⚠ 警告**: sync の PR が新規作成または流用された場合のみ、以下を太字で明示:
     > **sync の PR は必ず「Create a merge commit」でマージしてください。Squash / Rebase は禁止です。** （PR #5838 の教訓）

## 注意事項

- **承認の統合** がこのスキルの付加価値。プレフライトで危ない状態（タグ重複・version 不一致・未マージブランチ残存等）は **承認ゲートに到達させない** ことで、「承認したら止まらない」契約を守る。
- 操作順は **タグ先・PR 後** で固定。publish-release 成功後に sync 側が失敗しても、タグと Release は既に公開済みで巻き戻さない。sync 失敗時は原因を修正して `sync-dev-from-master` を単独呼び直しで補完する（その旨を完了報告で案内する）。
- `git push --delete` や annotated tag push は破壊的に見えるが、プレフライトで重複ガードと `MERGED` 確認を済ませた上で実行する前提。
- Squash merge 禁止警告は sync 側 PR が絡んだ場合（新規作成 or 既存流用）のみ出す。スキップ時は不要。
