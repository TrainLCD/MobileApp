---
name: publish-release
description: Create a git tag on origin/master HEAD and publish a GitHub Release with auto-generated release notes for TrainLCD MobileApp. Use when the user asks to tag a release, publish a GitHub Release, or ship a version after the release PR has been merged to master (e.g., v10.4.2).
---

# publish-release

`master` ブランチ先端にタグを打って GitHub Release を即公開するスキル。`create-release-pr` でマージされたリリースPRの **後工程** として使う。リリースノートは GitHub の auto-generated release notes（`--generate-notes`）に丸投げする。

## 入力

| 項目 | 必須 | 例 |
| ---- | ---- | ---- |
| `version` | 必須 | `10.4.2` または `v10.4.2`（先頭 `v` は任意、内部で剥がす） |

バージョンはセマンティックバージョニング（`MAJOR.MINOR.PATCH`）必須。満たさない場合は中断してユーザーに確認する。

## 前提条件

- カレントディレクトリがリポジトリルート。
- `git` が使える。経路 A（後述）では `gh` CLI 認証済みであること。
- リリースPR（`release/v<version>` → `master`）は既に **master にマージ済み**。未マージなら中断し、ユーザーに確認する。
- 作業ツリーがクリーン（未コミット変更なし）。残っている場合は中断し、ユーザーにクリーンアップを依頼する。

## 実行経路

タグ作成と Release 公開には 2 つの経路がある。**手元で `gh` が使えるなら経路 A を既定とする。**

| 経路 | 使う場面 | 実体 |
| ---- | ---- | ---- |
| **A: ローカル実行** | 手元に認証済み `gh` があり、タグ push が通る | 手順 1〜6 をそのまま実行 |
| **B: ワークフロー実行** | タグ push や Release 作成が許可されていない実行環境（Claude Code のリモート実行環境など） | `Publish Release` ワークフローを dispatch |

経路 B は `.github/workflows/publish_release.yml` を `workflow_dispatch` で起動する。ワークフロー側が **手順 1・3・4・5 と同じ検証と操作** を実行するため、呼び出し側で個別に流す必要はない。

- 検証: `version` が `MAJOR.MINOR.PATCH` 形式か / 対象コミットの `package.json` の `version` が入力と一致するか / タグ `v<version>` が未作成か
- 操作: annotated tag（メッセージ `v<version>`）を対象 SHA に作成して push → `gh release create --generate-notes --latest`

起動方法（`workflow_dispatch` の定義は既定ブランチ `dev` 上にあるため `--ref` は `dev`。タグを打つ対象は `target` 入力で指定する）:

```bash
gh workflow run publish_release.yml --ref dev -f version=<version> -f target=master
```

`gh` が無い環境では GitHub MCP の `actions_run_trigger`（`method: run_workflow`, `workflow_id: publish_release.yml`, `ref: dev`, `inputs: {version, target}`）でも同じ dispatch ができる。

起動後は必ず実行結果を確認し、成功時のみ手順 6 の完了報告へ進む。失敗時はワークフローのログで中断理由（版数不一致・タグ重複等）を読み、原因をユーザーに報告する。

経路 B を選んだ場合も、**dispatch は外部に波及する操作**なので、起動前にタグ名・対象・version をユーザーに提示して承認を取る（手順 4 の承認ゲートと同じ扱い）。

## 手順

以下は **経路 A（ローカル実行）** の手順。**経路 B** を選んだ場合は手順 1〜3 で対象 SHA と版数の一致を確認したうえで dispatch し、手順 4・5 の代わりにワークフローの完了を待ってから手順 6 へ進む。

1. **バージョン正規化と検証**

   - 入力の先頭 `v` / `V` を取り除き、`MAJOR.MINOR.PATCH` 形式か検証。満たさなければ中断。
   - 同名のタグが既に存在するか確認。存在する場合は中断してユーザーに判断を仰ぐ（同じタグを別 SHA に付け直すのは事故のもとなので、このスキルでは勝手に上書きしない）。

     ```bash
     git fetch --tags origin
     git tag --list "v<version>"
     gh release view "v<version>" --json tagName 2>/dev/null || true
     ```

2. **master 最新化**

   ```bash
   git fetch origin master --tags
   ```

   - ローカル `master` は切り替えない（タグは `origin/master` の SHA に対して打つため checkout 不要）。
   - `origin/master` の HEAD SHA を記録する。

     ```bash
     git rev-parse origin/master
     ```

3. **package.json のバージョン照合**

   - `origin/master:package.json` の `version` フィールドを取得し、入力バージョンと一致するか確認する。

     ```bash
     git show origin/master:package.json | python3 -c "import json,sys;print(json.load(sys.stdin)['version'])"
     ```

   - 不一致の場合は中断し、ユーザーに原因確認（リリースPR がまだマージされていない／別バージョンがマージされた等）。

4. **タグ作成とプッシュ**

   - `origin/master` の HEAD に **annotated tag** を打つ。タグメッセージは `v<version>` 固定（過去運用と同一）。

     ```bash
     git tag -a "v<version>" -m "v<version>" <origin/master の SHA>
     git push origin "v<version>"
     ```

   - push 前に、タグ名・対象 SHA・master 側の最新コミット件名をユーザーに提示して承認を取る。

5. **GitHub Release 公開**

   - auto-generated release notes で即公開する。`--target` は `master` を明示。直前のタグを基準に差分が生成される。

     ```bash
     gh release create "v<version>" \
       --target master \
       --title "v<version>" \
       --generate-notes \
       --latest
     ```

   - `--latest` によって Latest 扱いになる。プレリリース用途（`vX.Y.Zb` 等の b サフィックス）でこのスキルを流用したい場合は、本スキルの責務外として中断し、ユーザーに確認する。

6. **完了報告**

   - タグ名、対象 SHA、Release URL、Release 本文（冒頭数行）を要約して報告する。
   - Release 本文は `gh release view v<version> --json url,body -q '.url,.body'` で取得可能。

## 注意事項

- **タグ push と Release 作成は外部に波及する操作**。順序は「タグ push → Release 作成」で固定。Release 作成に失敗した場合でもタグは既に公開済みなので、やり直しは `gh release create` のみで足りる。経路 B も同じ順序で動くため、ワークフローがタグ作成後に失敗した場合はタグだけが残る。再実行するとタグ重複ガードで中断するので、その場合は `gh release create` のみで補完する。
- 経路 B のワークフローはタグを打つだけで、**版数バンプは行わない**。`package.json` の版数が対象コミットで既に正しいことが前提であり、一致しなければワークフロー側で中断する。
- タグを削除・付け直す操作（`git push --delete` や `git tag -f`）はこのスキルの責務外。事故復旧が必要な場合はユーザーに判断を仰ぐ。
- `--generate-notes` は **直前のタグ** との差分で自動生成される。想定外のタグ（プレリリース含む）が直前に入っていると本文がブレるので、生成後の本文は必ず目視確認する。ブレていた場合は `gh release edit v<version> --notes-start-tag <基準タグ>` などで再生成をユーザーと相談する。
- リリースノートの人手調整が必要なら、`gh release edit v<version> --notes "..."` で後追い編集する方針（このスキルでは本文の手編集はしない）。
- `create-release-pr` の直後に呼ぶのが典型フロー。リリースPR 未マージの状態で呼ばれた場合は、前述のガードで中断する。
