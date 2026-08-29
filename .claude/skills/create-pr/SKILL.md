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
| `screenshots` | ローカル画像パスの配列、未指定、または明示的な空配列 `[]`。各要素は `<ローカルパス>\|<出所ラベル>\|<キャプション>`（**出所ラベルは必須**。キャプションのみ任意。例: `~/shots/home.png\|iPhone 15 Pro\|変更後のホーム画面`）。**画像の作り方は問わない** — 実機・シミュレータのキャプチャでも、React Native Web（`npm run web`）のレンダリングでも、実装を動かしていない作図・生成画像でもよい（下の「出所ラベル」参照）。**未指定でも「スクリーンショット」節は空欄にせず、画像が無い理由を必ず明記する**（手順 5 参照）。更新モードでは**未指定＝既存の画像ブロックを変更しない**、**`[]`＝既存の画像ブロックを削除して理由行に置き換える**、と区別する。手順 4 で資材ブランチにアップロードし、本文に埋め込む |

### 出所ラベル

`screenshots` の 2 番目のフィールド。レビュワーが「その画像が何を写したものか」を判断するための情報なので **必須**。実機やシミュレータのキャプチャには限定しない — レビューが楽になるなら手段は問わない。

| 画像の作り方 | 出所ラベルの書き方 | 例 |
| ---- | ---- | ---- |
| 実機・シミュレータ / エミュレータのキャプチャ | 端末名 | `iPhone 15 Pro`、`Pixel 8` |
| React Native Web（`npm run web`）のレンダリング | Web である旨とブラウザ | `React Native Web (Chrome)` |
| 実装を動かしていない作図・生成画像 | **実レンダリングでないと分かる語を必ず含める** | `イメージ図（実装のレンダリング結果ではありません）` |

**実装を動かして得た画像かどうかが、ラベルだけで判別できること**が要件。作図や生成画像を端末名だけのラベルで貼ると、レビュワーは実機で確認済みの挙動として受け取り、実装とのズレを見落とす。

