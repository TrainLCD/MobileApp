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
| `head` | `@` から辿れる直近のブックマーク（`jj log -r 'heads(::@ & bookmarks())' --no-graph -T 'local_bookmarks'`） |
| `title` | 下の「タイトル推論ルール」参照 |
| `summary` | 空なら「概要」「変更内容」本文はテンプレのコメントのみ残す |
| `related_issue` | **ユーザー入力を最優先**。指定が `#N`（数値のみ）なら `Closes #N`、`Closes #N` / `Fixes #N` / `Refs #N` 形式ならその接頭語を保って出力。`related_issue` が空のときに限り、コミット件名から `Closes #N` / `Fixes #N` / `Refs #N` を抽出（接頭語を維持。`#N` 単体表記なら `Closes` を補う）。両方とも見つからなければ節のコメントのみ |
| `skip_checks` | `false`（PR本文「テスト」節のチェック欄 3 項目を ON）。`true` なら全 OFF。**本文表示のみを制御するフラグで、`npm run lint` / `npm test` / `npm run typecheck` の実際の実行は保証しない**。**手順 3 で定義する「コード本体パス」に変更が無い（=テストを実行する意味が無い）ケースでは、`skip_checks` の値に関わらず 3 項目すべて OFF にする** |
| `labels` | 文字列配列、または未指定。未指定なら付与しない。指定した場合は `gh pr create --label <name>` でアトミックに付与する（作成後に `gh pr edit --add-label` すると `pull_request: opened` トリガのワークフローに間に合わないため、必ず `gh pr create` 時に渡す） |
| `screenshots` | ローカル画像パスの配列、または未指定。**未指定でも「スクリーンショット」節は空欄にせず、画像が無い理由を必ず明記する**（手順 5 参照）。各要素は `<ローカルパス>` または `<ローカルパス>\|<デバイス名>\|<キャプション>`（`\|` 区切り、後ろ 2 つは任意。例: `~/shots/home.png\|iPhone 15 Pro\|変更後のホーム画面`）。手順 4 で資材ブランチにアップロードし、本文に埋め込む |

### タイトル推論ルール

`<base>@origin..<head>@origin` のコミット件名を対象に、以下を順に試す:

1. **コミット 1 件のみ**: その件名をそのまま使う。
2. **コミット複数・共通プレフィックスあり**（例: 全て `fix: ...`）: 最新コミットの件名を使う。
3. **ブックマーク名が `feature/` / `fix/` / `hotfix/` / `chore/` / `docs/` 等で始まる**: プレフィックスを取り除き、残りの `kebab-case` を日本語や自然文に整える。確信が持てないときは整形せずブックマーク名のまま使ってよい。
4. **どれでも決まらない**: 最新コミット件名を採用し、「このタイトルで作成してよいか」をユーザーに確認する。

Hot fix の文脈（`head` が `hotfix/` で始まる、または件名に `Hotfix` を含む）では、タイトル先頭に `Hotfix:` を付ける（CLAUDE.md ルール）。

コミット件名は Conventional Commits プレフィックス（`fix:` `feat:` など）が付いていても、このリポジトリの慣習（日本語の単文）に寄せて整形してよい。整形時は意味を変えないこと。

## 前提条件

- カレントディレクトリが `jj workspace root` で解決できるリポジトリ内。
- `jj` と `gh` CLI が使える（`gh` は認証済み）。このリポジトリは jj / git コロケート構成だが、**VCS 操作は jj に統一する**。直接叩いてよい git コマンドは annotated tag の作成・push（`git tag -a` / `git push origin <tag>`）だけで、それは `publish-release` / `finalize-release` の責務。**このスキルに tag 操作は無いので、git コマンドは一切使わない**（AGENTS.md「Version Control (Jujutsu)」）。
- `head` ブックマークが origin に push 済み。未 push の場合はユーザーに push の可否を確認する（勝手に push しない）。
- `screenshots` を使う場合のみ: `node`（このリポジトリは Node 24.x 前提）が使え、`gh` の認証トークンに当該リポジトリへの `contents:write` 権限があること。画像アップロードは `gh api` の Contents API 経由で行い、ローカルの作業コピーや jj の状態には一切触れない。

## 手順

