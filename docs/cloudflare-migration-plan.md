# TrainLCD を Firebase から Cloudflare へ全面移行

## Context

発端は「`functions/` が Cloud Functions 寄りなので Cloudflare で置き換えたい」という依頼。調査の結果、Firebase はバックエンド（`functions/`）だけでなく**アプリ本体 `src/` にも深く組み込まれている**ことが判明した（匿名 Auth・Firestore・Storage・Remote Config・Analytics）。ユーザーの最終意図は **Firebase の全面撤廃**。本プランはバックエンドとアプリ両輪の移行を、独立した専用ブランチ上でフェーズ分割して進める計画。

### 確定方針（ユーザー確認済み）

| 論点 | 決定 |
| --- | --- |
| TTS 合成エンジン | **Azure Speech（SSML 必須 REST）**に移行（Google Cloud TTS 廃止） |
| TTS キャッシュメタ / `configs/tts` | **Workers KV**、音声バイナリ → **R2** |
| AI トリアージ（Vertex Gemini） | **Workers AI** |
| Pub/Sub | **Cloudflare Queues** |
| Cloud Scheduler | **Cron Triggers** |
| Firestore（appConfig/maintenance） | **Worker + KV**（単発 GET） |
| Storage（フィードバック画像） | **Worker + R2**（アップロード API） |
| Remote Config（GPS 2 キー） | **Worker + KV 配信**で遠隔チューニング維持 |
| Analytics | **破棄**（コード未使用） |
| 匿名認証 + リクエスト認証 | **インストール ID（expo-secure-store UUID）→ Worker 発行の短期 JWT** |
| クライアント通信規約 | TTS/feedback は **callable 互換（`{data}`→`{result}`）維持**（Bearer 値のみ差し替え） |
| 進め方 | **dev から専用ブランチ。3 PR にフェーズ分割**（feature/ble とは独立） |

Google Play レビュー取得は Google Play Developer API（Firebase ではない）なので **Google サービスアカウントのみ残存**（Android Publisher 用）。

---

## ブランチ / フェーズ構成

`dev` から `feature/cloudflare-migration` を新規作成（`feature/ble` とは独立）。memory の「feature/ プレフィックス」「dev から fresh 分岐」方針に従う。各フェーズを別 PR に分割:

- **Phase 1 — Cloudflare Worker バックエンド構築**（旧 Firebase functions と並走、アプリ無改修）
- **Phase 2 — アプリ脱 Firebase**（環境ごとに認証・データ・設定・URL を一斉カットオーバー）
- **Phase 3 — 旧 Firebase 資源の撤去**（functions 削除、google-services.json / firebase.json / @react-native-firebase 依存除去、prebuild、Firebase プロジェクト整理）

各環境（dev=`trainlcd-dev` / prod=`trainlcd-ea91e`）で Phase 1 を先行デプロイ → Phase 2 を同一リリースでカットオーバー、という順序。

---

## Phase 1: Cloudflare Worker バックエンド

単一 Worker に `fetch` / `queue` / `scheduled` の 3 ハンドラを集約（`functions/` を中身ごと置換）。

### ルート（fetch ハンドラ）

| メソッド/パス | 由来 | 認証 | 概要 |
| --- | --- | --- | --- |
| `POST /auth/token` | 新規 | なし（ID 受領） | インストール ID を受け、短期セッション JWT（HS256・Worker シークレット署名）を発行。`sub=installId` |
| `POST /tts` | `tts` onCall | セッション JWT | callable 互換。KV/R2 キャッシュ照会 → ミス時 Azure 合成 → R2+KV へ直接書込 |
| `POST /postFeedback` | `enqueueFeedback` | セッション JWT | callable 互換。Queue へ投函 |
| `POST /feedback/upload-image` | Firebase Storage 代替 | セッション JWT | PNG を受け R2 `report-images/{id}.png` に保存し公開 URL を返す |
| `GET /config/maintenance` | Firestore 代替 | なし | KV `config:maintenance` → `{ underMaintenance: boolean }` |
| `GET /config/remote` | Remote Config 代替 | なし | KV `config:remote` → `{ max_permit_accuracy, force_not_arrived_on_low_accuracy }` |

