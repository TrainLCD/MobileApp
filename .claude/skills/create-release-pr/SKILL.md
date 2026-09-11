---
name: create-release-pr
description: Cut a production release branch, bump the app version, run quality checks, and open a release pull request targeting master for TrainLCD MobileApp. Use when the user asks to create a production release PR, cut a release branch, or release a specific version (e.g., v10.4.2).
---

# create-release-pr

本番リリース用の PR を作成するスキル。リリース用ブランチの作成から PR 作成までを一気通貫で実行する。PR 作成自体は `create-pr` スキルに委譲する。

## 入力

| 項目 | 必須 | 例 |
| ---- | ---- | ---- |
| `version` | 必須 | `10.4.2` または `v10.4.2`（先頭 `v` は任意、内部で剥がす） |

バージョンはセマンティックバージョニング（`MAJOR.MINOR.PATCH`）であること。満たさない場合は中断してユーザーに確認する。

## 前提条件

- カレントディレクトリがリポジトリルート（`git rev-parse --show-toplevel`）。
- `gh` CLI 認証済み、`git` と `npm` が使える。
- 作業ツリーがクリーン（`git status --porcelain` が空）。変更が残っている場合はユーザーに確認してから別ブランチへ退避する。
- `origin/dev` が最新であること。手順 2 の冒頭で `git fetch origin dev` してから切り出すので事前の同期作業は不要だが、**ローカル `dev` に未 push のコミットがある場合は中断する**（`dev` は protected で直接 push できず、その分はリリースに入らないため）。判定は fetch 後の `git log --oneline origin/dev..dev` で行う（ローカルに `dev` が無ければ判定不要）。

## 手順

1. **バージョン正規化と検証**

   - 入力の先頭 `v` / `V` を取り除き、`MAJOR.MINOR.PATCH` 形式かを検証。
   - 同名のブランチ（ローカル or origin）がすでに存在する場合は中断して、既存ブランチでの進行可否をユーザーに確認する。

     ```bash
     # ローカル側は表示ではなく終了コードで判定する（--list は在っても非 0 にならない）
     if git show-ref --verify --quiet 'refs/heads/release/v<version>'; then
       echo "ローカルに同名ブランチが存在します" >&2; exit 1     # 中断してユーザーに確認
     fi
     git ls-remote --exit-code --heads origin 'refs/heads/release/v<version>'; RC=$?
     case "$RC" in
       0) echo "origin に同名ブランチが存在します" >&2; exit 1 ;;               # 中断してユーザーに確認
       2) : ;;                                                                 # 存在しない。手順 2 へ
       *) echo "リモート参照の確認に失敗（終了コード $RC）" >&2; exit 1 ;;      # 判定不能なので中断
     esac
     ```

     **終了コードは `ls-remote` の直後に `RC` へ退避する。** 後続のコマンドで `$?` が上書きされるうえ、`2`（不存在）と通信・認証エラーを区別せずに進むと、エラー時に「存在しない」と誤認して `git switch -c 'release/v<version>' origin/dev` まで走ってしまう。

2. **dev から切り出し**

   ```bash
   git fetch origin dev   # 失敗したら中断する（古い origin/dev からリリース枝を切らない）
   git switch -c 'release/v<version>' origin/dev
   git rev-parse HEAD     # 切り出し元の SHA を記録し、手順 5 の承認提示に含める
   ```

   - `dev` の head が CI 的に緑であることは呼び出し側で担保する前提（このスキルでは確認しない）。

3. **バージョンバンプ**

   ```bash
   npm run version:bump <version>
   ```

   - 変更されたファイル（`package.json`・ネイティブ側バージョン等）を `git status` で確認し、期待どおりの差分であるかをユーザーに提示する。

4. **コード品質チェック**

   以下を順番に実行し、すべて緑であることを確認する。**本番リリース時は自動修正を一切許可しない**（静かに差分が混入するリスクを避けるため）。失敗したら中断してユーザーに原因を共有する。整形が必要な差分が残っている場合は、リリース用ブランチを作り直す前に dev 側で修正・マージしておくこと。

   ```bash
   npx biome check ./src   # 本番リリース検証は check-only（--fix を付けない）
   npm run lint
   npm run typecheck
   npm test
   ```

   - lint / test / typecheck が失敗した場合、リリースを中断することが原則。ユーザーに判断を仰ぐ。

5. **コミット & push**

   - コミットメッセージは日本語単文（AGENTS.md）:
     ```text
     v<version> をリリース
     ```
   - push 前に、含まれるファイル・コミットメッセージ・ブランチ名を要約し、ユーザーに承認を取る。
   - 承認後:

     ```bash
     git status
     git add <path>...   # version:bump が変更したパスだけを明示的に追加
     git commit -m "v<version> をリリース"
     git push -u origin 'release/v<version>'
     ```

   - **`git status` の目視確認は省略しない**。`git add -A` で一括投入すると、`version:bump` が波及した予期しないファイルもそのまま入る。想定外のファイルが並んでいたら確定せずユーザーに確認する。

6. **PR 作成（`create-pr` スキルへ委譲）**

   以下の入力で `create-pr` を呼び出す:

   | 項目 | 値 |
   | ---- | ---- |
   | `base` | `master` |
   | `head` | `release/v<version>` |
   | `title` | `v<version>🎉` |
   | `summary` | **必ず渡す**。`create-pr` がコミット件名から生成するのは「変更内容」節だけで、`summary` が空だと「概要」節はテンプレのコメントのままになる。リリースノートがあればそれを、無ければ `git fetch origin master` で更新したうえで `git log --format=%s origin/master..HEAD` のコミット件名を要約した 1〜2 文を渡す（手順 2 は `dev` しか fetch しないため、古い `origin/master` のままだと概要に余計な件名が混ざるか必要な件名が落ちる） |
   | `related_issue` | 省略 |
   | `skip_checks` | `false`（手順 4 で全 3 点緑のため ON で OK） |

   `create-pr` の内部ルールどおり、Assignee は `TinyKitten` が自動付与される。

7. **完了報告**

   - リリース用ブランチ名、コミット ID、PR URL、`npm run version:bump` で変更されたファイル一覧、品質チェックの結果サマリを報告する。

## 注意事項

- **本番リリースは影響範囲が大きい**。push や PR 作成など外部に波及する操作の前に必ずユーザーの承認を取る（`git push`, `gh pr create` はセットで確認）。
- `version:bump` が native バージョン（iOS / Android）にも波及する場合、差分に iOS `Info.plist` や Android `build.gradle` が含まれることがある。期待外の差分が出たら中断してユーザーに確認。
- ビルド・ストア申請・タグ付けはこのスキルの責務外（PR マージ後の別手順）。
- 既に open な `release/v<version>` → `master` PR がある場合、`create-pr` のガードに任せて新規作成しない。