1. **head / base の整合性チェックと自動ブックマーク切り出し**

   `base == head` になるケース（例: `dev` に居てデフォルト base も `dev`）は、そのまま進めると PR が作れない。以下のいずれかで救済する:

   - 作業コピー `@` に差分がある、または `<base>@origin` より先に未 push のコミットがある場合、**新しいブックマークを切ってそこに退避**してから続行する。
   - 何の変更も無い場合は「PR 対象の差分が無い」と報告して中断する。

   **ブックマーク名の推論**（`feature/<slug>` 形式が既定。CLAUDE.md とメモのルール: プレフィックスは `feature/` であり `feat/` ではない）:

   | プレフィックス | 採用条件 |
   | ---- | ---- |
   | `fix/` | 変更内容や直近コミット件名にバグ修正・`fix`・`修正` を示唆する語がある |
   | `hotfix/` | 本番緊急修正（ユーザーが明示、または件名に `Hotfix`） |
   | `docs/` | 変更が `*.md` / `docs/**` / `README*` のみ |
   | `chore/` | 依存更新・ビルド設定など雑務のみ |
   | `feature/` | 上記いずれにも当たらない場合の既定 |

   slug は変更ファイル・コミット件名から短い英小文字 kebab-case を作る（例: `fix-image-cache-collision`）。確信が持てない場合は slug 候補を 1〜2 個出してユーザーに確認。

   切り出し手順:

   > **⚠ 実行前ゲート**: 下のブロックは origin に波及する push を含む。ブックマーク名・`jj status` で確認した含めるファイル・コミットメッセージ案の 3 点をユーザーに提示し、**承認を得てから**実行する。

   ```bash
   jj status                                      # @ に入っている差分を必ず目視確認する
   jj commit -m "<日本語単文>"                     # @ を確定し、その上に新しい空の @ ができる
   jj bookmark create <inferred-bookmark> -r @-   # 直前に確定したコミットに付ける
   jj git push --bookmark <inferred-bookmark>     # 新規ブックマークは自動で追跡される
   ```

   - **`jj status` の目視確認は省略しない**。jj は `.gitignore` されていない未追跡ファイルも自動でスナップショットするため、git の `add` に相当する取捨選択の関門が無い。意図しないファイルが混ざっていたら `.gitignore` に追加するか `jj file untrack <path>` してから確定する。
   - 一部のパスだけ確定したい場合は `jj commit <path>... -m "<日本語単文>"`。選ばなかった差分は新しい `@` に残る。
   - コミット前に `npx biome check --unsafe --fix ./src` を実行（メモのルール）。
   - push は新規ブックマークなので安全だが、承認は上の実行前ゲートで取る（ここで二重に取り直さない）。

   以降の手順では推論後の head を使う。

2. **状態確認とモード決定（新規作成 / 更新）**
   - `jj git fetch` を実行。
   - `jj log -r '<base>@origin..<head>@origin' --no-graph -T 'commit_id.short() ++ " " ++ description.first_line() ++ "\n"'` で差分があることを確認。出力が空なら中断して報告。
   - `gh pr list --base <base> --head <head> --state open --json number,url,body` で既存 open PR を確認。
     - **存在しない場合**: 新規作成モード。以降、手順 6 で `gh pr create`。
     - **存在する場合**: 更新モード。AGENTS.md の「Keep PR metadata in sync with the bookmark state」に従い、既存本文を最新差分で再生成する。以降、手順 6 で `gh pr edit`。タイトルは既存を**原則尊重**（ユーザー推論より優先）。ただし手順 6 の整合性チェックで主題が大きくズレていると判断した場合のみ更新案を提示する。