callable 互換: リクエスト `{data:{…}}` を読み、成功は `{result:{…}}` / 失敗は HTTP ステータス + `{error:{message,status}}`。`/tts` のレスポンスキー（`id,jaAudioContent,enAudioContent,jaAudioMimeType,enAudioMimeType`）は現行どおり。

### 認証（lib/auth/session.ts）

- `POST /auth/token`: body `{ installId }`（任意で App Attest/Play Integrity 拡張余地を残すが今回は無し）→ `installId` を `sub`、`exp`（例 1h）で HS256 JWT 署名（`env.SESSION_JWT_SECRET`）。
- 保護ルート: `Authorization: Bearer <session JWT>` を HS256 検証 → `uid = sub`。失敗時 callable 形式の 401。
- **Firebase ID トークン検証は実装しない**（脱 Firebase のため）。Phase 1 では旧 functions が現行アプリを支え、Phase 2 でアプリを Worker のセッション JWT に切替える。

### TTS（lib/azure/tts.ts + routes/tts.ts）

- Azure Speech: `POST https://<AZURE_SPEECH_REGION>.tts.speech.microsoft.com/cognitiveservices/v1`、ヘッダ `Ocp-Apim-Subscription-Key`(secret) / `Content-Type: application/ssml+xml` / `X-Microsoft-OutputFormat: audio-24khz-48kbitrate-mono-mp3`。
- クライアント SSML `<speak>…</speak>` の外殻を剥がし `<speak version="1.0" xml:lang="<ja-JP|en-US>"><voice name="<voiceName>">…</voice></speak>` で包み直す。
- **流用**: `funcs/tts.ts` の `stripSsml`（byte 数検証）、id ハッシュ生成（version=11・キーソート維持。`node:crypto` → `crypto.subtle.digest('SHA-256')` に置換し**入力不変**）、`normalizeRomanText`（`utils/normalize.ts`）。`synthesizeSpeech` は Azure 呼び出しへ全面差替え、出力は常に `audio/mpeg`（`sniffAudioMimeType` 不要）。
- ボイス名は **Azure ニューラルボイス**（既定例 ja=`ja-JP-NanamiNeural` / en=`en-US-JennyNeural`、vars で可変）。`utils/ttsVoice.ts` は優先順位ロジック（クライアント指定→config→既定）は流用しつつ Google の `-Standard-` ガードを撤去/Azure 妥当性チェックに置換。config は KV `config:tts`（5 分 isolate キャッシュ）。
- 処理: JWT 検証 → 入力検証（空・SSML 除去後空・4000byte 上限）→ ボイス解決 → id 算出 → KV メタ照会（ヒット時 R2 から ja/en 取得し base64 返却、既存フォールバック踏襲）→ ミス時 Azure 合成 → `ctx.waitUntil(...)` で R2+KV へ直接キャッシュ書込 → `{result:{…}}`。

> **実装上の変更**: 当初は TTS キャッシュ書込も Queue 経由を想定したが、音声が Queues の 128KB 上限に収まらないため、`/tts` ハンドラから R2+KV へ直接書き込む方式に変更した（tts-cache キューは新設しない）。

### キュー consumer（queue ハンドラ、`batch.queue` で分岐）

- **feedback-triage**（`workers/feedback.ts` 由来）: few-shot を CONFIG_KV（`config:fewshot`）から読み、`SYSTEM_PROMPT`+few-shot を `env.AI.run(<model>, { messages, response_format: json })` に渡す。出力 JSON を既存正規表現で抽出 → `coerceReport` → `looksLikeSpam` 補正 → GitHub Issue 作成（`OCTOKIT_PAT`）→ Discord 通知。**`coerceReport`/`looksLikeSpam`/Issue・Discord 生成ロジックは流用**、AI 呼び出しのみ差替え。Queues は orderingKey 非対応（reporterUid 単位順序は喪失するがトリアージでは許容）。

