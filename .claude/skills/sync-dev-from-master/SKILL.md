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

- カレントディレクトリがリポジトリルート（`git rev-parse --show-toplevel`）。
- `gh` CLI 認証済み、`git` が使える。
- 作業ツリーがクリーン（`git status --porcelain` が空）。変更が残っている場合は中断し、ユーザーにクリーンアップを依頼する。
- リモートブランチ `origin/dev` / `origin/master` が存在する。

## 手順

1. **差分確認（無ければ中断）**

   ```bash
   git fetch origin --prune --tags   # 手順 3 が origin/chore/dev-from-master とも比較するので全 ref を取る
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
   # ローカル・リモートの存在確認（手順 1 の fetch 済みが前提）
   git show-ref --verify --quiet refs/heads/chore/dev-from-master && echo LOCAL_EXISTS
   # 終了コードは 0=存在 / 2=無し / それ以外=通信・認証エラー。2 以外の非 0 は「無い」とみなさず中断する
   git ls-remote --exit-code --heads origin chore/dev-from-master
   # 直近の dev 宛 PR の状態
   gh pr list --base dev --head chore/dev-from-master --state all --limit 1 --json number,state,url
   ```

   - **ケース A: どこにも存在しない** → そのまま手順 4 へ。
   - **ケース B: 存在し、直近 PR が `MERGED`** → 削除対象。ブランチ名・直近 PR 番号・PR URL をユーザーに提示し、実行可否を承認取り。承認後の手順は以下の順で行う:

     1. 現在ブランチを `git symbolic-ref --quiet --short HEAD` で確認。`chore/dev-from-master` に居るとローカル削除が失敗するため、その場合は `git switch dev`（または任意の安全な枝）に退避する。**退避の直前に `git status --porcelain` が空であることを再確認し、出力があれば切り替えずに中断する**（前提条件で確認済みでも、`npm install` などで差分が生じていることがある。未コミット変更は切り替え先へ持ち越され、push にも乗らないまま別の枝に残る）。
     2. **リモートに在る場合のみ** `git push origin --delete chore/dev-from-master` でリモートを削除する。ケース B はローカルにだけ残っている状態でも成立するので、無条件に実行すると push が失敗して 3. のローカル削除まで到達しない。存在判定は上の `git ls-remote --heads origin chore/dev-from-master` の出力で行い、**`ls-remote` 自体が非 0 で終わった場合（通信・権限エラー）は「無い」とみなさず中断する**。
     3. ローカルにも存在する場合は `git branch -D chore/dev-from-master` で削除。
   - **ケース C: 存在するが直近 PR が `MERGED` 以外（`OPEN` は手順 2 で弾かれる。残るのは `CLOSED` または PR 無し）**: 削除しないで中断してユーザーに判断を仰ぐ（未マージ作業の可能性）。
   - **ケース D: ケース B または C で、かつ枝に `master` / `dev` のどちらにも入っていない固有コミットが有る**: 下の出力が空でなければ削除せず中断しユーザーに確認する。

     ```bash
     # 存在する側をすべて調べる。両方在るなら両方（ローカルとリモートで先端が違いうる）
     git log --oneline origin/chore/dev-from-master --not origin/master origin/dev
     git log --oneline chore/dev-from-master --not origin/master origin/dev
     ```

     **ローカル枝が在るなら、リモート側が空でもローカル側を必ず確かめる。** 両方存在するとき先端が一致する保証は無く、リモートだけを見て進むと、未 push のコミットを載せたローカル枝を `git branch -D` で消してしまう。`git rev-parse chore/dev-from-master origin/chore/dev-from-master` で先端が一致しない場合も、差分の中身をユーザーに提示して判断を仰ぐ。

     どちらの出力も空（かつ先端が一致）なら「master / dev に完全に取り込まれた残骸」なので安全に削除できる。存在しない側の ref は解決できずエラーになるので実行しない（ケース A ではどちらも実行しない）。

