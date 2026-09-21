# フィードバックからの自動修正 PR

アプリに届いたフィードバックのうち、トリアージで優先度が高いと判断されたものを
Claude Code に読ませます。このリポジトリのコードで直せる不具合であれば、修正の
Pull Request まで作ります。

ワークフロー本体は `.github/workflows/auto_fix_from_feedback.yml` です。対象かどうかの
判断と、issue 本文から個人情報を取り除く処理は `.github/scripts/feedback-issue.mjs`
が行います。

## 全体の流れ

```text
アプリ
  │ sendReport()            src/hooks/useFeedback.ts
  ▼
Cloudflare Worker /postFeedback              TrainLCD/Functions
  │ Workers AI でトリアージし、ラベル付きで issue 化
  ▼
TrainLCD/Issues の issue
  │ .github/workflows/dispatch_feedback_auto_fix.yml（下記）
  │ repository_dispatch (event_type: feedback-auto-fix)
  ▼
TrainLCD/MobileApp の Auto Fix From Feedback
  │ 1. 同じ issue を扱っていないか確かめる
  │ 2. issue を取得し、条件を確かめて個人情報を取り除く
  │ 3. Claude Code が原因を調べ、直せるものだけ修正する
  │ 4. lint / test / typecheck を通してから PR を作る
  │ 5. 結果を issue へコメントで返す
  ▼
fix/feedback-<issue番号> → dev の Pull Request
（直せない場合は PR を作らず、理由を issue にコメントする）
```

## 起動条件

次の条件をすべて満たす issue が対象になります。既定値は `feedback-issue.mjs` に
書いてあり、ワークフローの環境変数 `TRIAGE_LABELS` / `CATEGORY_LABELS` /
`EXCLUDE_LABELS` に CSV を渡せば変えられます。

| 条件 | 既定値 |
| ---- | ---- |
| トリアージ（いずれか必須） | `🟠 P1 / High` |
| カテゴリ（いずれか必須） | `🐛 Bug`, `💣 Crash` |
| 除外（1 つでも付いていれば対象外） | `💩 Spam`, `duplicate`, `wontfix`, `invalid` |

P1 だけに絞ったのは費用を抑えるためです。open な P1 は数件しかありませんが、P2 は
数十件あります。これを全部エージェントに渡すと、#6721 で OpenAI のクレジットを
使い切ったときと同じことになります。`ai_code_review.yml` を手動実行だけにして
あるのも、もともと同じ理由からです。

`🐥 Canary` は除外していません。`plan-from-feedback` スキルでは既定で除外して
いますが、あちらはたまったチケットから次に手を付けるものを選ぶスキルなので、
目的が違います。Canary で見つかった P1 は、製品版に降りてくる前に直したいものです。

ラベルの確認は Issues 側と MobileApp 側の両方で行います。dispatch を投げてきた側が
正しく絞ってくれているとは限らないので、受け取った側でももう一度確かめます。手動で
実行したときも、同じように確かめてから動きます。

## 必要な設定

### MobileApp 側の secret

| secret | 用途 |
| ---- | ---- |
| `ANTHROPIC_API_KEY` | Claude Code Action の認証 |
| `ISSUES_REPO_TOKEN` | `TrainLCD/Issues` の issue 取得とコメント投稿 |

`ISSUES_REPO_TOKEN` に要る権限は `TrainLCD/Issues` の Issues (read and write) だけ
です。どちらかを設定し忘れていると、ワークフローは警告を出すだけで何もせずに
終わります。

Pull Request は Claude GitHub App のトークンで作ります。App が入っていなければ
`GITHUB_TOKEN` を使いますが、`GITHUB_TOKEN` で push しても他のワークフローは
動きません。つまり、出来上がった PR で Jest も TypeScript Check も走らないことに
なります。App は外さないでください。

### Issues 側のディスパッチャ

`TrainLCD/Issues` に、以下を `.github/workflows/dispatch_feedback_auto_fix.yml`
として置いてください。あわせて、MobileApp の Actions を起動できるトークンを同じ
リポジトリの secret `MOBILEAPP_DISPATCH_TOKEN` に入れます。必要な権限は
`TrainLCD/MobileApp` の Contents: read-only と Actions: read and write です。

