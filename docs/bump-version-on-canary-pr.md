# Bump Version on Canary PR

`canary` ブランチへのPRが開かれた際に、ビルド番号のみを自動インクリメントするversion-bump PRを作成するワークフロー。

## トリガー

- `pull_request` の `opened` イベント（`canary` ブランチ向け）
- 同一リポジトリからのPRのみ実行

## 動作

1. PRのヘッドブランチをチェックアウト
2. npm + Node.js 24 をセットアップ
3. `npm ci` で依存関係インストール
4. `npm run version:bump -- --no-version-increment` を実行
   - アプリのバージョン（`X.Y.Z`）は変更しない
   - iOS ビルド番号のみ+1
   - Android versionCode は`:app`を+2、`:wearable`を`:app`+1に更新
     （`:wearable`が`:app`+1を占有し1リリースで2つ消費するため。詳細は
     [android-build-workflows.md](./android-build-workflows.md#versioncode-ordering)）
5. `peter-evans/create-pull-request@v7` でversion-bump PRを作成
   - ブランチ: `auto-version-bump-<PR番号>`
   - ベースブランチ: PRのヘッドブランチ
   - ラベル: `automated`, `version-bump`
6. 作成されたPRをヘッドブランチにマージすることでビルド番号が更新される

## 関連ファイル

- `.github/workflows/bump_version_on_canary_pr.yml` — ワークフロー本体
- `.github/workflows/bump_version_on_release_pr.yml` — リリース向けの類似ワークフロー
- `scripts/bump-version.js` — バージョン更新スクリプト
