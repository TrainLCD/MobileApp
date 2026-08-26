import { requireOptionalNativeModule } from 'expo';

/**
 * 端末内蔵 TTS (expo-speech) の発話中だけオーディオフォーカスを保持するための
 * Android 専用ローカルモジュール。詳細な背景は AudioFocusModule.kt を参照。
 */
export type AudioFocusModule = {
  /**
   * AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK を要求し、獲得できたかどうかを返す。
   * 既に保持している場合は何もせず true を返す。
   */
  requestTransientMayDuck(): boolean;
  /** 保持中のフォーカスを返却する。保持していない場合は何もしない。 */
  abandon(): void;
};

// Android 以外のプラットフォームでは autolink されないため null になる。
export default requireOptionalNativeModule<AudioFocusModule>('AudioFocus');
