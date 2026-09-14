// 自動アナウンスの読み上げ手段を差し替えられるようにするための共通インターフェース。
// Worker 経由の Google Cloud TTS (useRemoteSpeechEngine) と端末内合成のどちらを使うかは
// Remote Config (remote_tts_enabled_ios / remote_tts_enabled_android) が決め、リモートが
// 使えないときは useTTS がその回だけ端末内で読む。端末内の経路は言語ごとに分かれ、
// 日本語は useVoicevoxSpeechEngine、英語は useVitsSpeechEngine が担い、どちらも使えない
// 言語は useNativeSpeechEngine (端末内蔵 TTS) が読む。詳細は
// docs/spec/tts/on-device-tts-ios.md を参照。

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