3. **変更の種類を判定**

   `<base>@origin..<head>@origin` のコミット件名と変更ファイルを取得:

   ```bash
   jj log -r '<base>@origin..<head>@origin' --no-graph -T 'description.first_line() ++ "\n"'
   jj diff --name-only --from '<base>@origin' --to '<head>@origin'
   ```

   **大原則: 判定はアプリの挙動に対する変更かどうかで決める**。下の「コード本体パス」が一切変わっていない場合、「バグ修正」「新機能」「リファクタリング」は OFF（コミット件名に `fix` / `feat` / `追加` 等の語があっても）。スキル・設定・ドキュメントのメタ変更を「新機能」と誤分類しないための安全弁。

   この大原則のもとで、各項目を独立に評価（複数該当可、大文字小文字無視・部分一致）。

   **コード本体パス**（バグ修正 / 新機能 / リファクタリングのゲート、および「テスト」節 ON/OFF 判定にも使う）

   - `src/**`
   - `android/**`
   - `ios/**`
   - `assets/**`

   **コード本体変更ありの場合 — コミット件名ベース**

   | 項目 | トリガ語句 |
   | ---- | ---- |
   | バグ修正 | `fix`, `Hotfix`, `バグ`, `修正`, `不具合` |
   | 新機能 | `feat`, `add`, `新機能`, `追加`, `導入`, `対応` |
   | リファクタリング | `refactor`, `リファクタ`, `整理`, `clean` |

   **変更ファイルパスベース**（アプリ本体変更の有無に関わらず評価）

   | 項目 | パターン |
   | ---- | ---- |
   | ドキュメント | 変更が `*.md` / `docs/**` / `README*` / `.claude/**` / `AGENTS.md` / `CLAUDE.md` のみ、またはそれらを主体とする |
   | CI/CD | `.github/workflows/**`, `.github/**/*.yml`, `fastlane/**`, `eas.json` のいずれかを含む |

   **コミット件名ベース（ドキュメント・CI/CD）**

   | 項目 | トリガ語句 |
   | ---- | ---- |
   | ドキュメント | `docs`, `ドキュメント`, `README`, `changelog` |
   | CI/CD | `ci`, `cd`, `workflow`, `release`, `Bump version`, `canary release` |

   判定ロジック:
   - 上の「大原則」のゲートをまず適用。コード本体パスに変更が無ければバグ修正・新機能・リファクタリングは強制 OFF。
   - 残りの項目は、コミット件名またはファイルパスのトリガに 1 つでも当てはまれば `- [x]`、それ以外は `- [ ]`。
   - `.claude/` や `.gitignore` など、リポジトリ運用のためのメタ変更のみの場合は基本的に「ドキュメント」を ON にする（アプリ挙動には影響しないため）。
   - 全項目が OFF のときのみ `その他` を `- [x]` にする。他項目が ON のときは `その他` は必ず `- [ ]`。

