// リモート TTS (Worker の /tts 経由で Google Cloud Text-to-Speech を利用) の既定値。
// リモート合成を使うかどうかは Remote Config (remote_tts_enabled_ios /
// remote_tts_enabled_android) が決めるため、端末内蔵 TTS (expo-speech) で読み上げる
// 構成では参照されない。

// 車内放送に使う女性声。Cloud TTS のボイス名は `<言語>-<地域>-<系統>-<記号>` で
// ロケールを含むため、多言語共通のプリセットは無く日英で別々に指定する。系統は
// 端末内蔵 TTS と同水準の Standard で揃える (Studio・Chirp3-HD 等は単価が桁違いで
// Worker 側の許可リストにも入っていない)。
export const REMOTE_TTS_VOICE_JA = 'ja-JP-Standard-B';
export const REMOTE_TTS_VOICE_EN = 'en-US-Standard-G';

// 読み上げ速度・声の高さは Worker の TTS_SPEED / TTS_PITCH で決まる。Standard 系は
// 読み方のプロンプト指示を受け付けないため、アプリから調整する手段は無い。

// Worker(/tts) が受け付ける読み上げテキストの上限(UTF-8 バイト)。超過すると
// 400 で弾かれて無用なフォールバックを招くため、送信前に切り詰める。
// Worker 側の TEXT_BYTE_LIMIT と一致させること。通常のアナウンス文は達しない。
export const REMOTE_TTS_MAX_INPUT_BYTES = 4000;
