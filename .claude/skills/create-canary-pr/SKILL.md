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
| `labels` | 未指定（付与しない） |

## バージョン bump の取り扱い

canary リリースでは semver は据え置きで iOS ビルド番号 / Android `versionCode` のみを上げる。`dev` は protected で直接 push できないため、bump 自体は `.github/workflows/bump_version_on_canary_pr.yml` に任せる。

PR が open された瞬間に `pull_request: opened` トリガでこの workflow が走り、`auto-version-bump-<canary_pr_number> → dev` の bump PR を自動生成する。スキル側で追加でラベルを付けたり `workflow_dispatch` を叩いたりする必要はない（過去にラベル `skip-version-bump` を付与して別途 `workflow_dispatch` を叩く実装にしていた時期があるが、両者を相殺しているだけだったので撤去した）。

完了報告では「`auto-version-bump-<canary_pr_number>` が間もなく自動で作成される。それを `dev` にマージすると canary PR 側にもビルド番号差分が反映される」旨を案内する。

## リリース特有の注意

- タイトルは過去運用（PR #5811〜 #5826）にならい常に `canary` 固定。ユーザーが別タイトルを希望した場合は確認する。
- `dev` / `canary` 両ブランチとも origin 前提。ローカル `dev` が未 push ならユーザーに push 可否を確認（`create-pr` 側でも同じガードあり）。
- 変更の種類の自動判定・Assignee・テンプレ節構成の遵守は `create-pr` の手順に従う。このスキルで独自に本文を組み立て直さない。
- 既に open な dev→canary PR がある場合は新規作成せず、既存 URL を再利用する（`create-pr` 側のガードに任せる）。既存 PR にはすでに `pull_request: opened` 起点で bump PR が作られているはずなので、`gh pr list --head "auto-version-bump-<canary_pr_number>" --base dev --state all --json number,url,state` で branch 名一致で確認する（`--search` だとタイトル / 本文の曖昧一致になり別 PR を拾う可能性があるため `--head` / `--base` を使う）。マッチが 0 件のときに限り `gh workflow run bump_version_on_canary_pr.yml -f pr_number=<canary_pr_number> -f head_ref=dev` で手動補填する。マッチがあれば結果（PR URL と state）をそのままユーザーに報告するだけで良い。