### Cron（scheduled ハンドラ、`0 * * * *`）

- App Store / Google Play レビュー通知を `Promise.allSettled` で実行。状態は KV `state:appstore-reviews` / `state:googleplay-reviews`（GCS から移行）。
- **App Store**（`workers/appStoreReviewNotifier.ts`）: `parseAppStoreJson`/`postToDiscord` 流用、状態のみ KV 化。
- **Google Play**（`workers/googlePlayReviews.ts`）: `@googleapis/androidpublisher` SDK を廃し REST（`GET https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{packageName}/reviews?maxResults=100&token=…`、Bearer は SA JWT で発行）にページング置換。`toPlayReviews`/`tsToIso`/`postToDiscord` 流用。
- `REVIEWS_DEBUG/DRY_RUN/FORCE_LATEST_COUNT` 等のデバッグ変数踏襲。

### Google OAuth トークン（lib/google/accessToken.ts）

Android Publisher 専用。`env.GOOGLE_SA_KEY`(SA JSON) の `private_key`(PKCS8) を `crypto.subtle.importKey` で読み RS256 で JWT 署名 → `https://oauth2.googleapis.com/token`（`jwt-bearer`、scope=`androidpublisher`）で access_token 取得 → isolate 内キャッシュ。

### ディレクトリ構成（functions/ を置換）

```text
functions/
  wrangler.jsonc            # bindings / env(dev,production) / cron
  tsconfig.json             # module=esnext, types=@cloudflare/workers-types
  package.json              # firebase 系撤去 → wrangler 系
  biome.json                # 維持
  src/
    index.ts                # fetch/queue/scheduled ディスパッチ
    lib/callable.ts         # {data} 読取・{result}/{error} 整形
    lib/auth/session.ts     # セッション JWT 発行・検証(HS256)
    lib/azure/tts.ts        # Azure Speech 合成
    lib/google/accessToken.ts # SA JWT → OAuth(androidpublisher)
    routes/{tts,feedback,uploadImage,config}.ts
    consumers/feedbackTriage.ts            # tts-cache は廃止。TTS は /tts から直接書込
    scheduled/{appStoreReviews,googlePlayReviews}.ts
    models/{ai,common,feedback}.ts   # ほぼ無変更で流用
    utils/{normalize,removeMacron,ttsVoice}.ts  # 流用(ttsVoice は Azure 向け微調整)
```

### wrangler.jsonc（bindings）

- **KV**: `TTS_KV`（`voice:*` / `config:tts`）、`CONFIG_KV`（`config:maintenance` / `config:remote`）、`STATE_KV`（`state:*`）
- **R2**: `TTS_BUCKET`（音声バイナリ）、`UPLOAD_BUCKET`（`report-images/*`、公開ドメイン必要 → `imageUrl` 用）。few-shot は CONFIG_KV `config:fewshot` に配置
- **Queues**: producers/consumers = `feedback-triage`（tts-cache は廃止。TTS キャッシュは `/tts` から R2+KV へ直接書込）
- **AI**: `AI`（Workers AI）
- **Cron**: `["0 * * * *"]`
- **vars（非機密）**: `GOOGLE_PLAY_PACKAGE_NAME`, `AZURE_SPEECH_REGION`, AI model 名, 既定 Azure voice 名(ja/en), few-shot 制御値, `UPLOAD_PUBLIC_BASE_URL`
- **secrets（`wrangler secret put`）**: `SESSION_JWT_SECRET`, `AZURE_SPEECH_KEY`, `GOOGLE_SA_KEY`(Android Publisher 専用), `OCTOKIT_PAT`, `DISCORD_CS_WEBHOOK_URL`, `DISCORD_CRASH_WEBHOOK_URL`, `DISCORD_REVIEW_WEBHOOK_URL`
- **`compatibility_flags: ["nodejs_compat"]`**（Buffer/base64 流用）
- **`[env.dev]` / `[env.production]`**: KV id・バケット名・package 名等を分離

