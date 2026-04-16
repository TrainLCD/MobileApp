---
name: create-pr
description: Create a GitHub pull request for TrainLCD MobileApp that conforms to .github/pull_request_template.md, assigns @TinyKitten, and auto-checks the 変更の種類 boxes based on the commit/file diff. Use whenever the user asks to open a PR in this repo.
---

# create-pr

このリポジトリの PR 作成手順を一本化したスキル。`.github/pull_request_template.md` を厳守し、Assignee・変更の種類・テスト欄を自動で組み立てる。

## 入力（呼び出し元が指定）

すべて任意。未指定なら下の既定値・推論で埋める。推論結果に不安があるとき（例: 多数のコミットで方向性がバラバラ）はユーザーに確認してから進める。

| 項目 | 既定値 / 推論元 |
| ---- | ---- |
| `base` | リポジトリの既定ブランチ（`gh repo view --json defaultBranchRef -q .defaultBranchRef.name`） |
| `head` | カレントブランチ（`git rev-parse --abbrev-ref HEAD`） |
| `title` | 下の「タイトル推論ルール」参照 |
| `summary` | 空なら「概要」「変更内容」本文はテンプレのコメントのみ残す |
| `related_issue` | 空なら節のコメントのみ。コミット件名に `Closes #N` / `Fixes #N` / `Refs #N` があれば拾う |
| `skip_checks` | `false`（テスト 3 項目を ON）。`true` なら全 OFF |

### タイトル推論ルール

`origin/<base>..origin/<head>` のコミット件名を対象に、以下を順に試す:

1. **コミット 1 件のみ**: その件名をそのまま使う。
2. **コミット複数・共通プレフィックスあり**（例: 全て `fix: ...`）: 最新コミットの件名を使う。
3. **ブランチ名が `feature/` / `fix/` / `hotfix/` / `chore/` / `docs/` 等で始まる**: プレフィックスを取り除き、残りの `kebab-case` を日本語や自然文に整える。確信が持てないときは整形せずブランチ名のまま使ってよい。
4. **どれでも決まらない**: 最新コミット件名を採用し、「このタイトルで作成してよいか」をユーザーに確認する。

Hot fix の文脈（`head` が `hotfix/` で始まる、または件名に `Hotfix` を含む）では、タイトル先頭に `Hotfix: ` を付ける（CLAUDE.md ルール）。

コミット件名は Conventional Commits プレフィックス（`fix:` `feat:` など）が付いていても、このリポジトリの慣習（日本語の単文）に寄せて整形してよい。整形時は意味を変えないこと。

## 前提条件

- カレントディレクトリが `git rev-parse --show-toplevel` で解決できるリポジトリ内。
- `gh` CLI が認証済み。
- `head` ブランチが origin に push 済み。未 push の場合はユーザーに push の可否を確認する（勝手に push しない）。

## 手順

1. **head / base の整合性チェックと自動ブランチ切り出し**

   `base == head` になるケース（例: `dev` に居てデフォルト base も `dev`）は、そのまま進めると PR が作れない。以下のいずれかで救済する:

   - 作業中の変更（staged / unstaged / 直近の未 push コミット）がある場合、**新しいブランチを切ってそこに退避**してから続行する。
   - 何の変更も無い場合は「PR 対象の差分が無い」と報告して中断する。

   **ブランチ名の推論**（`feature/<slug>` 形式が既定。CLAUDE.md とメモのルール: プレフィックスは `feature/` であり `feat/` ではない）:

   | プレフィックス | 採用条件 |
   | ---- | ---- |
   | `fix/` | 変更内容や直近コミット件名にバグ修正・`fix`・`修正` を示唆する語がある |
   | `hotfix/` | 本番緊急修正（ユーザーが明示、または件名に `Hotfix`） |
   | `docs/` | 変更が `*.md` / `docs/**` / `README*` のみ |
   | `chore/` | 依存更新・ビルド設定など雑務のみ |
   | `feature/` | 上記いずれにも当たらない場合の既定 |

   slug は変更ファイル・コミット件名から短い英小文字 kebab-case を作る（例: `fix-image-cache-collision`）。確信が持てない場合は slug 候補を 1〜2 個出してユーザーに確認。

   切り出し手順:
   ```bash
   git switch -c <inferred-branch>
   # 未コミットなら:
   git add -p   # または指定パスで git add <files>
   git commit   # コミットメッセージは日本語単文（CLAUDE.md）
   git push -u origin <inferred-branch>
   ```
   - コミット前に `npx biome check --unsafe --fix ./src` を実行（メモのルール）。
   - 対話的ステージ（`git add -p`）を避けたい場合は、変更対象パスを明示して `git add` する。
   - push は新規ブランチなので安全だが、実行前にユーザーへ要約（ブランチ名・含めるファイル・コミットメッセージ案）を提示して承認を取る。

   以降の手順では推論後の head を使う。