4. **スクリーンショットのアップロード**（`screenshots` 指定時のみ）

   `screenshots` が空ならこの手順を丸ごとスキップする（スクリーンショット節は従来どおりテンプレのコメントのみ）。

   **前提となる制約**: GitHub の PR 本文に画像を出すには公開 URL が必要で、Web UI のドラッグ&ドロップ以外に `user-images.githubusercontent.com` へ直接アップロードする API は存在しない。data URI は camo プロキシに落とされて表示されない。そこで **画像専用の孤立ブランチ `assets/pr-screenshots` に Contents API で直接コミットし、その raw URL を本文に埋め込む**。このリポジトリは public なので raw URL はそのままレンダリングされる。

   この資材ブランチを使う理由:

   - アプリのコードを一切含まない root commit 起点の孤立ブランチなので、**PR の diff に画像が混ざらず** `dev` の履歴も肥大化しない。
   - head ブックマークを削除しても画像 URL が切れない。
   - Contents API 経由なので**ローカルの作業コピー・jj の状態・`.git` に一切触れない**（git コマンドも不要）。

   git-flow の命名規則（`feature/*` / `fix/*` 等）は作業ブックマーク向けのルールなので、この資材ブランチは対象外。**`dev` / `master` には絶対にマージしない**。

   1. **入力の正規化と検証**

      対応拡張子は `.png` / `.jpg` / `.jpeg` / `.gif` / `.webp` のみ。**動画（`.mp4` / `.mov` 等）は raw URL ではプレイヤーにならない**ので受け付けず、「PR 画面に直接ドラッグ&ドロップしてください」と案内してその項目だけ除外する。

      ```bash
      for f in "${SCREENSHOTS[@]}"; do
        [ -f "$f" ] || { echo "見つかりません: $f"; exit 1; }
        printf '%s\t%s\n' "$(stat -f%z "$f" 2>/dev/null || stat -c%s "$f")" "$f"
      done
      ```

      パスは配列要素として引用符付きで渡すため `~` が展開されない。受け取った時点で絶対パスに正規化しておく。

      1MB（1048576 バイト）超は Contents API の推奨上限を超えるので、縮小か JPEG 変換を提案してユーザーの判断を仰ぐ（macOS なら `sips -Z 1080 <in> --out <out>`）。10MB 超はそのまま拒否する。

   2. **実行前ゲート**

      > **⚠ 実行前ゲート**: 以降は origin への書き込みを伴う。「どのファイルを・リポジトリ内のどのパスへ・どのブランチに上げるか」「資材ブランチを新規作成するか否か」をユーザーに提示し、**承認を得てから**実行する。

   3. **資材ブランチの用意**（初回のみ）

      ```bash
      OWNER_REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
      ASSET_BRANCH="assets/pr-screenshots"

      if ! gh api "repos/$OWNER_REPO/branches/$ASSET_BRANCH" >/dev/null 2>&1; then
        # 空ツリー（全 Git リポジトリに存在する固定 SHA）を指す親無しコミット = root commit
        ROOT_COMMIT="$(gh api -X POST "repos/$OWNER_REPO/git/commits" \
          -f message='PRスクリーンショット置き場を初期化' \
          -f tree=4b825dc642cb6eb9a060e54bf8d69288fbee4904 \
          -q .sha)"
        gh api -X POST "repos/$OWNER_REPO/git/refs" \
          -f ref="refs/heads/$ASSET_BRANCH" -f sha="$ROOT_COMMIT" >/dev/null
      fi
      ```

      `parents` を省略すると root commit になる。既にブランチがあれば何もしない。ブランチ保護 / ruleset で作成や書き込みが弾かれた場合は**握りつぶさずユーザーに報告**し、手貼り（PR 画面へドラッグ&ドロップ）にフォールバックする。

   4. **アップロード**

      保存先は `<REF_SLUG>/<連番>-<安全化したファイル名>`。`REF_SLUG` は head ブックマーク名に手順 6 と同じスラッグ化規則（`A-Za-z0-9._-` 以外を `_`）を適用したもの。PR 番号は新規作成時点ではまだ存在しないので使わない。

      ペイロードは **必ず JSON ファイル経由**で渡す。base64 文字列をコマンドライン引数に直接置くと Linux の `MAX_ARG_STRLEN`（1 引数 128KB）を超えて `Argument list too long` になる。JSON 組み立てとバイナリの base64 化は Node で行う（`jq` への依存を増やさない）。

      ```bash
      (
        WORK="$(mktemp -d)"
        trap 'rm -rf "$WORK"' EXIT INT TERM

        i=0
        for entry in "${SCREENSHOTS[@]}"; do
          i=$((i + 1))
          SRC="${entry%%|*}"
          NAME="$(printf '%s' "$(basename "$SRC")" | tr -c 'A-Za-z0-9._-' '_' | sed -E 's/_+/_/g')"
          DEST="$REF_SLUG/$(printf '%02d' "$i")-$NAME"

          # 同じパスが既にあれば上書きに blob sha が要る（再実行時）
          SHA="$(gh api "repos/$OWNER_REPO/contents/$DEST?ref=$ASSET_BRANCH" -q .sha 2>/dev/null || true)"

          node -e '
            const fs = require("fs");
            const [src, branch, message, sha] = process.argv.slice(1);
            const body = { message, branch, content: fs.readFileSync(src).toString("base64") };
            if (sha) body.sha = sha;
            process.stdout.write(JSON.stringify(body));
          ' "$SRC" "$ASSET_BRANCH" "PRスクリーンショットを追加: $DEST" "$SHA" > "$WORK/payload.json"

          gh api -X PUT "repos/$OWNER_REPO/contents/$DEST" \
            --input "$WORK/payload.json" -q '.content.download_url'
        done
      )
      ```

      - `gh` の成否に関わらず一時ファイルが消えるよう、ループ全体をサブシェルに包んで `trap` を張り、**Bash tool の 1 呼び出し内で完結させる**（手順 6 の本文ファイルと同じ方針）。
      - URL は自分で組み立てず、レスポンスの `.content.download_url` をそのまま使う（ブランチ名の `/` などのエスケープを間違えないため）。得られる URL は `https://raw.githubusercontent.com/<owner>/<repo>/<asset-branch>/<path>` 形式。
      - 出力された URL 行と入力の対応（デバイス名・キャプション）を保持して次のステップへ渡す。

   5. **本文用マークダウンの生成**

      ```markdown
      <!-- create-pr:screenshots:start -->

      ### iPhone 15 Pro

      <img src="https://raw.githubusercontent.com/TrainLCD/MobileApp/assets/pr-screenshots/feature_foo/01-home.png" width="320" alt="変更後のホーム画面" />

      変更後のホーム画面

      <!-- create-pr:screenshots:end -->
      ```

      - **マーカーコメントで必ず囲む**。更新モードで自動生成分だけを差し替え、人間が手貼りした画像や散文を壊さないための境界になる。
      - デバイス名がある画像は `### <デバイス名>` の見出しでグルーピングする（テンプレのコメントが端末名の併記を求めているため）。デバイス名が無いものは見出しを付けずに並べる。
      - 幅は `<img width="320">` で指定する。縦長のスクリーンショットが原寸で並ぶと本文が読めなくなるため。**AGENTS.md の MD033（inline HTML 禁止）はリポジトリ内 Markdown 向けのルールで、PR 本文には適用されない**。
      - キャプションがあれば `alt` に入れ、画像の直下にも 1 行で添える。

