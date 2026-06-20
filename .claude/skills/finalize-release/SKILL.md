---
name: finalize-release
description: Run the full post-release finishing flow for TrainLCD MobileApp in one shot — tag origin/master HEAD, publish a GitHub Release with auto-generated notes, open a dev<-master sync PR, and merge it as a merge commit (temporarily relaxing the dev branch ruleset, which otherwise allows squash only, then restoring it). Thin orchestrator over publish-release + sync-dev-from-master that consolidates mid-flow approvals into a single upfront confirmation. Use after a production release PR (release/vX.Y.Z → master) has been merged.
---

# finalize-release

本番リリース PR が master にマージされた直後の仕上げを **一気通貫** で行うラッパー。`publish-release`（タグ作成・GitHub Release 公開）→ `sync-dev-from-master`（dev への同期PR作成）を順に走らせる。各スキルが持つ個別承認ゲートを **1 回の実行計画承認に統合** するのが主目的。

## 委譲先

1. **publish-release**: master HEAD に annotated tag を打ち、`gh release create --generate-notes --latest` で GitHub Release を即公開。
2. **sync-dev-from-master**: `chore/dev-from-master` を master から切り出し、`dev<-master` タイトルのマージPRを作成。

各スキル自体の仕様（安全弁・検証・本文テンプレ・squash merge 禁止警告）はそのまま流用する。このスキルは **差分情報の先読み**・**承認の統合** に加え、**sync PR の merge commit マージまで** を担う。

`dev` ブランチには Ruleset（`pull_request` ルール）で `allowed_merge_methods` が `["squash"]` に絞られていることがあり、その状態では `gh pr merge --merge` が `Merge commits are not allowed on this repository.` で弾かれる。一方 sync PR は履歴整合のため **必ず merge commit** でマージする必要がある（squash すると merge commit が潰れる。PR #5838 / #5840 の教訓）。そこでこのスキルは sync PR をマージする際、**dev Ruleset を一時的に緩めて（`merge` を許可方式に追加）merge commit でマージし、直後に元へ戻す**。この緩和は唯一の独自破壊的操作であり、**マージの成否に関わらず Ruleset を必ず復元する**（緩和したまま放置しない）ことを不変条件とする。

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
   - 既存タグ重複: `git tag --list "v<version>"` と `git ls-remote --tags origin "refs/tags/v<version>"` のいずれかに出力があれば中断。
   - 既存 Release 重複: `gh release view "v<version>" --json tagName` を実行し、exit 0（=存在）なら中断。exit 1 かつ stderr に `release not found` を含む場合のみ「重複なし」として続行。それ以外の非 0 終了（認証エラー・レート制限・通信障害等）は判定不能なので中断し、stderr を報告する。
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
       - 補足: リモート `origin/chore/dev-from-master` が既に削除済みでローカル枝だけ残るケースでは、`git cherry origin/...` は HEAD 基準で誤射する。実体判定は `git log chore/dev-from-master --not origin/master`・`--not origin/dev` がともに空（＝ master/dev に完全マージ済み・固有コミット無し）かで行い、空なら安全な残骸として削除対象に記録する。
     - 直近 PR が `MERGED` → 承認後に削除・再作成予定としてプランに記録。
     - それ以外（`CLOSED` のみ、PR 無し等）→ 中断してユーザーに確認（自動では削除しない）。

   **マージ方式制約の先読み（dev Ruleset）**:
   - `OWNER_REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)` を解決し、`gh api "repos/$OWNER_REPO/rules/branches/dev" --jq '.[] | select(.type=="pull_request") | {ruleset_id, allowed: .parameters.allowed_merge_methods}'` を読む。
     - `allowed_merge_methods` に `merge` が含まれる → 「マージ時の Ruleset 緩和は不要」とプランに記録。
     - 含まれない（`["squash"]` 等）→ 「マージ時に Ruleset `<id>` を一時緩和（`merge` 追加）→マージ→復元」とプランに記録。`ruleset_id` も控える。
     - `pull_request` ルール自体が無い（PR 必須でない）→ Ruleset 緩和不要としてプランに記録。

