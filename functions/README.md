# TrainLCD Worker (Cloudflare)

TrainLCD のバックエンドを担う Cloudflare Worker。旧 Firebase Cloud Functions を置き換えたもので、
1 つの Worker に HTTP / キュー / Cron の 3 ハンドラを集約している。

## 提供機能

- **TTS 合成** (`POST /tts`): Azure Speech で SSML を音声合成し、KV/R2 でキャッシュ
- **セッション発行** (`POST /auth/token`): インストール ID から短期セッション JWT を発行（Firebase 匿名認証の代替）
- **フィードバック受付** (`POST /postFeedback`): トリアージキューへ投函
- **画像アップロード** (`POST /feedback/upload-image`): フィードバック画像を R2 に保存し公開 URL を返す
- **アプリ設定配信** (`GET /config/maintenance`, `GET /config/remote`): メンテナンス状態と GPS しきい値（Remote Config 代替）
- **フィードバックトリアージ** (queue `feedback-triage`): Workers AI で要約・分類し、GitHub Issue 作成と Discord 通知
- **TTS キャッシュ書き込み**: 合成音声を `/tts` ハンドラから R2 + KV へ直接保存（Queues の 128KB 上限に音声が収まらないためキューは使わない）
- **レビュー通知** (Cron 毎時): App Store / Google Play の新着レビューを Discord へ通知

## 技術スタック

- **Cloudflare Workers** — `fetch` / `queue` / `scheduled` ハンドラ
- **Workers KV** — TTS キャッシュメタ・設定・レビュー既読状態
- **R2** — 音声バイナリ・フィードバック画像・few-shot データ
- **Cloudflare Queues** — `feedback-triage`
- **Workers AI** — フィードバックトリアージ
- **Azure Speech** — TTS 合成（SSML）
- **Google Android Publisher API** — Google Play レビュー取得（サービスアカウント JWT）
- **TypeScript / Biome / Jest / Wrangler**

## 前提

- Node.js 22.x / npm
- Wrangler（`npm install` で devDependency として導入）
- Cloudflare アカウント（KV/R2/Queues/Workers AI を有効化）

## セットアップ

```bash
cd functions
npm install
```

### バインディングの作成

`wrangler.jsonc` の `id` / `bucket_name` プレースホルダを、以下で発行した実値に置き換える（dev/prod それぞれ）。

```bash
# KV
wrangler kv namespace create TTS_KV
wrangler kv namespace create CONFIG_KV
wrangler kv namespace create STATE_KV
# R2
wrangler r2 bucket create trainlcd-tts-dev
wrangler r2 bucket create trainlcd-uploads-dev
# Queues
wrangler queues create feedback-triage-dev
```

### シークレット投入

```bash
wrangler secret put SESSION_JWT_SECRET          # セッション JWT 署名鍵（任意の長い乱数）
wrangler secret put AZURE_SPEECH_KEY            # Azure Speech のサブスクリプションキー
wrangler secret put GOOGLE_SA_KEY              # Android Publisher 用 SA 鍵 JSON（1 行文字列）
wrangler secret put OCTOKIT_PAT
wrangler secret put DISCORD_CS_WEBHOOK_URL
wrangler secret put DISCORD_CRASH_WEBHOOK_URL
wrangler secret put DISCORD_REVIEW_WEBHOOK_URL
```

ローカル開発では同じキーを `.dev.vars`（gitignore 済み）に記述する。

### 非機密の設定（vars）

`wrangler.jsonc` の `vars` を参照。Azure リージョン・ボイス名・AI モデル名・パッケージ名・
公開アップロード URL（R2 の公開ドメイン）などを環境ごとに設定する。

## 開発・デプロイ

```bash
npm run dev            # wrangler dev（ローカル）
npm run typecheck      # tsc --noEmit
npm run lint           # biome check
npm test               # jest（純粋関数）
npm run deploy:dev     # wrangler deploy（dev）
npm run deploy:prod    # wrangler deploy --env production
npm run tail           # ログ追尾
```

## クライアント通信規約

`POST /tts` と `POST /postFeedback` は Firebase callable 互換のワイヤ形式を維持している。

- リクエスト: `{ "data": { ... } }`、`Authorization: Bearer <session JWT>`
- 成功: `{ "result": { ... } }`
- 失敗: HTTP ステータス + `{ "error": { "message", "status" } }`

セッション JWT は `POST /auth/token`（body `{ "installId": "<uuid>" }`）で取得する。

## テスト方針

ユニットテストは純粋関数（SSML 整形・ボイス名解決・トリアージ JSON の正規化・レビュー
パース）を Jest で検証する。HTTP/キュー/Cron のランタイム結合は `wrangler dev` /
`wrangler dev --test-scheduled` で確認する。

## few-shot データ

フィードバックトリアージは R2 上の `fewshot.jsonl`（`FEW_SHOT_R2_KEY`、`TTS_BUCKET` 内）を
読み込む。フォーマットは 1 行 1 例の JSONL（`fewshot.example.jsonl` 参照）:

```json
{"input": "ユーザーの本文", "output": "{\"title\":...,\"isSpam\":false,...}"}
```

アップロード:

```bash
wrangler r2 object put trainlcd-tts-dev/fewshot.jsonl --file fewshot.jsonl
```

未配置だとトリアージは `FEW_SHOT_NOT_AVAILABLE` で失敗する（誤学習防止のフェイルハード）。

## メンテナンス CLI

KV(TTS_KV) と R2(音声バケット) を直接操作する保守ツール。Cloudflare REST API(KV) と
S3 互換 API(R2) を使う。接続情報は環境変数で渡す:

```bash
export CF_ACCOUNT_ID=...          # Cloudflare アカウント ID
export CF_API_TOKEN=...           # KV 読み書き権限の API トークン
export CF_KV_NAMESPACE_ID=...     # 対象環境の TTS_KV ネームスペース ID
export R2_ACCESS_KEY_ID=...       # R2 の S3 アクセスキー
export R2_SECRET_ACCESS_KEY=...
export R2_BUCKET=trainlcd-tts-dev # 対象環境の音声バケット名

# SSML 本文で TTS キャッシュを検索（必要なら削除）
npm run find-tts-cache -- "東京" --field ssmlJa
npm run find-tts-cache -- "東京" --delete

# R2 にあるが KV メタの無い孤立音声を検出（必要なら削除）
npm run find-orphaned-tts
npm run find-orphaned-tts -- --delete
```
