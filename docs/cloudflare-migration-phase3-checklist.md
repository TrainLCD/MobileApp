# Cloudflare 移行 Phase 3 — 手動作業チェックリスト

Phase 1（Worker バックエンド）と Phase 2（アプリ脱 Firebase）はコード上完了済み。
本書はコードで自動化できない、お手元の環境・コンソールでの作業をまとめる。

## 1. ネイティブ再生成（必須）

`@react-native-firebase/*` は撤去済み。コミット済みの `android/` `ios/` には旧 Firebase の
配線（gradle プラグイン・Pods）が残るため、CNG で再生成して整合させる。

```bash
npx expo prebuild --clean
cd ios && pod install && cd ..
```

- `android/app/build.gradle` / `android/build.gradle` の google-services 参照はコード側で除去済み。
  prebuild 後も含まれないことを確認する。
- `ios/TrainLCD.xcodeproj/project.pbxproj` の Firebase Pods 参照は `pod install` で解消される。
- ローカルに残る `google-services.json` / `GoogleService-Info.plist`（未追跡）は不要なので削除してよい。

再生成後の確認:

```bash
npm run lint && npm test && npm run typecheck
npm run android   # 起動確認
npm run ios        # 起動確認
```

## 2. デプロイ設定（必須）

### Worker（functions/）

```bash
cd functions
# KV / R2 / Queue を作成し wrangler.jsonc の id・bucket 名を差し替え（dev/prod 両方）
wrangler kv namespace create TTS_KV       # 他 CONFIG_KV / STATE_KV も
wrangler r2 bucket create trainlcd-tts-dev # 他 uploads も
wrangler queues create feedback-triage-dev # TTS キャッシュはキューを使わず /tts から R2+KV へ直接書き込み
# シークレット投入
wrangler secret put SESSION_JWT_SECRET
wrangler secret put AZURE_SPEECH_KEY
wrangler secret put GOOGLE_PLAY_SA_KEY
wrangler secret put OCTOKIT_PAT
wrangler secret put DISCORD_CS_WEBHOOK_URL
wrangler secret put DISCORD_CRASH_WEBHOOK_URL
wrangler secret put DISCORD_REVIEW_WEBHOOK_URL
# 数値しきい値の初期投入（KV）。wrangler v4 は既定でローカルエミュレータを操作するため、実 KV には --remote が必須
wrangler kv key put --binding CONFIG_KV 'config:remote' '{"max_permit_accuracy":1500,"force_not_arrived_on_low_accuracy":true}' --remote
wrangler kv key put --binding CONFIG_KV 'config:maintenance' '{"underMaintenance":false}' --remote
# few-shot を CONFIG_KV に配置
wrangler kv key put --binding CONFIG_KV "config:fewshot" --path fewshot.jsonl --remote
# デプロイ
npm run deploy:dev      # / npm run deploy:prod
```

- R2 アップロード用バケットに公開ドメインを設定し、`UPLOAD_PUBLIC_BASE_URL` を一致させる。
- Azure Speech のリソースを作成し、リージョン（`AZURE_SPEECH_REGION`）とキーを設定。

### アプリ（.env）

- `DEV_WORKER_API_URL` / `PRODUCTION_WORKER_API_URL` … Worker のベース URL
- `DEV_TTS_API_URL` / `PRODUCTION_TTS_API_URL` … Worker の `/tts`
- `DEV_FEEDBACK_API_URL` / `PRODUCTION_FEEDBACK_API_URL` … Worker の `/postFeedback`

## 3. 疎通検証

```bash
cd functions && wrangler dev
# POST /auth/token → /tts（Bearer JWT）でキャッシュ往復、/postFeedback、/feedback/upload-image、/config/* を確認
wrangler dev --test-scheduled   # レビュー通知（REVIEWS_DRY_RUN=1）
```

実機 dev ビルドで: TTS 再生（Azure ボイス）、フィードバック送信（画像が Issue/Discord に出る）、
メンテナンス画面、GPS しきい値が `/config/remote` 値で効くことを確認。

## 4. 旧資源の撤去（切替完了後）

- 旧 Cloud Functions（tts / postFeedback / ttsCachePubSub / feedbackTriageWorker / レビュー通知）の停止・削除
- Firestore / GCS バケット / Pub/Sub トピック / Vertex AI の停止
- Firebase Auth は匿名のため移行不要（installId が新 ID 体系）。プロジェクト自体は他用途がなければ整理
- メンテ用 CLI（旧 find-tts-cache / find-orphaned-tts）の R2+KV 版を別途用意
