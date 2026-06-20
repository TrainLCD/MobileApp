/**
 * Worker のバインディング・環境変数・シークレットの型定義。
 * wrangler.jsonc の bindings / vars と一致させること。
 */
export interface Env {
  // --- Bindings ---
  AI: Ai;
  TTS_KV: KVNamespace;
  CONFIG_KV: KVNamespace;
  STATE_KV: KVNamespace;
  TTS_BUCKET: R2Bucket;
  UPLOAD_BUCKET: R2Bucket;
  FEEDBACK_QUEUE: Queue<FeedbackQueueMessage>;

  // --- Vars（非機密。wrangler.jsonc の vars） ---
  GOOGLE_PLAY_PACKAGE_NAME: string;
  AZURE_SPEECH_REGION: string;
  AI_TRIAGE_MODEL: string;
  TTS_JA_VOICE_NAME: string;
  TTS_EN_VOICE_NAME: string;
  SESSION_TOKEN_TTL_SECONDS: string;
  UPLOAD_PUBLIC_BASE_URL: string;
  FEW_SHOT_KV_KEY: string;
  FEW_SHOT_LIMIT: string;
  FEW_SHOT_PER_EX_MAX: string;

  // --- Secrets（wrangler secret put で投入） ---
  SESSION_JWT_SECRET: string;
  AZURE_SPEECH_KEY: string;
  /** Android Publisher 用 Google サービスアカウント鍵 JSON 文字列 */
  GOOGLE_SA_KEY: string;
  OCTOKIT_PAT: string;
  DISCORD_CS_WEBHOOK_URL: string;
  DISCORD_CRASH_WEBHOOK_URL: string;
  DISCORD_REVIEW_WEBHOOK_URL: string;

  // --- Azure TTS チューニング（任意。未設定なら高音質既定のみ適用） ---
  AZURE_TTS_OUTPUT_FORMAT?: string;
  AZURE_TTS_STYLE?: string;
  AZURE_TTS_STYLE_DEGREE?: string;
  AZURE_TTS_PITCH?: string;

  // --- 任意のデバッグ変数（未設定可） ---
  REVIEWS_DEBUG?: string;
  REVIEWS_DRY_RUN?: string;
  REVIEWS_FORCE_LATEST_COUNT?: string;
  APPSTORE_REVIEW_FEED_URL?: string;
}

/** TTS キャッシュ書き込みのペイロード（R2+KV へ直接保存。キューは介さない） */
export interface TtsCachePayload {
  id: string;
  jaAudioContent: string;
  enAudioContent: string;
  jaAudioMimeType: string;
  enAudioMimeType: string;
  ssmlJa: string;
  ssmlEn: string;
  voiceJa: string;
  voiceEn: string;
}

/** feedback-triage キューのメッセージ */
export interface FeedbackQueueMessage {
  id: string;
  receivedAt: string;
  report: import('./models/feedback').Report;
  version: number;
}
