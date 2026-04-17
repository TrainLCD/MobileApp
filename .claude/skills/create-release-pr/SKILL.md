---
name: create-release-pr
description: Cut a production release branch, bump the app version, run quality checks, and open a release pull request targeting master for TrainLCD MobileApp. Use when the user asks to create a production release PR, cut a release branch, or release a specific version (e.g., v10.4.2).
---

# create-release-pr

本番リリース用の PR を作成するスキル。リリースブランチ作成から PR 作成までを一気通貫で実行する。PR 作成自体は `create-pr` スキルに委譲する。

## 入力

| 項目 | 必須 | 例 |
| ---- | ---- | ---- |
| `version` | 必須 | `10.4.2` または `v10.4.2`（先頭 `v` は任意、内部で剥がす） |

バージョンはセマンティックバージョニング（`MAJOR.MINOR.PATCH`）であること。満たさない場合は中断してユーザーに確認する。

## 前提条件

- カレントディレクトリがリポジトリルート。
- `gh` CLI 認証済み、`git` と `npm` が使える。
- 作業ツリーがクリーン（未コミット変更なし）。残っている場合はユーザーに確認してから退避する。
- `master` ブランチが origin と同期済み。差分があれば pull 可否をユーザーに確認する。

## 手順

1. **バージョン正規化と検証**

   - 入力の先頭 `v` / `V` を取り除き、`MAJOR.MINOR.PATCH` 形式かを検証。
   - 同名のブランチ（ローカル or origin）がすでに存在する場合は中断し、既存ブランチでの進行可否をユーザーに確認する。

2. **master から切り出し**

   ```bash
   git fetch origin master
   git switch master
   git pull --ff-only origin master
   git switch -c release/v<version>
   ```

   - `master` の head が CI 的に緑であることは呼び出し側で担保する前提（このスキルでは確認しない）。

3. **バージョンバンプ**

   ```bash
   npm run version:bump <version>
   ```

   - 変更されたファイル（`package.json`・ネイティブ側バージョン等）を `git status` で確認し、期待どおりの差分であるかをユーザーに提示する。

4. **コード品質チェック**

   以下を順番に実行し、すべて緑であることを確認する。**本番リリース時は自動修正を一切許可しない**（静かに差分が混入するリスクを避けるため）。失敗したら中断してユーザーに原因を共有する。整形が必要な差分が残っている場合は、リリースブランチを作り直す前に dev 側で修正・マージしておくこと。

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
     git status --short
     git add <version:bump と品質チェックで変更されたファイル>
     git commit -m "v<version> をリリース"
     git push -u origin release/v<version>
     ```
   - `git status --short` で実際の差分を目視確認してからステージすること。`version:bump` が予期しないファイル（ネイティブ側バージョン等）にも波及することがあるため、取りこぼしを避ける。

6. **PR 作成（`create-pr` スキルへ委譲）**

   以下の入力で `create-pr` を呼び出す:

   | 項目 | 値 |
   | ---- | ---- |
   | `base` | `master` |
   | `head` | `release/v<version>` |
   | `title` | `v<version>🎉` |
   | `summary` | 省略（`create-pr` 側で `origin/master..origin/release/v<version>` のコミット件名から生成）。リリースノートを呼び出し側が持っている場合はそれを渡す |
   | `related_issue` | 省略 |
   | `skip_checks` | `false`（手順 4 で全 3 点緑のため ON で OK） |

   `create-pr` の内部ルールどおり、Assignee は `TinyKitten` が自動付与される。

7. **完了報告**

   - リリースブランチ名、コミット SHA、PR URL、`npm run version:bump` で変更されたファイル一覧、品質チェックの結果サマリを報告する。

## 注意事項

- **本番リリースは影響範囲が大きい**。push や PR 作成など外部に波及する操作の前に必ずユーザーの承認を取る（`git push`, `gh pr create` はセットで確認）。
- `version:bump` が native バージョン（iOS / Android）にも波及する場合、差分に iOS `Info.plist` や Android `build.gradle` が含まれることがある。期待外の差分が出たら中断してユーザーに確認。
- ビルド・ストア申請・タグ付けはこのスキルの責務外（PR マージ後の別手順）。
- 既に open な `release/v<version>` → `master` PR がある場合、`create-pr` のガードに任せて新規作成しない。
