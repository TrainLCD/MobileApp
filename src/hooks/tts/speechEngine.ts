// 自動アナウンスの読み上げ手段を差し替えられるようにするための共通インターフェース。
// Worker 経由の gpt-4o-mini-tts (useRemoteSpeechEngine) と端末内蔵 TTS
// (useNativeSpeechEngine) のどちらを使うかは Remote Config
// (remote_tts_enabled_ios / remote_tts_enabled_android) が決め、リモートが
// 使えないときは useTTS がその回だけ内蔵 TTS へフォールバックする。

export interface SpeechEngineRequest {
  // テンプレートが生成した SSML 断片。プレーンテキストへの変換はエンジン側で行う。
  ssmlJa: string;
  ssmlEn: string;
  speakJa: boolean;
  speakEn: boolean;
}

export interface SpeechEngineCallbacks {
  // 実際に音声を出し始めた。初回放送フラグの確定に使う。
  onSpeechStarted?: () => void;
  // 発話が完了・失敗して発話パイプラインを解放してよい状態になった。
  // onUnavailable と合わせて、1 回の speak につきどちらか一方だけが 1 度呼ばれる。
  onSettled: () => void;
  // 音声を一切生成できず発話しなかった（リモート取得失敗など）。
  // 未指定のエンジンは代わりに onSettled を呼ぶ。
  onUnavailable?: () => void;
}

export interface SpeechEngine {
  speak: (
    request: SpeechEngineRequest,
    callbacks: SpeechEngineCallbacks
  ) => void;
  // 進行中の発話を中断し、ネイティブ資源を解放する。コールバックは呼ばれない。
  stop: () => void;
}
