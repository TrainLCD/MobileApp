import { type Voice, VoiceQuality } from 'expo-speech';

// OS ネイティブ TTS の音声を言語ごとに品質で選ぶためのユーティリティ。
//
// iOS は voice 未指定だとコンパクト版（機械的な音質）が既定になりがちなため、
// 端末にインストール済みの拡張（Enhanced）/ プレミアム（Premium）音声があれば
// それを明示指定して音質を引き上げる。
//
// 注意: expo-speech の iOS 実装は AVSpeechSynthesisVoiceQuality.premium を
// "Default" として報告する（native 側が enhanced 以外を一律 Default に落とす）ため、
// quality フィールドだけでは Premium 音声を検出できない。iOS の音声識別子は
// `com.apple.voice.premium.ja-JP.Kyoko` / `com.apple.ttsbundle.Kyoko-premium` の
// ように品質を含む命名になっているので、識別子でも判定して補完する。

const normalizeLanguageTag = (tag: string): string =>
  tag.toLowerCase().replace(/_/g, '-');

// 品質スコア。premium > enhanced > その他（0 は「明示指定に値しない」）。
export const scoreVoiceQuality = (voice: Voice): number => {
  const id = (voice.identifier ?? '').toLowerCase();
  if (id.includes('premium')) {
    return 3;
  }
  if (voice.quality === VoiceQuality.Enhanced || id.includes('enhanced')) {
    return 2;
  }
  return 0;
};

// 指定言語で最高品質の音声識別子を返す。premium / enhanced が見つからない場合は
// undefined を返してシステム既定に任せる（ユーザーが OS 設定で選んだ既定音声を
// 尊重し、コンパクト版同士で無意味に上書きしないため）。
export const selectBestVoiceIdentifier = (
  voices: Voice[],
  language: string
): string | undefined => {
  const target = normalizeLanguageTag(language);
  const best = voices
    .filter((v) => normalizeLanguageTag(v.language ?? '') === target)
    // Android の '-network' 音声はネットワーク接続必須のため除外する。
    // 乗車中はトンネル等で接続が切れやすく、読み上げが無音で失敗しうる。
    .filter((v) => !(v.identifier ?? '').toLowerCase().includes('network'))
    .filter((v) => scoreVoiceQuality(v) > 0)
    // 同スコア間は識別子順で決定的に選ぶ（実行ごとに音声が変わらないように）
    .sort(
      (a, b) =>
        scoreVoiceQuality(b) - scoreVoiceQuality(a) ||
        (a.identifier ?? '').localeCompare(b.identifier ?? '')
    )
    .at(0);
  return best?.identifier;
};
