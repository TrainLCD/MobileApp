import AudioFocus from '../../modules/audio-focus';

// 端末内蔵 TTS (expo-speech) で読み上げる間だけ、他アプリ音声をダッキングさせるための
// オーディオフォーカス制御。Android の TextToSpeech はフォーカスを自分では要求せず、
// expo-audio の setAudioModeAsync も値を保持するだけでフォーカス要求を伴わないため、
// この経路では明示的に取得しないとダッキングが一切起こらない。
// ネイティブモジュールは Android でのみ autolink されるので、iOS・web では何もしない。

export const acquireSpeechAudioFocus = (): void => {
  try {
    AudioFocus?.requestTransientMayDuck();
  } catch (e) {
    console.warn('[speechAudioFocus] failed to request audio focus:', e);
  }
};

export const releaseSpeechAudioFocus = (): void => {
  try {
    AudioFocus?.abandon();
  } catch (e) {
    console.warn('[speechAudioFocus] failed to abandon audio focus:', e);
  }
};
