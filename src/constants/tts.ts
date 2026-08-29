import {
  TTS_SPEED_PREFERENCE,
  type TTSSpeedPreference,
} from '~/models/TTSSpeed';

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

// 声の高さは Worker の TTS_PITCH で決まる。Standard 系は読み方のプロンプト指示を
// 受け付けないため、アプリから調整する手段は無い。

// 読み上げ速度(Cloud TTS の speakingRate)。アナウンス設定で選んだ値をリクエストに
// 乗せる。Worker 側は許可リスト方式でこの3値だけを受け付け、範囲外・未指定のときは
// Worker の TTS_SPEED へフォールバックするため、値を変えるときは functions 側の
// ALLOWED_CLIENT_SPEEDS と必ず一致させること。
export const REMOTE_TTS_SPEED_RATES: Record<TTSSpeedPreference, number> = {
  [TTS_SPEED_PREFERENCE.SLOW]: 0.85,
  [TTS_SPEED_PREFERENCE.NORMAL]: 1.0,
  [TTS_SPEED_PREFERENCE.FAST]: 1.15,
};

// Worker(/tts) が受け付ける読み上げテキストの上限(UTF-8 バイト)。超過すると
// 400 で弾かれて無用なフォールバックを招くため、送信前に切り詰める。
// Worker 側の TEXT_BYTE_LIMIT と一致させること。通常のアナウンス文は達しない。
export const REMOTE_TTS_MAX_INPUT_BYTES = 4000;