4. **ブランチを origin/master から切り出して push**

   > **⚠ 実行前ゲート**: 下のブロックは origin に波及する push を含む。**fetch・SHA の確定・コミット件数の算出はゲートより前に済ませる**（手順 1 の fetch で取得済み。`MASTER_SHA=$(git rev-parse origin/master)`）。その `MASTER_SHA`・取り込まれるコミット件数・本文に入れる version をユーザーに提示し、**承認を得てから**実行する。

   ```bash
   git switch -c chore/dev-from-master "$MASTER_SHA"   # 承認した SHA を直接指定する
   test "$(git rev-parse HEAD)" = "$MASTER_SHA"        # 先端が承認済み SHA であることを確認
   git push -u origin chore/dev-from-master
   ```

   - **承認後に fetch し直さない。** `origin/master` を再取得すると、承認した SHA より後のコミットが入った状態で枝が作られる。ブランチ名ではなく記録した SHA から切り、push 前に先端を照合する。

   - 何もコミットは積まない（master 先端そのまま）。biome 等のフォーマッタも走らせない（新規コミット無し）。
   - 承認は上の実行前ゲートで取る（ここで二重に取り直さない）。
   - **例外**: この PR が版数ファイルで衝突する場合（`master` から特定 PR だけ cherry-pick したリリースの後に起きる。後述の「版数ファイルのコンフリクト解決」を参照）は、この枝に `origin/dev` をマージして解決コミットを 1 つだけ積む。それ以外は master 先端そのまま。

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
   - `<release_version>`: 入力 `release_version` があればそれ（先頭 `v` は剥がす）。未指定なら `git show origin/master:package.json | python3 -c "import json,sys;print(json.load(sys.stdin)['version'])"` の値。取得失敗時は「概要」節から `**v<release_version>**` の部分を丸ごと外す（偽情報を書かない）。
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

## 版数ファイルのコンフリクト解決（cherry-pick / hotfix リリース後）

通常の「dev から丸ごと」リリースでは `master` が `dev` の完全な祖先になるため、この同期 PR は衝突しない（手順 4 のとおり master 先端そのままで済む）。しかし **リリースブランチを `master` から切って特定 PR だけ cherry-pick したリリース**（`create-release-pr` に「この変更だけ」と指定したホットフィックス型など）では、`dev` を `master` に取り込んでいないため、`master` のリリース版数と `dev` の canary bump 版数が **ねじれたまま** 残り、この同期 PR が版数ファイルで衝突する。

衝突するのは版数ファイルのみで、アプリコードは衝突しない:

- `android/app/build.gradle`（`versionCode` / `versionName`）
- `app.config.ts`（`version` / `buildNumber` / `versionCode`）
- `ios/TrainLCD.xcodeproj/project.pbxproj`（`MARKETING_VERSION` / `CURRENT_PROJECT_VERSION`）

### 解決方針: semver はリリース版、ビルド番号は最大値

| 種別 | 採用する側 | 理由 |
| ---- | ---- | ---- |
| semver（`version` / `versionName` / `MARKETING_VERSION`） | `master`（リリース版数） | `dev` をリリース済みバージョンへ前進させる。過去 PR #6396 も semver 競合をリリース版で解決している |
| ビルド番号（`versionCode` / `CURRENT_PROJECT_VERSION` / `buildNumber`） | `max(dev, master)`（通常は `dev` 側が大きい） | ストアはビルド番号の単調増加を要求する。canary で既発行の番号より下げると次回 bump で衝突する |

### 解決手順

1. `chore/dev-from-master`（= master 先端）に居る状態で `origin/dev` をマージする（手順 4 の「コミットを積まない」原則の唯一の例外）:

   ```bash
   git status --porcelain       # 空でなければ切り替えず中断する（未コミット変更は切り替え先へ持ち越される）
   git switch chore/dev-from-master   # すでにこの枝に居るなら不要
   git merge --no-ff --no-commit origin/dev
   git status   # コンフリクトしているファイルを確認
   ```