2. **状態確認**
   - `git fetch origin <base> <head>` を実行。
   - `git log --oneline origin/<base>..origin/<head>` で差分があることを確認。無ければ中断して報告。
   - `gh pr list --base <base> --head <head> --state open --json number,url` で既存 open PR を確認。あれば新規作成せず既存 URL を返す。

3. **変更の種類を判定**

   `origin/<base>..origin/<head>` のコミット件名と変更ファイルを取得:
   ```bash
   git log --pretty=%s origin/<base>..origin/<head>
   git diff --name-only origin/<base>..origin/<head>
   ```

   各項目を独立に評価（複数該当可、大文字小文字無視・部分一致）:

   **コミット件名ベース**
   | 項目 | トリガ語句 |
   | ---- | ---- |
   | バグ修正 | `fix`, `Hotfix`, `バグ`, `修正`, `不具合` |
   | 新機能 | `feat`, `add`, `新機能`, `追加`, `導入`, `対応` |
   | リファクタリング | `refactor`, `リファクタ`, `整理`, `clean` |
   | ドキュメント | `docs`, `ドキュメント`, `README`, `changelog` |
   | CI/CD | `ci`, `cd`, `workflow`, `release`, `Bump version`, `canary release` |

   **変更ファイルパスベース**（コミット判定と OR）
   | 項目 | パターン |
   | ---- | ---- |
   | ドキュメント | 変更が `*.md` / `docs/**` / `README*` のみ |
   | CI/CD | `.github/workflows/**`, `.github/**/*.yml`, `fastlane/**`, `eas.json` のいずれかを含む |

   判定ロジック:
   - 少なくとも 1 つのトリガに当てはまれば `- [x]`、それ以外は `- [ ]`。
   - 全項目が OFF のときのみ `その他` を `- [x]` にする。他項目が ON のときは `その他` は必ず `- [ ]`。

4. **本文組み立て**

   `.github/pull_request_template.md` の節構成をそのまま使い、下の置換だけを行う。節の追加・削除は禁止（CLAUDE.md ルール）。

   - 「概要」節: `summary` があれば挿入。無ければテンプレのコメントだけ残す。
   - 「変更の種類」節: 手順 3 の結果で各 `- [ ]` / `- [x]` を決定。
   - 「変更内容」節: 必要なら `summary` をもう少し詳しく書く。呼び出し側指定が無ければコメントのみ。
   - 「テスト」節: `skip_checks` が真なら 3 項目すべて OFF、偽なら 3 項目すべて ON。
   - 「関連Issue」節: `related_issue` があれば `Closes #N` を書く。無ければコメントのみ。
   - 「スクリーンショット」節: 常にコメントのみ（UI 変更があれば呼び出し側が後から編集する前提）。

5. **PR 作成**

   ```bash
   gh pr create \
     --base "<base>" \
     --head "<head>" \
     --title "<title>" \
     --assignee TinyKitten \
     --body "$(cat <<'EOF'
   <本文>
   EOF
   )"
   ```

   - Assignee は常に `TinyKitten`（CLAUDE.md ルール）。
   - 作成後の URL と、ON にしたチェック項目・判定根拠（例: コミット `fix: ...` により「バグ修正」を ON）を報告する。

## 注意事項

- テンプレの節構成は改変しない。追加・削除はメンテナ承認が必要。
- `git push --no-verify` や force push はしない。push が必要ならユーザーに確認。
- 既存 open PR を上書きしない（重複作成禁止）。
- Hot fix の場合はタイトルに `Hotfix:` プレフィックスを付けるようユーザーに確認する（CLAUDE.md）。