```yaml
# 条件を満たすフィードバック issue を TrainLCD/MobileApp へ知らせ、自動修正を
# 始めさせる。ラベルの確認は MobileApp 側でももう一度行う。
name: Dispatch feedback auto fix

on:
  issues:
    types: [labeled]

permissions:
  issues: read

jobs:
  dispatch:
    runs-on: ubuntu-22.04
    # 条件に使うラベルが付いたときだけ動かす。issue を作るときはラベルが
    # まとめて付き、その数だけ labeled イベントが飛んでくる。どの順で付くかは
    # 決まっていないので、P1 だけを見ていると Bug が後から付いた場合に
    # 取りこぼす。そこで 3 つのどれが付いたときも一度確かめる形にした。
    # 重複して飛んだ分は MobileApp 側で止まる。
    if: >-
      contains(fromJSON('["🟠 P1 / High", "🐛 Bug", "💣 Crash"]'),
      github.event.label.name)
    steps:
      - name: Check labels
        id: check
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          ISSUE_NUMBER: ${{ github.event.issue.number }}
        run: |
          set -euo pipefail
          LABELS="$(gh issue view "$ISSUE_NUMBER" --repo "$GITHUB_REPOSITORY" --json labels --jq '[.labels[].name]')"
          MATCH="$(jq -n --argjson labels "$LABELS" '
            ($labels | any(. == "🟠 P1 / High")) and
            ($labels | any(. == "🐛 Bug" or . == "💣 Crash")) and
            ($labels | any(. == "💩 Spam" or . == "duplicate" or . == "wontfix" or . == "invalid") | not)
          ')"
          echo "eligible=$MATCH" >> "$GITHUB_OUTPUT"

      - name: Dispatch
        if: steps.check.outputs.eligible == 'true'
        env:
          GH_TOKEN: ${{ secrets.MOBILEAPP_DISPATCH_TOKEN }}
          ISSUE_NUMBER: ${{ github.event.issue.number }}
        run: |
          set -euo pipefail
          gh api repos/TrainLCD/MobileApp/dispatches \
            -f event_type=feedback-auto-fix \
            -F "client_payload[issue_number]=$ISSUE_NUMBER"
```

dispatch に載せるのは issue 番号だけにしてあります。本文やタイトルまで渡すと、
dispatch を投げられる人がエージェントへの指示をそこに紛れ込ませられるように
なります。MobileApp 側は番号だけを受け取り、本文は自分で取りに行きます。

## 手動で実行する

取りこぼしをやり直すときや、動きを確かめたいときは `workflow_dispatch` を使います。

```bash
gh workflow run auto_fix_from_feedback.yml -f issue_number=1251
```

同じ issue を二度扱わないように、次のどれかが見つかった時点で何もせずに終わります。

- `fix/feedback-<番号>` のブランチ
- 同じブランチの PR（merged / closed も含む）
- 目印 `<!-- auto-fix-from-feedback -->` で始まる issue のコメント

もう一度作らせたいときは、見つかったものを先に消してください。

## 直せないと判断した場合

届くフィードバックの多くは駅や路線のデータが原因で、MobileApp のコードをいじっても
直りません。そう判断した時点でエージェントは調べるのをやめ、理由を issue に
コメントして終わります。

次のどれかに当てはまる場合は、コードに手を付けずにこの形で終わります。