5. **本文組み立て**

   `.github/pull_request_template.md` の節構成をそのまま使い、下の置換だけを行う。節の追加・削除は禁止（CLAUDE.md ルール）。

   節は見出し（`## 概要` / `## 変更の種類` / `## 変更内容` / `## テスト` / `## 関連Issue` / `## スクリーンショット（任意）`）で区切られる。各節の内容を下のルールで決める。

   **新規作成モード**
   - 「概要」節: `summary` があれば挿入。無ければテンプレのコメントだけ残す。
   - 「変更の種類」節: 手順 3 の結果で各 `- [ ]` / `- [x]` を決定。
   - 「変更内容」節: コミット件名と変更ファイルから短い箇条書きを生成。`summary` があればそれを優先。
   - 「テスト」節:
     - **判定基準: 手順 3 の「コード本体パス」（`src/**` ほか）に変更が無い場合は `npm run lint` / `npm test` / `npm run typecheck` を実行する意味が無いとみなし、3 項目すべて OFF**（`skip_checks` より優先）。本文末尾に「省略: コード変更なし」等の短い注記を残す。
     - 上記に該当しない場合は `skip_checks` が真なら 3 項目すべて OFF、偽なら 3 項目すべて ON。テキストはテンプレのまま（`npm run lint` / `npm test` / `npm run typecheck`）。
   - 「関連Issue」節: `related_issue` が指定されていればユーザー入力を最優先で出力（`#N` のみなら `Closes #N`、`Closes/Fixes/Refs #N` 形式なら接頭語を維持）。空のときに限りコミット件名から `Closes/Fixes/Refs #N` を抽出。どちらも無ければコメントのみ。
   - 「スクリーンショット」節: テンプレのコメントを残したうえで、下の 3 分岐でマーカー付きブロックを追記する。**この節を空欄（テンプレのコメントのみ）のまま提出しない**。レビュワーは「画像を貼り忘れたのか、そもそも画面が変わらないのか」を本文から判断できる必要がある。

     | 状況 | 出力内容 |
     | ---- | ---- |
     | `screenshots` 指定あり | 手順 4-5 の画像ブロックをそのまま挿入する |
     | `screenshots` 未指定 かつ **UI 影響パスに変更が無い** | **画像が無い理由を 1 行で明記する**。書式は `UI 変更なし: <根拠>`。例: 「UI 変更なし: `.claude/**` のみの変更で、アプリの画面には影響しません」「UI 変更なし: `src/utils/**` のロジック変更のみで、画面表示に変化はありません」 |
     | `screenshots` 未指定 だが **UI 影響パスに変更がある** | 画面差分が出る可能性が高い。スクリーンショットを撮って `screenshots` に渡すか、撮れない理由を明記するかを**ユーザーに確認する**。撮れない場合はその理由を明記する。例: 「未添付: ネイティブビルドが必要で本環境では撮影できないため」 |

     **UI 影響パス**（手順 3 の「コード本体パス」より狭い。画面に見える変化が出うる範囲）:

     - `src/components/**`
     - `src/screens/**`
     - `assets/**`
     - `src/translation.ts`（表示文言）

     パス一覧はあくまで機械的なゲートなので、最終判断は差分の中身を見て行う（例: `src/hooks/**` の変更でも表示ロジックを変えているなら UI 変更として扱う）。理由行も手順 4-5 と同じマーカー（`<!-- create-pr:screenshots:start -->` 〜 `<!-- create-pr:screenshots:end -->`）で囲み、更新モードで差し替え可能にしておく。

   **更新モード**（既存 PR の本文を再生成）

   既存本文を節ごとに分割し、以下のルールで部分的に書き換える。人間が書き込んだ散文は壊さない。

   | 節 | 更新方針 |
   | ---- | ---- |
   | 概要 | 既存内容を尊重。空欄（テンプレのコメントのみ）なら新規作成モードと同じ生成を試みる。 |
   | 変更の種類 | **常に手順 3 の結果で上書き**（機械的判定）。 |
   | 変更内容 | 冒頭の箇条書きブロック（`-` で始まる連続行）を最新差分で再生成。その下に人間が書いた散文があれば残す。 |
   | テスト | **手順 5 の本文組み立てと同じ判定順を適用**（まずコード本体パス未変更なら 3 項目を強制 OFF。該当しない場合のみ `skip_checks` で ON/OFF）。 |
   | 関連Issue | 既存内容を尊重。コミット件名に `Closes/Fixes/Refs #N` があり、かつ既存本文中に同じ Issue 番号 `#N` を指す表現が存在しない場合のみ追記（重複は作らない。比較時は `Closes` / `closes` / `Fixes` / `fixes` / `Refs` / `refs` を同一視し、空白・記号差は無視して `#N` 単位で照合）。 |
   | スクリーンショット | `<!-- create-pr:screenshots:start -->` 〜 `<!-- create-pr:screenshots:end -->` の**マーカー内だけ**を再生成する（`screenshots` 指定時は画像ブロック、未指定時は上の理由行）。マーカーが無ければ節の末尾に新規追加。**マーカー外の既存内容（人間が手貼りした画像・散文）は常に温存する**。ただし**マーカー外に人間が貼った画像が既にある場合は理由行を書かない**（「UI 変更なし」と実際の画像が矛盾するため）。 |

   差し替え後の本文と既存本文の差分をユーザーに提示し、承認を得てから手順 6 へ進む。自動上書き節で人間の手入れらしき痕跡（テンプレのコメント以外の文章）がある場合は、どう扱うかをユーザーに確認する。