### package.json / tsconfig / テスト / CLI

- 依存撤去: `firebase-admin`, `firebase-functions`, `@google-cloud/*`, `@googleapis/androidpublisher`, `google-auth-library`, `firebase-functions-test`。追加: `wrangler`, `@cloudflare/workers-types`（dayjs/biome/jest/ts-jest/tsx 維持）。
- scripts: `dev`(`wrangler dev`)/`deploy:dev`/`deploy:prod`(`wrangler deploy --env`)/`tail`/`typecheck`(`tsc --noEmit`)/`lint`/`format`/`test`。firebase 系 script 撤去。
- tsconfig: `module=esnext`, `moduleResolution=bundler`, `types=["@cloudflare/workers-types"]`, WebWorker lib、`outDir/lib` 廃止（wrangler が esbuild バンドル）。
- テスト: 純粋関数テスト（`normalize.test.ts`, `ttsVoice.test.ts`, `coerceReport`, `parseAppStoreJson`, `toPlayReviews`/`tsToIso`）は対象関数を export 継続し **jest のまま流用**。ランタイム結合は `wrangler dev` で確認。
- CLI（`find-tts-cache`/`find-orphaned-tts`）: Firestore+GCS 前提 → R2(list)+KV(list) ベースへ書き換え（`wrangler kv` / `wrangler r2` or S3 互換 API）。本体より優先度低、別コミット。

---

## Phase 2: アプリ脱 Firebase（src/）

### 認証（最重要）

- 新規 `src/lib/installId.ts`: `expo-secure-store` に UUID を生成・永続化（無ければ生成）。
- 新規 `src/lib/session.ts`: `/auth/token` を叩き JWT を取得・メモリ/SecureStore キャッシュ（exp 手前で再取得）。`getSessionToken()` を提供。
- `src/hooks/useAnonymousUser.ts` / `useCachedAnonymousUser.ts` / `store/atoms/auth.ts`: Firebase Auth を撤去し、`uid = installId` を返す形に置換（型 `FirebaseAuthTypes.User` を自前型へ）。
- `src/hooks/useTTS.ts`（行 309/372）・`useFeedback.ts`（行 96）: `getIdToken(user)` → `getSessionToken()` に置換。`reporterUid: user.uid` → `installId`。
- `src/utils/ttsSpeechFetcher.ts`: 仕様不変（`idToken` 引数名は `token` 等にリネーム、Bearer 値がセッション JWT になるだけ）。callable 形式の送受信は維持。

### データ / 設定 / ストレージ

- `src/hooks/useUnderMaintenance.ts`: Firestore 単発読み → `GET /config/maintenance` の fetch に置換（リアルタイム未使用なので等価）。
- `src/lib/remoteConfig.ts`: Firebase Remote Config → 起動時に `GET /config/remote` を取得しモジュールキャッシュに格納する実装へ置換。**公開 API（`setupRemoteConfig`/`getMaxPermitAccuracy`/`isForceNotArrivedOnLowAccuracyEnabled`/`resetRemoteConfigCache`）のシグネチャは維持**し、呼び出し側（`useRefreshStation`/`handleTrackingLocation`/`accuracyChart`/`DevOverlay`）は無改修。フォールバック既定（`MAX_PERMIT_ACCURACY=1500`・force=true）も踏襲。
- `src/hooks/useFeedback.ts`（行 86-107）: Firebase Storage アップロード → `POST /feedback/upload-image`（PNG）→ 返却 URL を `report.imageUrl` に格納する流れへ置換。後段の `/postFeedback` 送信は callable 形式のまま。

### 依存 / 設定の除去

- `package.json` から `@react-native-firebase/{app,auth,firestore,storage,remote-config,analytics}` を撤去（analytics はコード未使用なので即可）。`expo-secure-store` 追加（未導入なら）。
- TTS/feedback の API URL env（`*_TTS_API_URL` / `*_FEEDBACK_API_URL`）を Worker のルートへ向け替え。`/config/*`・`/auth/token` の base URL env を追加。
- テスト: `useTTS.test.ts` / `useFeedback`（あれば）/ `remoteConfig.test.ts` の Firebase モックを新実装向けに更新。`src/setupTests.ts` の Firebase モックも整理。

