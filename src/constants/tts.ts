// iOS のリモート TTS (Worker の /tts 経由で OpenAI gpt-4o-mini-tts を利用) の既定値。
// Android は端末内蔵の TTS (expo-speech) を使い続けるため、これらは参照されない。

// 合成に使うモデル。Worker 側が別モデルへ切り替える場合もリクエストで明示するため、
// アプリ側の期待するモデルをここで固定する。
export const REMOTE_TTS_MODEL = 'gpt-4o-mini-tts';

// 車内放送に使う女性声。gpt-4o-mini-tts の音声は多言語対応のため、日英で同一の
// 声を指定して一人のアナウンサーが読み上げている印象を保つ。
export const REMOTE_TTS_VOICE = 'nova';

// gpt-4o-mini-tts は SSML を解釈せず、代わりに instructions で読み方を指示する。
// 駅名・路線名の固有名詞が続くため、速度と間の取り方を明示して聞き取りやすくする。
export const REMOTE_TTS_INSTRUCTIONS_JA =
  '鉄道の車内自動放送のアナウンサーとして、落ち着いた丁寧な女性の声で読み上げてください。' +
  '一定の速さを保ち、句読点では短く間を取ります。駅名や路線名は一語ずつ明瞭に発音し、' +
  '感情を込めすぎず、事務的で聞き取りやすい調子にしてください。';

export const REMOTE_TTS_INSTRUCTIONS_EN =
  'Read this as an automated train announcement in a calm, polite female voice. ' +
  'Keep a steady pace, pause briefly at commas, and pronounce station and line names ' +
  'clearly. Stay neutral and business-like rather than expressive.';

// Worker(/tts) が受け付ける読み上げテキストの上限(UTF-8 バイト)。超過すると
// 400 で弾かれて無用なフォールバックを招くため、送信前に切り詰める。
// Worker 側の TEXT_BYTE_LIMIT と一致させること。通常のアナウンス文は達しない。
export const REMOTE_TTS_MAX_INPUT_BYTES = 4000;
