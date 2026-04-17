---
name: sync-dev-from-master
description: Open a dev<-master merge PR that syncs master back into dev after a production release for TrainLCD MobileApp. Creates the chore/dev-from-master branch from origin/master, fills the PR template properly (not with empty stubs), and explicitly warns that the PR must be merged as a merge commit (NOT squash). Use after publish-release (or any time master has drifted ahead of dev).
---

# sync-dev-from-master

本番リリース後に `master` へ積まれた差分を `dev` へ戻すためのマージPRを作るスキル。`publish-release` の後工程として使う（忘れやすいので独立スキル化）。

**最重要: この PR は必ず通常の merge commit でマージする。squash / rebase は禁止。** 過去 PR #5838 で squash merge してしまい、merge commit が潰れて意味が無くなり PR #5840 で再掲する事故があった。スキル実行時と完了報告の両方でこの注意を明示する。

## 入力

| 項目 | 必須 | 既定値 |
| ---- | ---- | ---- |
| `release_version` | 任意 | 省略可。指定されれば本文の「概要」に `v<version>` を入れる。未指定なら `origin/master:package.json` の `version` を使う |

ブランチ名は **`chore/dev-from-master` 固定**（過去運用 PR #5838 / #5840 準拠）。入力で変えられない。

## 前提条件

- カレントディレクトリがリポジトリルート。
- `gh` CLI 認証済み、`git` が使える。
- 作業ツリーがクリーン（未コミット変更なし）。残っている場合は中断し、ユーザーにクリーンアップを依頼する。
- リモートブランチ `origin/dev` / `origin/master` が存在する。

## 手順

1. **差分確認（無ければ中断）**

   ```bash
   git fetch origin dev master --tags
   git log --oneline origin/dev..origin/master
   ```

   - 0 件なら「master は dev に対して進んでいない。同期 PR 不要」で中断し報告。
   - 1 件以上あれば続行。コミット件名リストは後で本文に使うので保持。

2. **既存 open PR のガード**

   ```bash
   gh pr list --base dev --head chore/dev-from-master --state open --json number,url
   ```

   - 既に open なら新規作成せず、既存 URL を返して中断。
   - close 済み or merged のみなら続行。

3. **既存 `chore/dev-from-master` の安全な削除・再作成**

   過去リリースの枝が残っている想定で動く。以下の判定で進める。

   ```bash
   # ローカル・リモートの存在確認
   git show-ref --verify --quiet refs/heads/chore/dev-from-master && echo LOCAL_EXISTS
   git ls-remote --heads origin chore/dev-from-master
   # 直近の dev 宛 PR の状態
   gh pr list --base dev --head chore/dev-from-master --state all --limit 1 --json number,state,url
   ```

   - **ケース A: どこにも存在しない** → そのまま手順 4 へ。
   - **ケース B: 存在し、直近 PR が `MERGED`** → 削除対象。ブランチ名・直近 PR 番号・PR URL をユーザーに提示し、`git push origin --delete chore/dev-from-master` と `git branch -D chore/dev-from-master`（ローカルに有る場合）の実行可否を承認取り。承認後に削除。
   - **ケース C: 存在するが直近 PR が `MERGED` 以外（`OPEN` は手順 2 で弾かれる。残るのは `CLOSED` または PR 無し）**: 削除しないで中断してユーザーに判断を仰ぐ（未マージ作業の可能性）。
   - **ケース D: ローカルに未 push コミットが有る**: `git cherry origin/chore/dev-from-master` で検知。削除せず中断しユーザーに確認。

4. **ブランチを origin/master から切り出して push**

   ```bash
   git fetch origin master
   git switch -c chore/dev-from-master origin/master
   git push -u origin chore/dev-from-master
   ```

   - 何もコミットは積まない（master 先端そのまま）。biome 等のフォーマッタは走らせない（新規コミット無し）。
   - push 前に、対象 SHA（`git rev-parse origin/master`）・取り込まれるコミット件数・本文に入れる version をユーザーに提示して承認を取る。