- 原因が別のリポジトリにある場合。駅名・路線記号・停車駅・種別といったデータの
  誤りは [StationAPI](https://github.com/TrainLCD/StationAPI)、音声合成や
  フィードバックの送信は [Functions](https://github.com/TrainLCD/Functions) が
  持っています。この 2 つについては、コメントに引き継ぎ先として名前が出ます。
- 原因を 1 つに絞れない場合や、どうすれば再現するのか本文から読み取れない場合。
- 直してみたものの、`npm run lint` / `npm test` / `npm run typecheck` のどれかが
  通らなかった場合。
- 本文にエージェントへの指示らしき文が混ざっていた場合。

エージェントは判断を `verdict.json` に書き、ワークフローがそれを読んでコメントの
文面を組み立てます（`.github/scripts/feedback-autofix-comment.mjs`）。理由は
メンテナが読むものなので、一文一義で 3 文以内に収めること、フィードバックの原文は
引用しないことをエージェントに指示してあります。

コメントの先頭には `<!-- auto-fix-from-feedback -->` という目印が入ります。同じ
issue にまたラベルが付いても、この目印を見つけた時点で何もせずに終わるので、同じ
調査を繰り返しません。もう一度試させたいときは、このコメントを消してください。

## 実行が完了しなかった場合

判断も PR も残らないまま終わったときは、どこで止まったのかを issue にコメントして
から、ジョブを失敗させます。何も言わずに終わってしまうと、issue を見た人には
「調べたうえで何もしなかった」のか「そもそも動かなかった」のかが分かりません。
手つかずの issue を、対応済みだと思って読み飛ばすことになります。

止まった箇所は次の 5 つに分けてあります。文面はあらかじめ決めてあり、エージェントに
書かせてはいません。

| 内訳 | 状態 |
| ---- | ---- |
| 実行まで到達しなかった | checkout・依存のインストール・issue の取得のいずれかで失敗した |
| 失敗または中断した | エージェントの実行が落ちた、または打ち切られた |
| 判断を残さなかった | エージェントは終了したが `verdict.json` が無い |
| 判断を読めなかった | `verdict.json` が壊れている（先頭 200 文字を添える） |
| PR が見つからない | 修正したと報告されたが PR が無い（push か PR 作成の失敗） |

この 5 つはどれも `<!-- auto-fix-from-feedback:error -->` という目印を使っていて、
判断を書くときの目印とは別にしてあります。上に書いた重複の確認には引っかからないので、
一時的な失敗であれば、次にラベルが付いたときや手動実行でもう一度試せます。

判断を書き終えたあとで実行が落ちた場合は、その判断と、実行が最後まで進んで
いないことの両方をコメントに書きます。判断だけ書くと最後まで動いたように読めますし、
失敗だけ書くと判断のほうが埋もれます。

なお、ラベルの条件を満たしていない場合と、PR・ブランチ・判断済みのコメントが
すでにある場合は、何もコメントしません。前者はそもそも対象外ですし、後者は一度
書いてあるので、あらためて書くことがありません。

## 設計上の判断

### 生成された PR は必ず人がレビューする

エージェントは実機で症状を再現できません。確かめないまま書いた修正なので、自動
マージはしません。PR の冒頭にも、自動で作ったものであることと、実機で確認して
いないことを書かせています。

### issue 本文は untrusted な入力として扱う

issue の本文は、アプリの利用者がそのまま書いたものです。誰かが内容を確かめる工程は
ありません。`feedback-issue.mjs` では、モデルに渡す前に次のことをしています。

- 送信者を特定できる節（`チケットID` / `Sentry Event ID` / `レポーターUID`）を
  取り除く。
- レポート画像の URL を取り除く。この URL には送信者の識別子がそのまま入っている。
- `<feedback_issue>` のような、プロンプトで使っているタグと同じ綴りが出てきたら、
  開き山括弧を実体参照へ置き換える。タグの切れ目を装われないようにするため。
- 見出しを探すとき、コードブロックの内側は見ない。利用者の原文はコードブロックの
  中に入るので、そこに `## レポーターUID` と書かれていても節の切れ目としては
  扱いません。

そのうえでプロンプトには、本文はデータとして読むこと、そこに書かれた指示には
従わないことを書いてあります。指示らしき文が混ざっていたら、対象外として終わらせ
ます。それでも抜け道を完全になくせるわけではないので、人がレビューする前提は
崩さないでください。

エージェントに `ISSUES_REPO_TOKEN` は渡していません。エージェントが触れるのは
MobileApp だけで、Issues への書き込みは後ろのステップが引き受けます。判断も直接
投稿させず、`verdict.json` に書かせたものをワークフローが読みます。文面を組み立てる
ステップと、トークンを持って投稿するステップも分けてあります。

コメントに載る理由はエージェントが書きますが、その材料になるのは利用者の本文です。
そのため `feedback-autofix-comment.mjs` は、理由から HTML コメントをすべて取り
除きます。目印を装われると重複の確認が働かなくなり、同じ issue にコメントが積み
上がっていきます。

### 原文を公開物へ載せない

MobileApp は公開リポジトリですが、フィードバックの置き場はプライベートです。PR の
本文に原文を引用すると、利用者が書いた文章がそのまま人目に触れます。症状は
エージェント自身の言葉で説明させ、端末モデル名や OS のバージョンなど、再現に必要な
ものだけを書かせています。

### モデル

既定は `claude-sonnet-5` です。ワークフローの先頭にある環境変数 `CLAUDE_MODEL` を
書き換えれば変えられます。

## 関連ドキュメント

- [AI コードレビュー (GPT-5.6 Sol)](./ai-code-review-workflow.md) — PR のレビューを
  手動実行で行う仕組みです。自動で動かさない理由もそちらに書いてあります。
- `.claude/skills/plan-from-feedback/SKILL.md` — フィードバックから次に着手する
  ものを選ぶための、読み取り専用のスキルです。