このスキルは**シミュレータ／エミュレータを自前で起動しない**。撮影・作図は呼び出し側が行い、このスキルは渡された画像を資材ブランチへ上げて本文へ埋め込むところだけを担う。

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

   `screenshots` が空なら**この手順（アップロード処理）だけをスキップする**。スクリーンショット節に何を書くかは `screenshots` の有無に関わらず手順 5 で決める。**「未指定だから節を空欄にする」ではない** — 未指定時は手順 5 の規定に従って理由行を生成する。

   **前提となる制約**: GitHub の PR 本文に画像を出すには公開 URL が必要で、Web UI のドラッグ&ドロップ以外に `user-images.githubusercontent.com` へ直接アップロードする API は存在しない。data URI は camo プロキシに落とされて表示されない。そこで **画像専用の孤立ブランチ `assets/pr-screenshots` に Contents API で直接コミットし、その raw URL を本文に埋め込む**。このリポジトリは public なので raw URL はそのままレンダリングされる。

   この資材ブランチを使う理由:

   - アプリのコードを一切含まない root commit 起点の孤立ブランチなので、**PR の diff に画像が混ざらず** `dev` の履歴も肥大化しない。
   - head ブックマークを削除しても画像 URL が切れない。
   - Contents API 経由なので**ローカルの作業コピー・jj の状態・`.git` に一切触れない**（git コマンドも不要）。

   git-flow の命名規則（`feature/*` / `fix/*` 等）は作業ブックマーク向けのルールなので、この資材ブランチは対象外。**`dev` / `master` には絶対にマージしない**。

   VCS 操作を jj に統一する規約に対しては、**AGENTS.md「Version Control (Jujutsu)」に明記された正式な例外**として運用する（下位のスキル文書だけで独自の例外を作らない）。例外が成立する条件は AGENTS.md 側に書いたとおりで、資材専用ブランチであること・`dev` / `master` へマージしないこと・公開パスが内容アドレスで不変であること・事前にユーザー承認を得ることの 4 点すべてを満たす場合に限る。

   1. **入力の正規化と検証**

      分解には下のヘルパーを使う。**`cut -d'|' -f2` は使わない** — 区切りが 1 つも無い行に対して `cut` は行全体を返すので、`~/shots/home.png` のようにメタデータ無しで渡された要素の出所ラベル・キャプションにパスがそのまま入ってしまう。

      検証を通った入力だけを TSV レコードとして書き出し、**後続のアップロードは元の `SCREENSHOTS` 配列ではなくこのレコードを入力にする**。元配列を再走査すると、ここで除外したはずの入力が復活する。

      ```bash
      split_entry() { # $1: screenshots の配列要素 -> SRC / SOURCE_LABEL / CAPTION を設定
        SRC="${1%%|*}"
        SOURCE_LABEL=""
        CAPTION=""
        REST="${1#*|}"
        if [ "$REST" != "$1" ]; then
          SOURCE_LABEL="${REST%%|*}"
          TAIL="${REST#*|}"
          if [ "$TAIL" != "$REST" ]; then CAPTION="$TAIL"; fi
        fi
        # 引用符付きで渡るため `~` は展開されない。ここで絶対パス化する
        case "$SRC" in "~/"*) SRC="$HOME/${SRC#\~/}" ;; esac
      }

      assert_magic() { # $1: パス -> 拡張子ではなく実バイト列で画像形式を確かめる
        node -e '
          const b = require("fs").readFileSync(process.argv[1]).subarray(0, 12);
          const hex = b.toString("hex");
          const ok = hex.startsWith("89504e470d0a1a0a")                               // PNG
            || hex.startsWith("ffd8ff")                                               // JPEG
            || hex.startsWith("474946383761") || hex.startsWith("474946383961")       // GIF
            || (hex.startsWith("52494646") && b.subarray(8, 12).toString() === "WEBP");
          process.exit(ok ? 0 : 1);
        ' "$1"
      }

      has_metadata() { # $1: パス -> EXIF / XMP を含むなら 0
        node -e '
          const buf = require("fs").readFileSync(process.argv[1]);
          const s = buf.toString("latin1");
          // JPEG APP1 の Exif、PNG の eXIf チャンク、各形式に埋まる XMP パケット
          let hit = s.includes("Exif\0\0")
            || s.includes("eXIf")
            || s.includes("http://ns.adobe.com/xap/1.0/")
            || s.includes("XML:com.adobe.xmp");

          // WebP は RIFF チャンクを走査する。EXIF は TIFF の生データとして入るため
          // "Exif\0\0" を含まないことがあり、上の文字列一致では拾えない
          if (!hit
            && buf.subarray(0, 4).toString("latin1") === "RIFF"
            && buf.subarray(8, 12).toString("latin1") === "WEBP") {
            let off = 12;
            while (off + 8 <= buf.length) {
              const id = buf.subarray(off, off + 4).toString("latin1");
              if (id === "EXIF" || id === "XMP ") { hit = true; break; }
              const size = buf.readUInt32LE(off + 4);
              const next = off + 8 + size + (size % 2);
              if (next <= off) break;   // 壊れたサイズで無限ループしない
              off = next;
            }
          }
          process.exit(hit ? 0 : 1);
        ' "$1"
      }

      set -euo pipefail
      RECORDS="$(mktemp)"   # 検証を通った入力のみ: SRC \t SHA256 \t SOURCE_LABEL \t CAPTION
      HAS_METADATA=0
      # 検証が途中で落ちたら残さない（パス・出所ラベル・キャプションを含むため）。
      # 全件通ったら下で解除し、承認後のスクリプトへ引き渡す。
      # INT / TERM は後始末だけでなく必ず終了させる。bash はハンドラの後も処理を続けるため、
      # 削除済みの RECORDS に以降のレコードが書き足されて「部分的に検証しただけの一覧」が
      # 引き渡されてしまう
      cleanup_records() { rm -f "$RECORDS"; }
      trap cleanup_records EXIT
      trap 'cleanup_records; exit 130' INT
      trap 'cleanup_records; exit 143' TERM
      OVERSIZED=0
      TAB=$'\t'
      NL=$'\n'

      for entry in "${SCREENSHOTS[@]}"; do
        split_entry "$entry"

        # パスに制御文字が混ざったものは、レコードを分割して未検証のファイルを
        # 紛れ込ませる細工の可能性があるので、除去ではなく拒否する
        case "$SRC" in
          *"$TAB"*|*"$NL"*)
            echo "パスに制御文字が含まれています: $entry" >&2; exit 1 ;;
        esac

        # 表示用のメタデータはレコード境界を壊さないよう、直列化する前に落とす
        # （Markdown / HTML 属性向けのエスケープは手順 4-4 で別途行う）
        SOURCE_LABEL="$(printf '%s' "$SOURCE_LABEL" | tr -d '\t\r\n')"
        CAPTION="$(printf '%s' "$CAPTION" | tr -d '\t\r\n')"

        case "$(printf '%s' "${SRC##*.}" | tr 'A-Z' 'a-z')" in
          mp4|mov|m4v|webm)
            # 動画は「除外して続行」。ここで exit すると同時に渡された画像も上がらない
            echo "動画は本文に埋め込めません。PR 画面へ直接ドラッグ&ドロップしてください: $SRC" >&2
            continue
            ;;
          png|jpg|jpeg|gif|webp) ;;
          *) echo "非対応の拡張子: $SRC" >&2; exit 1 ;;
        esac

        [ ! -L "$SRC" ] || { echo "シンボリックリンクは受け付けません（参照先が承認後に変わりうる）: $SRC" >&2; exit 1; }
        [ -f "$SRC" ] || { echo "見つかりません: $SRC" >&2; exit 1; }
        [[ "$SOURCE_LABEL" =~ [^[:space:]] ]] || { echo "出所ラベルが必要です（例: iPhone 15 Pro / React Native Web (Chrome)）: $SRC" >&2; exit 1; }
        assert_magic "$SRC" || { echo "実体が画像ではありません（拡張子だけ画像）: $SRC" >&2; exit 1; }

        # 目視では見えないメタデータ。位置情報・端末情報を含みうるので実行前ゲートに載せる
        if has_metadata "$SRC"; then
          echo "EXIF/XMP メタデータあり（位置情報・端末情報を含む可能性）: $SRC" >&2
          HAS_METADATA=1
        fi

        SIZE="$(stat -f%z "$SRC" 2>/dev/null || stat -c%s "$SRC")"
        if [ "$SIZE" -gt 10485760 ]; then
          echo "10MB 超のため拒否: $SRC ($SIZE bytes)" >&2; exit 1
        fi
        if [ "$SIZE" -gt 1048576 ]; then
          echo "1MB 超: $SRC ($SIZE bytes)" >&2; OVERSIZED=1
        fi

        # 承認した内容そのものをハッシュで固定する。承認からアップロードまでの間に
        # ファイルが差し替わっても、手順 4-3 の照合で検出できる
        SHA256="$( { shasum -a 256 "$SRC" 2>/dev/null || sha256sum "$SRC"; } | cut -d" " -f1)"

        printf '%s\t%s\t%s\t%s\n' "$SRC" "$SHA256" "$SOURCE_LABEL" "$CAPTION" >> "$RECORDS"
      done

      [ -s "$RECORDS" ] || {
        echo "アップロード対象の画像がありません（動画のみ、または空配列が渡された）" >&2
        exit 1
      }
      trap - EXIT INT TERM      # ここまで来たら次のステップへ引き渡すので削除しない
      echo "RECORDS=$RECORDS"
      ```

      - **出所ラベルは必須**。`.github/pull_request_template.md` が出所の明記を求めているので、省略された入力はここで弾く。レビュワーが実レンダリングと作図・生成画像を取り違えないための情報なので、空文字でも空白だけでも素通しを許さない（空白のみを通すと、見出しがラベルの無い `###` だけになる）。
      - **動画は除外して続行、それ以外の非対応拡張子はエラー**。説明と挙動を一致させる。
      - **サイズは表示するだけでなく判定する**。10MB 超は拒否。`OVERSIZED=1` になったら、縮小するか（macOS なら `sips -Z 1080 <in> --out <out>`）そのまま続行するかを**ユーザーに確認してから**次へ進む。Contents API の推奨上限は 1MB。
      - **出所ラベル・キャプションからタブ・改行を除去してからレコードに書く**。ユーザー入力をそのまま TSV に流すと列数・行数が変わり、URL とメタデータの対応が崩れる。
      - **シンボリックリンクは拒否する**。承認からアップロードまでの間に参照先を差し替えられると、ユーザーが目視していない内容が恒久公開される。
      - **拡張子ではなく実バイト列で画像形式を確かめる**（`assert_magic`）。拡張子だけを画像にした別種のファイルが公開ブランチへ出るのを防ぐ。
      - **EXIF/XMP の有無を検出する**（`has_metadata`）。マジックバイトの確認だけでは、画面に見えない位置情報・端末情報が元バイト列に残ったまま public な資材ブランチへ恒久公開される。検出したら実行前ゲートで提示し、除去するか承知で進めるかをユーザーに選ばせる。**WebP は RIFF チャンクを走査する**。WebP の EXIF は TIFF の生データとしてチャンクに入るため `Exif\0\0` を含まないことがあり、文字列一致だけでは取りこぼす。
      - **承認した内容の SHA-256 をレコードに固定する**。手順 4-3 で再計算して突き合わせることで、承認とアップロードの間にファイルが差し替わった場合に検出できる（TOCTOU 対策）。
      - **`RECORDS` が空になったら資材ブランチを作る前に停止する**（手順 4-3 へ進まない）。動画を手貼りするか未添付の理由を明記するかをユーザーに確認し、手順 5 の規定に従って理由行（例: `未添付: 動画のみが渡されたため、PR 画面へ直接ドラッグ&ドロップしてください`）を出す。
      - `RECORDS` のパスは標準出力に出して次のステップへ渡す。**この一時ファイルは実行前ゲートを挟んで次の Bash 呼び出しまで残す**（削除は手順 4-3 の `trap` が行う）。
      - ただし**検証が途中で落ちた場合は残さない**。非対応拡張子・出所ラベル不足・10MB 超・画像 0 件などで抜けると手順 4-3 の `trap` は動かないため、この検証ブロック自身にも `trap` を張り、全件通った時点で解除する。
      - **`INT` / `TERM` のハンドラは後始末だけで終わらせず、明示的に `exit` する**。bash はシグナルハンドラの実行後も処理を継続するため、後始末だけだと削除済みの `RECORDS` に以降のレコードが書き足され、**部分的にしか検証していない一覧が正常終了として引き渡される**。手順 4-3 の `trap` も同じ理由で `exit` を伴わせる。
      - **実行前ゲートでユーザーが承認しなかった場合は `rm -f "$RECORDS"` を明示的に実行する**。承認されなければ手順 4-3 は動かず、一時ファイルだけが残るため。

   2. **実行前ゲート**

      > **⚠ 実行前ゲート**: 以降は origin への書き込みを伴う。次の 7 点をユーザーに提示し、**承認を得てから**実行する。
      >
      > 1. どのファイルを・リポジトリ内のどのパスへ・どのブランチに上げるか
      > 2. 資材ブランチを新規作成するか否か
      > 3. 1MB 超のファイルをそのまま上げるか
      > 4. **アップロードした画像は public リポジトリで誰でも閲覧でき、削除もマージも禁止された資材ブランチに残るため、実質的に恒久公開になること**
      > 5. **各画像を目視して、アクセストークン・アカウント情報・実名などの秘匿情報や個人情報が写り込んでいないこと**
      > 6. **`has_metadata` が EXIF/XMP を検出した画像について、位置情報や端末情報を含んだまま公開してよいか**（目視では見えないため、検出結果を必ず提示する）
      > 7. **各画像の出所ラベルが実態と合っていること**（実装を動かして得ていない画像に、端末名だけのラベルが付いていないか）

      4 以降は特に省略しない。スクリーンショットは撮影時の通知バナーやデバッグオーバーレイに認証情報が写り込みやすく、いったん公開 URL になると取り消せない（資材ブランチは削除禁止なので、後から消しても URL の履歴は残る）。写り込みが疑われる場合は、マスキングした画像に差し替えるか、そのファイルを除外してから進む。リポジトリ規約の「認証情報をコミットしない」はこの経路にも等しく適用される。

      **EXIF/XMP は画面に表示されないので目視では判定できない**。`has_metadata` の検出結果を必ずユーザーに提示し、除去するか承知のうえで進めるかを選んでもらう。除去する例: `exiftool -all= <file>`。除去するとハッシュが変わるので、手順 4-1 からやり直す。

   3. **承認後に実行する自己完結スクリプト**（資材ブランチの用意 + アップロード）

      **このブロックは実行前ゲートを挟んで別の Bash 呼び出しになる。関数定義も変数の初期化もすべてこのブロック内に持たせ、単独で実行できる形にする**。手順 4-1 で定義した `split_entry` や変数は前の呼び出しのシェルには残らないので、依存したまま書くと未定義関数や `set -u` の未定義変数で停止する。前ステップから引き継ぐのは **`RECORDS` のファイルパスだけ**。

      設計上の要点:

      - **存在確認では 404 だけを「無い」として扱う**。`2>/dev/null` で握り潰すと、401 / 403 / 5xx といった認証・通信エラーまで「無い」と誤認し、資材ブランチの二重作成や誤った中断を招く。
      - **空ツリーの固定 SHA (`4b825dc…`) は当てにしない**。空ツリーは「内容から決まる SHA」であってすべてのリポジトリにオブジェクトとして保存されている保証は無く、無ければ root commit 作成が無効な tree SHA で失敗する。README を 1 つ含むツリーを実際に作れば、この前提に依存せずに済むうえ、ブランチの目的がブランチ自身に書かれる。
      - 保存先は `<REF_SLUG>-<HEAD_SHORT>/<内容ハッシュ12桁>-<安全化したファイル名>`。`REF_SLUG` は head ブックマーク名に手順 6 と同じスラッグ化規則（`A-Za-z0-9._-` 以外を `_`）を適用したもの、`HEAD_SHORT` は head コミット ID の短縮形、内容ハッシュは画像の SHA-256 先頭 12 桁。
      - **URL は不変にする。過去に公開したパスは決して上書きしない**。`REF_SLUG` だけで決めると、(a) 同じブックマーク名を後日再利用したとき、(b) `feature/foo` と `feature_foo` がスラッグ化後に同じ文字列へ潰れたときに、過去 PR が参照している URL の中身が別の画像へ差し替わる。さらに **同じコミットのまま別の画像を指定して再実行した場合**も、コミット ID だけでは同じパスを踏む。内容ハッシュをファイル名に含めれば、内容が変われば必ず別パスになるので、既存 URL の指す画像は永久に変わらない。名前空間側のプレフィックスが将来衝突したとしても、不変性はこのハッシュが担保する。
      - その結果、**同じパスが既に存在する＝内容も同一**なので、上書き用の blob `sha` を扱う必要も無い。存在すれば URL を再利用し、無ければ新規作成するだけでよい。PR 番号は新規作成時点ではまだ存在しないので使わない。
      - ペイロードは **必ず JSON ファイル経由**で渡す。base64 文字列をコマンドライン引数に直接置くと Linux の `MAX_ARG_STRLEN`（1 引数 128KB）を超えて `Argument list too long` になる。JSON 組み立てとバイナリの base64 化は Node で行う（`jq` への依存を増やさない）。

      ```bash
      (
        set -euo pipefail

        # ---- 前ステップから引き継ぐのはこのパスだけ ----
        RECORDS="<手順 4-1 が出力した RECORDS のパス>"

        WORK="$(mktemp -d)"
        # INT / TERM は後始末後に必ず終了させる（ハンドラの後も処理が続くため）
        cleanup_work() { rm -rf "$WORK" "$RECORDS"; }
        trap cleanup_work EXIT
        trap 'cleanup_work; exit 130' INT
        trap 'cleanup_work; exit 143' TERM

        api_status() { # $1: エンドポイント -> HTTP ステータスコードだけを返す
          local out
          out="$(gh api -i "$1" 2>/dev/null || true)"
          printf '%s' "$out" | head -n1 | awk '{print $2}'
        }

        b64decode() { # 標準入力の base64 を復号（GNU / BSD の -d / -D 差を避けて Node で行う）
          node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(Buffer.from(s,"base64").toString()))'
        }

        OWNER_REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
        ASSET_BRANCH="assets/pr-screenshots"
        ASSET_MARKER="create-pr:asset-branch:v1"
        HEAD_BOOKMARK="<head ブックマーク名>"
        HEAD_SHORT="$(jj log -r "$HEAD_BOOKMARK@origin" --no-graph -T 'commit_id.short()')"
        REF_SLUG="$(printf '%s' "$HEAD_BOOKMARK" \
          | tr -d '\r\n' | tr -c 'A-Za-z0-9._-' '_' \
          | sed -E 's/_+/_/g; s/^_+//; s/_+$//' | cut -c1-100)"
        REF_SLUG="${REF_SLUG:-pr}"
        NS="$REF_SLUG-$HEAD_SHORT"

        # ---- 資材ブランチの用意（初回のみ） ----
        case "$(api_status "repos/$OWNER_REPO/branches/$ASSET_BRANCH")" in
          200)
            # ブランチ名だけを信頼しない。本スキルが作った資材専用系列であることを機械的に確かめる。
            # 誤って dev 由来の同名ブランチが作られていた場合、AGENTS.md の例外条件
            #（資材のみ・アプリコードを含まない）を満たさないブランチへ jj を介さず書き込むことになる
            [ "$(api_status "repos/$OWNER_REPO/contents/README.md?ref=$ASSET_BRANCH")" = "200" ] || {
              echo "$ASSET_BRANCH に README.md がありません。資材ブランチではない可能性があります" >&2
              exit 1
            }
            gh api "repos/$OWNER_REPO/contents/README.md?ref=$ASSET_BRANCH" -q .content \
              | b64decode > "$WORK/asset-readme.txt"
            grep -qF "$ASSET_MARKER" "$WORK/asset-readme.txt" || {
              echo "$ASSET_BRANCH は本スキルが作った資材ブランチではありません（マーカー不一致）" >&2
              exit 1
            }
            # 孤立系列であることを履歴から確認する。既定ブランチと共通祖先を持つなら
            # dev 由来のブランチであり、AGENTS.md の例外条件を満たさない
            # （無関係な履歴同士の compare に GitHub は 404 を返す）
            BASE_BRANCH="$(gh api "repos/$OWNER_REPO" -q .default_branch)"
            if [ "$(api_status "repos/$OWNER_REPO/compare/$BASE_BRANCH...$ASSET_BRANCH")" != "404" ]; then
              echo "$ASSET_BRANCH は既定ブランチと共通祖先を持ちます（孤立ブランチではありません）" >&2
              exit 1
            fi

            # ツリー全体を再帰で取得し、README と規定形式の画像パスだけを許可する（allowlist）。
            # ルート直下の名前だけを見る denylist では app/ や lib/ 配下のコードを見落とす
            TIP="$(gh api "repos/$OWNER_REPO/git/ref/heads/$ASSET_BRANCH" -q .object.sha)"
            gh api "repos/$OWNER_REPO/git/trees/$TIP?recursive=1" > "$WORK/asset-tree.json"
            # ツリーが上限を超えると GitHub は truncated: true と部分的な .tree だけを返す。
            # 部分応答を全件と見なすと、応答に含まれなかった非資材ファイルを見逃す
            # 全エントリを検査する。blob だけを抜き出すと、gitlink（type: commit）や
            # シンボリックリンク（mode: 120000）が検査対象から消えて素通りする
            node -e '
              const t = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
              // 応答の形を先に確かめる。truncated の欠落や tree の欠落を「問題なし」と
              // 解釈すると、全件を検査しないまま書き込みへ進んでしまう
              if (!t || t.truncated !== false || !Array.isArray(t.tree)) {
                console.error("ツリー応答が不正か省略されています（truncated / tree を確認できません）。中止します");
                process.exit(1);
              }
              const NS = /^[A-Za-z0-9._-]+$/;
              const ASSET = /^(README\.md|[A-Za-z0-9._-]+\/[0-9a-f]{12}-[A-Za-z0-9._-]+\.(png|jpg|jpeg|gif|webp))$/i;
              const bad = t.tree.filter((e) => {
                if (!e || typeof e.path !== "string") return true;       // path 欠落を素通りさせない
                if (e.type === "tree") return e.mode !== "040000" || !NS.test(e.path);
                if (e.type !== "blob") return true;                      // commit(gitlink) 等は拒否
                if (e.mode !== "100644") return true;                    // 実行可能・symlink を拒否
                return !ASSET.test(e.path);
              });
              process.stdout.write(bad.map((e) => JSON.stringify(e)).join("\n"));
            ' "$WORK/asset-tree.json" > "$WORK/asset-violations.txt"
            if [ -s "$WORK/asset-violations.txt" ]; then
              echo "$ASSET_BRANCH に資材以外のエントリが含まれています。書き込みを中止します" >&2
              cat "$WORK/asset-violations.txt" >&2
              exit 1
            fi
            ;;
          404)
            # README を 1 つ持つツリーを作り、それを親無しコミット (= root commit) にする。
            # README にはマーカーを埋め、次回以降の系列確認に使う
            # 改行は $'\n' で埋める。列 0 から始まる行を書くと、リスト内の
            # コードフェンスがそこで閉じてしまい Markdown の構造が壊れる（MD046）
            README_BODY="$ASSET_MARKER"$'\n''PR 本文へ埋め込むスクリーンショット置き場。アプリのコードは置かない。dev / master へマージしない。'
            BLOB="$(gh api -X POST "repos/$OWNER_REPO/git/blobs" \
              -f content="$README_BODY" -f encoding=utf-8 -q .sha)"
            node -e 'process.stdout.write(JSON.stringify({tree:[{path:"README.md",mode:"100644",type:"blob",sha:process.argv[1]}]}))' \
              "$BLOB" > "$WORK/tree.json"
            TREE="$(gh api -X POST "repos/$OWNER_REPO/git/trees" --input "$WORK/tree.json" -q .sha)"
            ROOT_COMMIT="$(gh api -X POST "repos/$OWNER_REPO/git/commits" \
              -f message='PRスクリーンショット置き場を初期化' -f tree="$TREE" -q .sha)"
            gh api -X POST "repos/$OWNER_REPO/git/refs" \
              -f ref="refs/heads/$ASSET_BRANCH" -f sha="$ROOT_COMMIT" >/dev/null
            ;;
          *) echo "資材ブランチの確認に失敗（HTTP ステータスを確認してください）" >&2; exit 1 ;;
        esac

        # 承認後は別プロセスなので、レコードの各行をここでも検証し直す（多層防御）。
        # レコードが何らかの理由で壊れても、未検証のファイルが公開ブランチへ出ないようにする
        # ---- アップロード（gh がループの stdin を食わないよう fd 3 から読む） ----
        while IFS="$(printf '\t')" read -r SRC SHA256 SOURCE_LABEL CAPTION <&3; do
          [ ! -L "$SRC" ] || { echo "シンボリックリンクです: $SRC" >&2; exit 1; }

          HASH="${SHA256:0:12}"
          # 拡張子は必ず小文字へ正規化する。大文字のまま保存すると、次回実行時に
          # allowlist が自分で置いたファイルを「資材以外」と判定し、
          # そのブランチへの書き込みが以後すべて止まる
          BASE="$(basename "$SRC")"
          EXT="$(printf '%s' "${BASE##*.}" | tr 'A-Z' 'a-z')"
          NAME="$(printf '%s.%s' "${BASE%.*}" "$EXT" | tr -c 'A-Za-z0-9._-' '_' | sed -E 's/_+/_/g')"
          DEST="$NS/$HASH-$NAME"

          # ファイルの読み込みは 1 回だけにする。検証・base64・blob SHA をすべて同じ
          # Buffer から作るので、「検証は通ったが送られたのは別の中身」という窓が無い。
          # 読み直すたびに窓が開くため、shasum → node と分けてはいけない
          BLOB_SHA="$(node -e '
            const fs = require("fs"), crypto = require("crypto");
            const [src, expected, branch, message, out] = process.argv.slice(1);
            const buf = fs.readFileSync(src);

            if (buf.length > 10485760) {
              console.error("10MB 超: " + src); process.exit(1);
            }
            const head = buf.subarray(0, 12).toString("hex");
            const isImage = head.startsWith("89504e470d0a1a0a")                        // PNG
              || head.startsWith("ffd8ff")                                             // JPEG
              || head.startsWith("474946383761") || head.startsWith("474946383961")    // GIF
              || (head.startsWith("52494646") && buf.subarray(8, 12).toString() === "WEBP");
            if (!isImage) {
              console.error("実体が画像ではありません: " + src); process.exit(1);
            }
            const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
            if (sha256 !== expected) {
              console.error("承認時と内容が異なります（承認後に差し替えられた可能性）: " + src);
              process.exit(1);
            }

            fs.writeFileSync(out, JSON.stringify({
              message, branch, content: buf.toString("base64"),
            }));
            const blob = crypto.createHash("sha1");
            blob.update("blob " + buf.length + "\0");
            blob.update(buf);
            process.stdout.write(blob.digest("hex"));
          ' "$SRC" "$SHA256" "$ASSET_BRANCH" "PRスクリーンショットを追加: $DEST" "$WORK/payload.json")"

          case "$(api_status "repos/$OWNER_REPO/contents/$DEST?ref=$ASSET_BRANCH")" in
            200)
              # パスが一致するだけでは内容の同一性は保証されない（ハッシュ接頭辞の衝突、
              # 資材ブランチへの別経路からの書き込み）。既存 blob の SHA と実際に突き合わせる
              META="$(gh api "repos/$OWNER_REPO/contents/$DEST?ref=$ASSET_BRANCH" \
                -q '[.sha, .download_url] | @tsv')"
              REMOTE_SHA="${META%%$'\t'*}"
              URL="${META#*$'\t'}"
              [ "$REMOTE_SHA" = "$BLOB_SHA" ] || {
                echo "既存ファイルとローカル画像の内容が一致しません: $DEST" >&2
                exit 1
              }
              ;;
            404)
              URL="$(gh api -X PUT "repos/$OWNER_REPO/contents/$DEST" \
                --input "$WORK/payload.json" -q '.content.download_url')" || {
                echo "アップロード失敗: $SRC -> $DEST" >&2
                exit 1
              }
              ;;
            *) echo "既存blobの確認に失敗: $DEST" >&2; exit 1 ;;
          esac

          [ -n "$URL" ] || { echo "URL が空: $SRC -> $DEST" >&2; exit 1; }
          printf '%s\t%s\t%s\n' "$URL" "$SOURCE_LABEL" "$CAPTION"
        done 3< "$RECORDS"
      )
      ```

      - **既存パスを再利用する前に内容の同一性を確かめる**。保存先のファイル名には SHA-256 の先頭 12 桁しか入っていないため、パスの一致だけを根拠に「内容も同一」とみなすと、接頭辞の衝突や別経路からの書き込みがあったときにローカル画像と違う画像を本文へ埋め込む。既存 blob の SHA-1 とローカル画像から計算した git blob SHA-1 を突き合わせ、不一致なら中断する。この照合があるため、パス側のハッシュは可読性を優先して 12 桁のままでよい。
      - **ファイルの読み込みは 1 レコードにつき 1 回だけにする**。サイズ・マジックバイト・SHA-256 の検証、base64 化、git blob SHA の算出をすべて同じ Buffer から行うので、「検証は通ったが送られたのは別の中身」という窓が存在しない。`shasum` で検証してから Node で読み直すような分割をすると、その間に差し替えられた内容がそのまま恒久公開される。
      - 検証内容は、承認後のスクリプトが別プロセスでレコードファイルだけを入力として信頼することを前提に、**サイズ・実バイト列での画像判定・承認時 SHA-256 との一致**の 3 点。手順 4-1 でパスの制御文字・シンボリックリンクを拒否しているのと合わせて多層の防御になる。
      - **`set -euo pipefail` を必ず入れ、各 API 呼び出しの終了コードと URL の非空を検査する**。これが無いと、複数画像のうち途中の PUT が失敗しても最後の 1 件が成功しただけでループ全体が成功終了し、URL の行数が減った状態で本文を組み立ててしまう（出所ラベル・キャプションとの対応がずれる）。失敗したら対象の入力と API エラーを報告して**本文生成ごと中断する**。
      - 出力は `URL\t出所ラベル\tキャプション` の 1 レコード 1 行。行順への暗黙の依存をやめ、URL とメタデータを常に同じレコードとして持ち回る。
      - `gh` の成否に関わらず一時ファイル（`WORK` と `RECORDS`）が消えるよう全体をサブシェルに包んで `trap` を張り、**Bash tool の 1 呼び出し内で完結させる**（手順 6 の本文ファイルと同じ方針）。
      - URL は自分で組み立てず、レスポンスの `download_url` をそのまま使う（ブランチ名の `/` などのエスケープを間違えないため）。得られる URL は `https://raw.githubusercontent.com/<owner>/<repo>/<asset-branch>/<path>` 形式。
      - **既存ブランチはブランチ名だけで信頼しない**。次の 3 つをすべて確認してから書き込む。誤って `dev` 由来の同名ブランチが作られていた場合、AGENTS.md に定めた例外条件（資材のみ・アプリコードを含まない）を満たさないブランチへ jj を介さず書き込むことになるため、1 つでも合わなければ中止する。
        1. README にマーカー `create-pr:asset-branch:v1` が含まれること。
        2. 既定ブランチと**共通祖先を持たない**こと（孤立系列であることの履歴からの裏付け）。無関係な履歴同士の compare に GitHub は 404 を返すので、それ以外なら中止する。
        3. **ツリー全体を再帰で取得し、`README.md` と規定形式の画像パス（`<名前空間>/<12桁ハッシュ>-<ファイル名>.<拡張子>`）だけが存在すること**。ルート直下の名前を拾う denylist 方式では `app/` や `lib/` の配下に置かれたコードを見落とすため、allowlist で判定する。**判定は blob だけでなく全エントリに対して行う**。`blob` を抜き出して検査すると、gitlink（`type: commit`）が検査対象から消えて素通りする。`tree` は名前空間ディレクトリのみ、`blob` は mode が `100644`（通常ファイル）のもののみ許可し、シンボリックリンク（`120000`）や実行可能ファイルも拒否する。**応答の `truncated` が `true` なら全件を検査できていないので中止する**（ツリーが上限を超えると GitHub は部分的な `.tree` を返すため、それを全件と見なすと非資材ファイルを見逃す）。

        保存先を作るときは**拡張子を必ず小文字へ正規化する**。`Home.PNG` のような入力をそのまま保存すると、初回は成功しても次回実行時に allowlist が自分で置いたファイルを弾き、そのブランチへの書き込みが以後すべて止まる。検査側も大文字小文字を区別しない。
      - ブランチ保護 / ruleset で作成や書き込みが弾かれた場合は**握りつぶさずユーザーに報告**し、手貼り（PR 画面へドラッグ&ドロップ）にフォールバックする。

   4. **本文用マークダウンの生成**

      ```markdown
      <!-- create-pr:screenshots:start -->

      ### iPhone 15 Pro

      <img src="https://raw.githubusercontent.com/TrainLCD/MobileApp/assets/pr-screenshots/feature_foo-a1b2c3d4/9f86d081884c-home.png" width="320" alt="変更後のホーム画面" />

      変更後のホーム画面

      <!-- create-pr:screenshots:end -->
      ```

      - **マーカーコメントで必ず囲む**。更新モードで自動生成分だけを差し替え、人間が手貼りした画像や散文を壊さないための境界になる。
      - **出所ラベルは必須なので、画像は必ず `### <出所ラベル>` の見出しでグルーピングする**（テンプレートが出所の明記を求めているため）。同じ出所ラベルの画像は 1 つの見出しの下にまとめる。
      - 幅は `<img width="320">` で指定する。縦長のスクリーンショットが原寸で並ぶと本文が読めなくなるため。**AGENTS.md の MD033（inline HTML 禁止）はリポジトリ内 Markdown 向けのルールで、PR 本文には適用されない**。
      - キャプションがあれば `alt` に入れ、画像の直下にも 1 行で添える。
      - **出所ラベル・キャプションはユーザー入力なので、下の共通サニタイズを通してから挿入する**。素通しすると本文の構造が壊れる。`<details>` や画像記法・リンク・バッククォートを含む文字列は、見出しや本文のレンダリングを乗っ取れる。

        共通処理（挿入先を問わず必ず行う）:

        1. 改行・タブ・その他の制御文字を除去する。
        2. `create-pr:screenshots:start` / `create-pr:screenshots:end` と一致する断片を除去する。**マーカー文字列が本文に紛れ込むと更新モードの境界判定が壊れる**。
        3. `&` → `&amp;`、`<` → `&lt;`、`>` → `&gt;` の順で置換する（`&` を最初に処理しないと二重エスケープになる）。これで生 HTML の注入は無効化される。

        挿入先ごとの追加処理:

        - **HTML 属性**（`alt="..."` など）: さらに `"` → `&quot;` を置換する。
        - **Markdown テキスト**（`### <出所ラベル>` の見出し、画像下のキャプション行）: さらに Markdown の特殊文字 `` ` `` `*` `_` `[` `]` `(` `)` `#` `!` `|` `\` の前にバックスラッシュを置く（`\` を最初に処理する）。見出し・表・リンク・コードスパンの構造を乗っ取られないようにするため。

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
     | `screenshots` に画像あり | 手順 4-4 の画像ブロックをそのまま挿入する |
     | `screenshots` が `[]`（明示的な空配列）、または全項目が除外されて画像が 1 件も無い | **画像ブロックは作らず理由行を書く**（例: `スクリーンショットなし: 明示的に空配列が指定されたため`／`未添付: 動画のみが渡されたため、PR 画面へ直接ドラッグ&ドロップしてください`）。空のマーカーブロックを出すのは「節を空欄にしない」という要件違反になる |
     | `screenshots` 未指定 かつ **UI 影響パスに変更が無い** | **画像が無い理由を 1 行で明記する**。書式は `UI 変更なし: <根拠>`。例: 「UI 変更なし: `.claude/**` のみの変更で、アプリの画面には影響しません」「UI 変更なし: `src/utils/**` のロジック変更のみで、画面表示に変化はありません」 |
     | `screenshots` 未指定 だが **UI 影響パスに変更がある** | 画面差分が出る可能性が高い。画像を用意して `screenshots` に渡すか、用意しない理由を明記するかを**ユーザーに確認する**。**手段は問わない**ので、ネイティブビルドが要ることだけを根拠に未添付へ倒さない（`npm run web` の React Native Web レンダリングや、変更後の見た目を示す作図・生成画像でもレビューの助けになる）。用意しない場合はその理由を明記する。例: 「未添付: 変更が計測ロジックのみで、静止画では差分を示せないため」 |

     **UI 影響パス**（手順 3 の「コード本体パス」より狭い。画面に見える変化が出うる範囲）:

     - `src/components/**`
     - `src/screens/**`
     - `assets/**`
     - `src/translation.ts`（表示文言）

     パス一覧はあくまで機械的なゲートなので、最終判断は差分の中身を見て行う（例: `src/hooks/**` の変更でも表示ロジックを変えているなら UI 変更として扱う）。理由行も手順 4-4 と同じマーカー（`<!-- create-pr:screenshots:start -->` 〜 `<!-- create-pr:screenshots:end -->`）で囲み、更新モードで差し替え可能にしておく。

   **更新モード**（既存 PR の本文を再生成）

   既存本文を節ごとに分割し、以下のルールで部分的に書き換える。人間が書き込んだ散文は壊さない。

   | 節 | 更新方針 |
   | ---- | ---- |
   | 概要 | 既存内容を尊重。空欄（テンプレのコメントのみ）なら新規作成モードと同じ生成を試みる。 |
   | 変更の種類 | **常に手順 3 の結果で上書き**（機械的判定）。 |
   | 変更内容 | 冒頭の箇条書きブロック（`-` で始まる連続行）を最新差分で再生成。その下に人間が書いた散文があれば残す。 |
   | テスト | **手順 5 の本文組み立てと同じ判定順を適用**（まずコード本体パス未変更なら 3 項目を強制 OFF。該当しない場合のみ `skip_checks` で ON/OFF）。 |
   | 関連Issue | 既存内容を尊重。コミット件名に `Closes/Fixes/Refs #N` があり、かつ既存本文中に同じ Issue 番号 `#N` を指す表現が存在しない場合のみ追記（重複は作らない。比較時は `Closes` / `closes` / `Fixes` / `fixes` / `Refs` / `refs` を同一視し、空白・記号差は無視して `#N` 単位で照合）。 |
   | スクリーンショット | 下の「更新モードでのスクリーンショット節」を参照。**未指定は「変更なし」であって「消せ」ではない**。 |

   **更新モードでのスクリーンショット節**

   マーカー（`<!-- create-pr:screenshots:start -->` 〜 `<!-- create-pr:screenshots:end -->`）の内側だけを対象にし、外側の既存内容（人間が手貼りした画像・散文）は常に温存する。マーカー内の扱いは下表のとおり。

   | `screenshots` | マーカー内に既存の画像ブロックがある | マーカー内が理由行のみ / マーカーが無い |
   | ---- | ---- | ---- |
   | 指定あり | 新しい画像ブロックで置き換える | 新しい画像ブロックを書く（マーカーが無ければ節末尾に新規追加） |
   | **未指定** | **触らない**（既存の画像・出所ラベル・キャプションをそのまま残す） | 手順 5 の規定に従って理由行を生成する |
   | `[]`（明示的な空配列） | 画像ブロックを削除し、理由行に置き換える | 理由行を生成する |

   **`screenshots` の未指定と空配列 `[]` を必ず区別する**。未指定を「再生成」と解釈すると、初回にアップロードした画像が後続コミットの反映時に理由行へ置き換わって本文から消える。画像を意図的に消したいときだけ空配列を明示的に渡す。

   なお、マーカー外に人間が貼った画像が既にある場合は理由行を書かない（「UI 変更なし」と実際の画像が矛盾するため）。

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
- **画像の取得手段は問わない**。実機・シミュレータのキャプチャ、React Native Web（`npm run web`）のレンダリング、実装を動かしていない作図・生成画像のどれでもよい。**このスキルはシミュレータ／エミュレータを自前で起動しない** — 撮影や作図は呼び出し側の責務で、このスキルは渡された画像を受け取るだけ。ただし何を写した画像かは出所ラベルで必ず区別できるようにする（「出所ラベル」参照）。
- 資材ブランチ `assets/pr-screenshots` は **削除も `dev` / `master` へのマージも禁止**。削除すると過去の PR 本文の画像がすべて壊れる。アプリのコードは絶対に置かない。
- 動画（`.mp4` / `.mov`）は raw URL ではプレイヤー表示にならないため、このスキルでは扱わない。PR 画面へのドラッグ&ドロップをユーザーに案内する。
- 画像アップロードは Contents API（`gh api`）だけで完結させる。`assets/pr-screenshots` をローカルにチェックアウトしたり jj のブックマークを切ったりしない（作業コピーを汚さないことがこの方式の利点）。
- Hot fix の場合はタイトルに `Hotfix:` プレフィックスを付けるようユーザーに確認する（CLAUDE.md）。
- 本文は `gh pr create --body` / `gh pr edit --body` のようにインラインで渡さない。必ず `--body-file` で一時ファイル経由で渡す（バッククォートなど特殊文字の escape 事故を構造的に防ぐため）。
