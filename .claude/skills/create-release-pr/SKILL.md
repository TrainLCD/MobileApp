---
name: create-release-pr
description: Cut a production release branch, bump the app version, run quality checks, and open a release pull request targeting master for TrainLCD MobileApp. Use when the user asks to create a production release PR, cut a release branch, or release a specific version (e.g., v10.4.2).
---

# create-release-pr

本番リリース用の PR を作成するスキル。リリース用ブックマークの作成から PR 作成までを一気通貫で実行する。PR 作成自体は `create-pr` スキルに委譲する。

## 入力

| 項目 | 必須 | 例 |
| ---- | ---- | ---- |
| `version` | 必須 | `10.4.2` または `v10.4.2`（先頭 `v` は任意、内部で剥がす） |

バージョンはセマンティックバージョニング（`MAJOR.MINOR.PATCH`）であること。満たさない場合は中断してユーザーに確認する。

## 前提条件

- カレントディレクトリがリポジトリルート（`jj workspace root`）。
- `gh` CLI 認証済み、`jj` と `npm` が使える。このリポジトリは jj / git コロケート構成だが、**VCS 操作は jj に統一する**。
- 作業コピー `@` に差分が無い（`jj status` が `The working copy has no changes.`）。残っている場合はユーザーに確認してから別ブックマークへ退避する。
- `dev` が `dev@origin` と同期済み。差分があれば `jj git fetch` の可否をユーザーに確認する。

## 手順

1. **バージョン正規化と検証**

   - 入力の先頭 `v` / `V` を取り除き、`MAJOR.MINOR.PATCH` 形式かを検証。
   - `jj bookmark list --all-remotes 'release/v<version>'` を実行し、同名のブックマーク（ローカル or origin）がすでに存在する場合は中断して、既存ブックマークでの進行可否をユーザーに確認する。

2. **dev から切り出し**

   ```bash
   jj git fetch
   jj new 'dev@origin'   # dev@origin の上に空の作業コピーを作る
   ```

   - ブックマーク `release/v<version>` は手順 5 のコミット後に作る。jj のブックマークは git のブランチと違って新しいコミットへ自動追従しないため、先に作っても意味が無い。
   - `dev` の head が CI 的に緑であることは呼び出し側で担保する前提（このスキルでは確認しない）。

3. **バージョンバンプ**

   ```bash
   npm run version:bump <version>
   ```

   - 変更されたファイル（`package.json`・ネイティブ側バージョン等）を `jj status` で確認し、期待どおりの差分であるかをユーザーに提示する。

4. **コード品質チェック**

   以下を順番に実行し、すべて緑であることを確認する。**本番リリース時は自動修正を一切許可しない**（静かに差分が混入するリスクを避けるため）。失敗したら中断してユーザーに原因を共有する。整形が必要な差分が残っている場合は、リリース用ブックマークを作り直す前に dev 側で修正・マージしておくこと。

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
   - push 前に、含まれるファイル・コミットメッセージ・ブックマーク名を要約し、ユーザーに承認を取る。
   - 承認後:

     ```bash
     jj status
     jj commit -m "v<version> をリリース"
     jj bookmark create 'release/v<version>' -r @-
     jj git push --bookmark 'release/v<version>'
     ```

   - **`jj status` の目視確認は省略しない**。jj は `@` の差分を丸ごとコミットするため git の `add` に相当する取捨選択の関門が無く、`version:bump` が波及した予期しないファイルもそのまま入る。想定外のファイルが並んでいたら確定せずユーザーに確認する。

6. **PR 作成（`create-pr` スキルへ委譲）**

   以下の入力で `create-pr` を呼び出す:

   | 項目 | 値 |
   | ---- | ---- |
   | `base` | `master` |
   | `head` | `release/v<version>` |
   | `title` | `v<version>🎉` |
   | `summary` | 省略（`create-pr` 側で `master@origin..release/v<version>@origin` のコミット件名から生成）。リリースノートを呼び出し側が持っている場合はそれを渡す |
   | `related_issue` | 省略 |
   | `skip_checks` | `false`（手順 4 で全 3 点緑のため ON で OK） |

   `create-pr` の内部ルールどおり、Assignee は `TinyKitten` が自動付与される。

7. **完了報告**

   - リリース用ブックマーク名、コミット ID、PR URL、`npm run version:bump` で変更されたファイル一覧、品質チェックの結果サマリを報告する。

## 注意事項

- **本番リリースは影響範囲が大きい**。push や PR 作成など外部に波及する操作の前に必ずユーザーの承認を取る（`jj git push`, `gh pr create` はセットで確認）。
- `version:bump` が native バージョン（iOS / Android）にも波及する場合、差分に iOS `Info.plist` や Android `build.gradle` が含まれることがある。期待外の差分が出たら中断してユーザーに確認。
- ビルド・ストア申請・タグ付けはこのスキルの責務外（PR マージ後の別手順）。
- 既に open な `release/v<version>` → `master` PR がある場合、`create-pr` のガードに任せて新規作成しない。