6. **PR 作成 / 更新**

   本文は **必ず一時ファイル経由で渡す**（`gh pr create --body-file` / `gh pr edit --body-file`）。理由: `--body "$(cat <<'EOF' ... EOF)"` のようにヒアドキュメントをシェル経由で渡すと、エディタ側の癖や Claude Code 側の生成で本文中のバッククォートが `\`` のように誤って escape されてしまい、PR 画面でコードスパン／フェンスがレンダリングされない事故が起きる（実例: PR #5857 の初稿で Markdown が崩れた）。`--body-file` ならシェルの引用符を一切介さないので構造的に起きない。

   実装手順:

   1. Write ツールで本文を一時ファイルに書き出す（例: `/tmp/pr-body-<slug>.md`）。ファイル名に使う ref（ブックマーク名・PR 番号など）は **ファイル名として安全な集合（`A-Za-z0-9._-`）にスラッグ化** する（手順 4 の `REF_SLUG` と同じ規則）。具体的には:
      - `/`・改行・制御文字・空白・非 ASCII などを `_` に置換
      - 連続した `_` は 1 つに畳み、先頭・末尾の `_` は除去
      - 必要なら長さを 100〜200 文字程度に切り詰める

      生のブックマーク名を直結するとサブディレクトリ解釈や制御文字混入で Write／削除が失敗する。バッククォートは **素のまま** 書く。escape しない。
   2. 下の `gh` コマンドをサブシェル内で `trap` と一緒に実行する。`gh` の成功・失敗に関わらず `EXIT` / `INT` / `TERM` のどれでも一時ファイルを確実に削除されるようにする（`&&` で `rm` を繋ぐだけだと失敗時に `/tmp` にゴミが残る）。
   3. `gh` 呼び出しと `rm`（を含む `trap`）は Bash tool の 1 呼び出し内で完結させる。別呼び出しで後片付けすると、前段の呼び出しがエラー／中断で終わった場合にクリーンアップが実行されない。

   **新規作成モード**

   ```bash
   # ref 名をファイル名として安全な集合（A-Za-z0-9._-）にスラッグ化
   REF_SLUG="$(printf '%s' '<head>' \
     | tr -d '\r\n' \
     | tr -c 'A-Za-z0-9._-' '_' \
     | sed -E 's/_+/_/g; s/^_+//; s/_+$//' \
     | cut -c1-100)"
   REF_SLUG="${REF_SLUG:-pr}"
   BODY_FILE="/tmp/pr-body-${REF_SLUG}.md"
   (
     trap 'rm -f "$BODY_FILE"' EXIT INT TERM
     gh pr create \
       --base "<base>" \
       --head "<head>" \
       --title "<title>" \
       --assignee TinyKitten \
       [--label "<label1>" --label "<label2>" ...] \
       --body-file "$BODY_FILE"
   )
   ```

   - Assignee は常に `TinyKitten`（CLAUDE.md ルール）。
   - `labels` 入力があれば、その要素数だけ `--label` を繰り返して渡す。未指定なら `--label` 自体を書かない。
   - 作成後の URL と、ON にしたチェック項目・判定根拠（例: コミット `fix: ...` により「バグ修正」を ON）、付与したラベルがあればその名前を報告する。

   **更新モード**

   ```bash
   BODY_FILE="/tmp/pr-body-${pr_number}.md"
   (
     trap 'rm -f "$BODY_FILE"' EXIT INT TERM
     gh pr edit <pr-number> \
       [--title "<更新後タイトル>"] \
       --body-file "$BODY_FILE"
   )
   ```

   - **タイトルは原則として既存を維持する**。ただし毎回スコープ整合性を再評価し（AGENTS.md「Keep PR metadata in sync with the bookmark state」）、手順 1 のタイトル推論ルールと最新のコミット群を照合する。現タイトルが新しい主題（追加スキル・大きな機能変更など）を拾えていない**重大な不整合**がある場合のみ、更新案を提示してユーザー承認を取り `--title` で上書きする。整合している、または軽微な差分にとどまる場合は `--title` を付けない。
   - Assignee は既に付いていれば再指定しない（重複操作を避ける）。付いてなければ `--add-assignee TinyKitten`。
   - 実行後、PR URL と「タイトルを変更したか・どの節を書き換えたか・変更の種類チェック差分」を簡潔に報告する。