3. **承認ゲート（一括）**

   以下フォーマットで実行計画を要約し、**1 回だけ** ユーザー承認を取る。承認が出たら手順 4〜6 を連続実行し、途中で止めない。マージと Ruleset 一時緩和もこの 1 回の承認に含める（マージ直前で改めて承認を取らない）。

   ```text
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
     - マージ: 作成後に merge commit でマージ（--delete-branch）
       - dev Ruleset: <merge 許可済み → 緩和不要 | squash-only (ruleset #<id>) → 一時緩和 ["squash"]→["squash","merge"] → マージ → 復元>
   ```

   スキップ判定時は該当セクションを以下に差し替える:
   - 差分 0 件: `[sync-dev-from-master] skip (master は dev と同期済み)`（この場合マージ・Ruleset 緩和も不要）
   - 既存 open PR あり: `[sync-dev-from-master] 既存 PR を流用 (URL: <url>) → 同 PR を merge commit でマージ`

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

6. **sync PR を merge commit でマージ（dev Ruleset 一時緩和つき）**

   sync が **スキップ**（差分 0 件）された場合はこの手順を飛ばす。新規作成・流用いずれかで dev<-master PR が存在する場合のみ実行する。**緩和→マージ→復元は 1 つの bash 呼び出しにまとめ、`set +e` でマージ失敗を握って復元を無条件実行する**（途中で関数が分かれて復元が飛ぶ事故を防ぐ）。

   1. マージ対象 PR 番号を確定（手順 5 で新規作成 or 流用した PR）。ローカルが `chore/dev-from-master` に居るとブランチ削除で支障が出るため `git switch dev`（または安全な枝）へ退避する。
   2. `OWNER_REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)` を解決。プレフライトの「マージ方式制約」記録を使う:
      - dev が `merge` を許可済み → **緩和不要**。そのまま手順 6-5 のマージへ。
      - squash-only 等で `merge` 不許可 → 手順 6-3 の一時緩和を行う。
   3. **一時緩和**（フル定義をバックアップしてから PUT）。`RS_ID` はプレフライトで控えた `ruleset_id`:
      ```bash
      RS_ID=<プレフライトで控えた ruleset_id>
      gh api "repos/$OWNER_REPO/rulesets/$RS_ID" > ruleset_backup.json   # 復元用。リポジトリ直下の相対パス（/tmp は Git Bash と Windows python で別解決になり read に失敗するため使わない）
      ```
      `ruleset_backup.json` から `name,target,enforcement,conditions,bypass_actors,rules` を取り出し、`pull_request` ルールの `allowed_merge_methods` にのみ `merge` を追加した `ruleset_relaxed.json` を生成（他は一切変えない。既存方式 `squash` は残す）。
      ```bash
      gh api -X PUT "repos/$OWNER_REPO/rulesets/$RS_ID" --input ruleset_relaxed.json \
        --jq '.rules[] | select(.type=="pull_request") | .parameters.allowed_merge_methods'   # ["squash","merge"] を確認
      ```
   4. **マージ（merge commit）**:
      ```bash
      gh pr merge <n> --merge --delete-branch
      ```
      - `--squash` / `--rebase` は使わない。
      - required check 不成立・コンフリクト等で弾かれても **force/admin マージしない**。マージ失敗は握って次の復元へ進む（PR は open のまま残す）。なお `mergeStateStatus=UNSTABLE`（必須でない失敗チェックがあるだけ）は通常マージ可能。
   5. **復元（緩和した場合は必ず実行）**:
      ```bash
      gh api -X PUT "repos/$OWNER_REPO/rulesets/$RS_ID" --input ruleset_backup.json \
        --jq '.rules[] | select(.type=="pull_request") | .parameters.allowed_merge_methods'   # 元の値（例 ["squash"]）に戻ったことを確認
      ```
      **マージが失敗していても Ruleset は必ず復元する。** 復元の PUT 自体が失敗した場合は最優先でユーザーに知らせる（Ruleset を緩めたまま放置しない）。
   6. **検証**: `git fetch origin dev master` 後、
      - dev HEAD が **2 親を持つ merge commit**（squash されていない）であること: `git rev-list --parents -n 1 origin/dev` の親が 2 つ。
      - `git rev-list --count origin/dev..origin/master` が `0`（dev が master を完全包含）。
   7. 一時ファイル `ruleset_backup.json` / `ruleset_relaxed.json` を削除し、ローカル `dev` を `git pull --ff-only origin dev` で追従させる。