2. 衝突した版数 3 ファイルを master 側（`--ours`）で確定してから、ビルド番号だけ `max(dev, master)` へ引き上げる。**下の `sed` は master=530/2743・dev=531/2744 だった場合の例なので、数値をそのまま使わない。** 先に両側の実値を読み、大きい方を採ってから置換する:

   ```bash
   for ref in origin/master origin/dev; do
     echo "$ref  versionCode=$(git show $ref:android/app/build.gradle | sed -nE 's/.*versionCode ([0-9]+).*/\1/p')" \
       "CURRENT_PROJECT_VERSION=$(git show $ref:ios/TrainLCD.xcodeproj/project.pbxproj | sed -nE 's/.*CURRENT_PROJECT_VERSION = ([0-9]+);.*/\1/p' | sort -u | tr '\n' ' ')"
   done
   ```

   読み取った値で `max(dev, master)` を決めてから:

   ```bash
   git diff --name-only --diff-filter=U   # 衝突しているファイルを確認（版数 3 ファイル以外が出たら中断）
   # 実際に衝突したファイルだけを対象にする（未衝突のパスに --ours を渡すとエラーになる）
   git diff -z --name-only --diff-filter=U | xargs -0 -r git checkout --ours --
   sed -i 's/versionCode 100000530/versionCode 100000531/g' android/app/build.gradle
   sed -i "s/buildNumber: '2743'/buildNumber: '2744'/g; s/versionCode: 100000530/versionCode: 100000531/g" app.config.ts
   sed -i 's/CURRENT_PROJECT_VERSION = 2743;/CURRENT_PROJECT_VERSION = 2744;/g' ios/TrainLCD.xcodeproj/project.pbxproj
   git add android/app/build.gradle app.config.ts ios/TrainLCD.xcodeproj/project.pbxproj
   git status   # コンフリクトが 1 件も残っていないことを確認する
   ```

   衝突するのは上の 3 ファイルのはずなので、`git diff --name-only --diff-filter=U` の出力がそれ以外を含んでいたら**そこで中断してユーザーに確認する**（アプリコードの衝突は想定外）。これらの版数ファイルは master↔dev で数値以外の差分が無い（`git diff origin/dev origin/master -- <path>` で確認できる）ため、`--ours` で master を採ってもコンテンツは失われない。

3. 差分を **版数 3 ファイル** と **それ以外** に分けて確認してから、マージコミットを作成して push する:

   ```bash
   # (a) 版数 3 ファイル: semver だけが動き、ビルド番号は据え置きなのが正
   git diff --cached origin/dev -- \
     android/app/build.gradle app.config.ts ios/TrainLCD.xcodeproj/project.pbxproj

   # (b) それ以外を含む全体: master にだけ在ったアプリコードが出る。これは同期すべき正当な差分
   git diff --stat --cached origin/dev
   ```

   **`--cached` を外さない。** `git merge --no-commit` の途中では `HEAD` がマージ前の master 先端のままなので、`git diff origin/dev HEAD` は解決結果ではなく古いコミット同士を比べてしまい、版数の解決が検証できない。

   - **(a) の「semver だけ」判定はこの 3 ファイルに限定する。** semver（例 10.9.0 -> 10.9.1）が上がり、`versionCode` / `CURRENT_PROJECT_VERSION` / `buildNumber` が `dev` 側の値のままであることを確認する。ここに想定外の差分があれば中断。
   - **(b) に「semver だけ」を要求しない。** cherry-pick / hotfix リリースでは master 側で直接入った修正が残っているのが正常であり、それを `dev` へ運ぶことがこの PR の目的。全体差分に semver 以外が出ること自体は正しい。ただし身に覚えの無い差分が混ざっていないかは目視し、内容をユーザーに提示して確認を取る。

   確認後:

   ```bash
   git commit -m "origin/dev をマージし版数競合を解決（semver=<release>、ビルド番号=<max>）"
   git push origin chore/dev-from-master
   ```

4. 以降は通常どおり merge commit でマージする（`finalize-release` が Ruleset 一時緩和つきで実行する）。マージ後は dev HEAD が 2 親の merge commit になり、`git fetch origin dev master` で remote-tracking を更新したうえで `git rev-list --count origin/dev..origin/master` が `0`（dev が master を完全包含）になることを検証する。**fetch を省くと、GitHub 上でマージ済みでもローカルの `origin/dev` がマージ前のままなので、成功した同期を失敗と誤判定する。**

**semver をリリース版数へ更新する判断とビルド番号の採用値は本番の版数に関わるため、自動で確定せずユーザーに確認する。**

## 注意事項

- **Squash merge 禁止**。これがこのスキルの存在理由の半分。実行時と完了報告で二重に明示する。
- コード変更が無いため `npx biome check --unsafe --fix ./src` は走らせない（メモのルールは「コミット前」に適用されるが当スキルは新規コミットを作らない）。
- `publish-release` 直後に呼ばれるのが典型だが、master が dev より進んでいるタイミングなら単独でも使える（hotfix を master に直接入れた後など）。
- PR テンプレの節構成は改変しない（CLAUDE.md ルール）。
- 既に open な dev<-master PR がある場合は新規作成せず既存 URL を返す（手順 2）。
