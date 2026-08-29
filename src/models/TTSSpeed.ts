/**
 * リモートTTS(Worker の /tts 経由 Google Cloud TTS)の読み上げ速度設定。
 * 端末内蔵TTS(expo-speech)は端末側の読み上げ速度設定に従うため、この設定の対象外。
 */
export const TTS_SPEED_PREFERENCE = {
  SLOW: 'SLOW',
  NORMAL: 'NORMAL',
  FAST: 'FAST',
} as const;

export type TTSSpeedPreference =
  (typeof TTS_SPEED_PREFERENCE)[keyof typeof TTS_SPEED_PREFERENCE];

export const isTTSSpeedPreference = (
  value: unknown
): value is TTSSpeedPreference =>
  typeof value === 'string' &&
  Object.values(TTS_SPEED_PREFERENCE).includes(value as TTSSpeedPreference);