7. **完了報告**

   1 レスポンスで以下を報告する:

   - **publish-release** の結果: タグ名、対象 SHA、Release URL、Latest 判定、Release 本文の冒頭数行サマリ
   - **sync-dev-from-master** の結果:
     - 通常実行時: PR URL、取り込みコミット件数、変更の種類・テスト欄チェック状態
     - スキップ時: `skip (差分なし)`
     - 流用時: `既存 PR を流用: <url>`
   - **マージ結果**（sync PR が存在した場合）:
     - 成功時: マージコミット SHA（**2 親の merge commit** である旨）、`origin/dev..origin/master = 0`、dev Ruleset を `<一時緩和して merge commit でマージ→復元（["squash"] に復帰）| 緩和不要（merge 許可済み）>`
     - 失敗時: PR は open のまま・**Ruleset は復元済み**である旨を明示し、`sync-dev-from-master` 単独再実行ではなく手当ての方針（CI 修正後に手動 or 再マージ）を案内
   - **⚠ 補足**: sync PR を **merge commit でマージした**（squash していない）ことを明示。squash すると merge commit 構造が潰れて dev/master 履歴が壊れる（PR #5838 / #5840 の教訓）。手動でマージし直す状況になった場合も必ず「Create a merge commit」を使うこと。

## 注意事項

- **承認の統合** がこのスキルの付加価値。プレフライトで危ない状態（タグ重複・version 不一致・未マージブランチ残存等）は **承認ゲートに到達させない** ことで、「承認したら止まらない」契約を守る。マージと Ruleset 緩和も同じ 1 回の承認に含め、マージ直前で追加承認を取らない。
- 操作順は **タグ → sync PR 作成 → マージ** で固定。publish-release 成功後に sync 作成やマージが失敗しても、タグと Release は既に公開済みで巻き戻さない。sync の PR 作成自体が失敗した場合は原因を修正して `sync-dev-from-master` を単独呼び直しで補完する（その旨を完了報告で案内する）。マージのみ失敗した場合は PR を open のまま残す。
- `git push --delete` や annotated tag push は破壊的に見えるが、プレフライトで重複ガードと `MERGED` 確認を済ませた上で実行する前提。
- **dev Ruleset の一時緩和は不変条件つき**: ①既存の `allowed_merge_methods` を削らず `merge` を**追加するだけ**（広げる方向のみ）、②**マージの成否に関わらず必ず元へ復元**する、③復元は緩和と同一 bash 呼び出し内で `set +e` により無条件実行、④バックアップ/緩和用 JSON はリポジトリ直下の相対パスに置き完了後に削除（`/tmp` は使わない）。復元 PUT 自体が失敗したら最優先で報告する。
- マージは **必ず merge commit**（`gh pr merge --merge`）。`--squash` / `--rebase` は使わない。required check や branch protection で弾かれても **force/admin マージはしない**（PR を残して報告）。
- sync が **スキップ**（差分 0 件）のときはマージも Ruleset 緩和も行わない。`merge` が既に許可されている dev では緩和をスキップして素直にマージする。
