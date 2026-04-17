---
name: create-canary-pr
description: Cut a dev→canary release pull request for TrainLCD MobileApp. This is a thin preset over create-pr with release-specific defaults. Use when the user asks to open a canary release PR, dev→canary PR, or similar phrasing.
---

# create-canary-pr

`dev` から `canary` へのリリース PR を作るためのプリセット。PR 作成ロジック本体は **`create-pr`** スキルに委譲する。ここではリリース固有の既定値だけを定義する。

## 委譲先

`create-pr` スキルを以下の入力で呼び出す:

| 項目 | 値 |
| ---- | ---- |
| `base` | `canary` |
| `head` | `dev` |
| `title` | `canary` |
| `summary` | 省略（テンプレのコメントのみ） |
| `related_issue` | 省略 |
| `skip_checks` | `false`（テスト 3 項目は全て ON） |

## リリース特有の注意

- タイトルは過去運用（PR #5811〜 #5826）にならい常に `canary` 固定。ユーザーが別タイトルを希望した場合は確認する。
- `dev` / `canary` 両ブランチとも origin 前提。ローカル `dev` が未 push ならユーザーに push 可否を確認（`create-pr` 側でも同じガードあり）。
- 変更の種類の自動判定・Assignee・テンプレ節構成の遵守は `create-pr` の手順に従う。このスキルで独自に本文を組み立て直さない。
- 既に open な dev→canary PR がある場合は新規作成せず、既存 URL を返す（`create-pr` 側のガードに任せる）。