## 注意事項

- テンプレの節構成は改変しない。追加・削除はメンテナ承認が必要。
- `jj git push` には `--force` に相当する押し切りフラグが無く、既定で `git push --force-with-lease` 相当の安全確認が入る。安全確認で弾かれたら `jj git fetch` してから状態を見直すこと。`--ignore-immutable` などのガード解除フラグは使わない。push が必要ならユーザーに確認。
- 既存 open PR を上書きしない（重複作成禁止）。
- **スクリーンショット節を空欄のまま提出しない**。画像を貼るか、貼らない理由を明記するかのどちらかにする。
- 資材ブランチ `assets/pr-screenshots` は **削除も `dev` / `master` へのマージも禁止**。削除すると過去の PR 本文の画像がすべて壊れる。アプリのコードは絶対に置かない。
- 動画（`.mp4` / `.mov`）は raw URL ではプレイヤー表示にならないため、このスキルでは扱わない。PR 画面へのドラッグ&ドロップをユーザーに案内する。
- 画像アップロードは Contents API（`gh api`）だけで完結させる。`assets/pr-screenshots` をローカルにチェックアウトしたり jj のブックマークを切ったりしない（作業コピーを汚さないことがこの方式の利点）。
- Hot fix の場合はタイトルに `Hotfix:` プレフィックスを付けるようユーザーに確認する（CLAUDE.md）。
- 本文は `gh pr create --body` / `gh pr edit --body` のようにインラインで渡さない。必ず `--body-file` で一時ファイル経由で渡す（バッククォートなど特殊文字の escape 事故を構造的に防ぐため）。