---

## Phase 3: 旧 Firebase 資源の撤去

- `firebase.json` 削除（`perf_auto_collection_enabled` ごと不要化）。
- `android/app/src/**/google-services.json` / iOS `GoogleService-Info.plist` 撤去、`app.json`/`app.config.*` の `@react-native-firebase` プラグイン設定除去、`npx expo prebuild --clean` で native 再生成。
- 旧 Cloud Functions の停止・削除、Firestore/GCS/PubSub/Vertex の停止。Firebase Auth ユーザーは匿名のため移行不要（installId が新規 ID 体系）。
- `AGENTS.md` の Repository Map「`functions/`: Firebase Cloud Functions」→「Cloudflare Workers」、`functions/README.md` を Cloudflare 版へ全面改訂。`docs/changelog.md` に移行記録。

---

## 検証手順

### Phase 1（Worker 単体）

1. `cd functions && npm run lint && npm run typecheck && npm test`（純粋関数テスト緑）
2. `wrangler dev`:
   - `POST /auth/token`（`{installId}`）→ JWT 取得
   - `POST /tts`（Bearer JWT + `{data:{ssmlJa,ssmlEn}}`）→ Azure 合成され `{result:{id,…,jaAudioMimeType:'audio/mpeg'}}`。base64 を MP3 再生確認。2 回目で KV/R2 キャッシュヒット
   - 無効/欠落トークンで 401、空 `ssmlJa` で 400
   - `POST /feedback/upload-image`（PNG）→ 公開 URL がブラウザで開ける
   - `GET /config/maintenance` / `GET /config/remote` が KV 値を返す
   - `POST /postFeedback` → consumer で Issue/Discord（テスト webhook）
3. `wrangler dev --test-scheduled` → `/__scheduled` でレビュー通知（`REVIEWS_DRY_RUN=1`）
4. `wrangler deploy --env dev` で dev へ

### Phase 2（アプリ）

5. ルートに `npm run lint && npm test && npm run typecheck`
6. dev ビルドで E2E: 起動 → installId 生成 → セッション JWT 取得 → TTS 再生（Azure ボイス確認）・フィードバック送信（画像 R2 公開 URL が Issue/Discord に出る）・メンテナンス画面表示・GPS しきい値が `/config/remote` 値で効く

---

## 回帰リスクと緩和

- **認証方式の刷新**: Firebase 匿名 ID から installId へ。既存ユーザーの reporterUid は不連続になる（過去フィードバックとの突合不可）。匿名認証同等の弱い anti-abuse は維持（必要なら後日 App Attest/Play Integrity を `/auth/token` に追加可能な構造）。SecureStore 喪失（再インストール）で ID が変わる点は匿名 Auth と同等挙動。
- **TTS エンジン変更（Azure）**: 声質・話速・発音・SSML 拡張タグ互換が変わる。`<say-as>`/`<sub>`/`<break>` を実 SSML で確認。既定ボイス名・リージョン・料金の最終確定が必要。
- **音声キャッシュ全件再生成**: 新ストア（KV/R2）かつエンジン変更で初回ミス増。id ハッシュは不変なので運用で温まる。
- **Remote Config 配信遅延**: 起動時 1 回フェッチ + キャッシュのため、Firebase の `minimumFetchIntervalMillis=1h` と同等の鮮度。フォールバック既定を必ず維持し、`/config/remote` 不達でも GPS ロジックを止めない。
- **画像公開 URL**: R2 公開ドメイン設定が前提（Issue/Discord から閲覧）。未設定だと imageUrl が開けない。
- **キュー順序喪失**（前述、許容）。
- **大規模・多フェーズ**: 環境ごとに Phase 1→2 を揃えてカットオーバー。途中状態で旧 functions と Worker が二重稼働する期間があるため、切替タイミングを PR に明記。