5. **PR 本文を組み立て（テンプレ厳守・全節を実内容で埋める）**

   `.github/pull_request_template.md` の節構成をそのまま使う。**全ての節でテンプレの `<!-- ... -->` コメントを残さず実内容に置換する**（過去の雑な埋め方をやめる）。

   本文テンプレ（`<...>` は実値に置換）:

   ```markdown
   ## 概要

   本番リリース **v<release_version>** 後に `master` ブランチへ積まれた差分を `dev` ブランチへ同期するマージPRです。`master` と `dev` の履歴を揃えることが目的で、コードの新規変更は含みません。

   ## 変更の種類

   - [ ] バグ修正
   - [ ] 新機能
   - [ ] リファクタリング
   - [ ] ドキュメント
   - [ ] CI/CD
   - [x] その他

   ## 変更内容

   `master` に積まれていて `dev` に未反映の以下 **<N>** 件のコミットを `dev` に取り込みます。

   <コミット件名の箇条書き>

   ## テスト

   - [ ] `npm run lint` が通ること
   - [ ] `npm test` が通ること
   - [ ] `npm run typecheck` が通ること

   本PRはコード変更を含まないマージPRのため、当ブランチ上で lint / test / typecheck は実行していません。取り込まれる各コミットは元の PR 時点および `master` への取り込み時点で検証済みです。

   ## 関連Issue

   なし（リリース後の同期PR）。

   ## スクリーンショット（任意）

   なし（コード変更を含まないマージPR）。
   ```

   **置換ルール**:
   - `<release_version>`: 入力 `release_version` があればそれ（先頭 `v` は剥がす）。未指定なら `git show origin/master:package.json | python3 -c "import json,sys;print(json.load(sys.stdin)['version'])"` の値。取得失敗時は「概要」節から `**v<release_version>** ` の部分を丸ごと外す（偽情報を書かない）。
   - `<N>`: 手順 1 で数えたコミット件数。
   - `<コミット件名の箇条書き>`: `git log --pretty='- %s' origin/dev..origin/master` の出力をそのまま貼る。**50 件を超える場合**は先頭 50 件 + `- ...他 <M> 件` を付けて省略し、省略した旨を「変更内容」節末尾に 1 行書く。

   **チェックボックスの判定**:
   - 変更の種類は **`その他` のみ ON**、他は全 OFF。理由: 当PRはアプリ挙動の変更ではなくマージ操作のため（`create-pr` の「大原則: 判定はアプリの挙動に対する変更か」を適用し、コミット件名のトリガ語句に引きずられない）。
   - テストは **3 項目全 OFF** + 下に実行していない旨の説明文。当ブランチで走らせていない以上、ON にしない（虚偽報告回避）。

6. **PR 作成**

   ```bash
   gh pr create \
     --base dev \
     --head chore/dev-from-master \
     --title "dev<-master" \
     --assignee TinyKitten \
     --body "$(cat <<'EOF'
   <手順 5 で組み立てた本文>
   EOF
   )"
   ```

   - タイトルは **`dev<-master` 固定**（PR #5467 以降全てこの表記）。
   - Assignee は `TinyKitten`（CLAUDE.md / メモ）。

7. **完了報告（マージ方法を強調）**

   完了報告の冒頭に、太字で以下を書く:

   > **⚠ このPRは必ず「Create a merge commit」でマージしてください。Squash / Rebase は禁止です。**
   > Squash すると master 側の merge commit 構造が潰れ、dev と master の履歴分岐が壊れます。過去 PR #5838 で同じミスが起き PR #5840 で再掲した実績あり。

   続けて以下を簡潔に報告:
   - PR URL
   - 対象 SHA（`origin/master` の HEAD）
   - 取り込みコミット件数と、長い場合は省略したか否か
   - 変更の種類チェック状態（`その他` のみ ON）
   - テスト欄のチェック状態（全 OFF + 説明文あり）
   - 使用した `release_version`（どこから取ったか）

## 注意事項

- **Squash merge 禁止**。これがこのスキルの存在理由の半分。実行時と完了報告で二重に明示する。
- コード変更が無いため `npx biome check --unsafe --fix ./src` は走らせない（メモのルールは「コミット前」に適用されるが当スキルは新規コミットを作らない）。
- `publish-release` 直後に呼ばれるのが典型だが、master が dev より進んでいるタイミングなら単独でも使える（hotfix を master に直接入れた後など）。
- PR テンプレの節構成は改変しない（CLAUDE.md ルール）。
- 既に open な dev<-master PR がある場合は新規作成せず既存 URL を返す（手順 2）。
