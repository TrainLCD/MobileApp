import { type Voice, VoiceQuality } from 'expo-speech';

// OS ネイティブ TTS の音声を言語ごとに品質で選ぶためのユーティリティ。
//
// iOS は voice 未指定だとコンパクト版（機械的な音質）が既定になりがちなため、
// 端末にインストール済みの拡張（Enhanced）/ プレミアム（Premium）音声があれば
// それを明示指定して音質を引き上げる。
//
// Android は音声の明示指定が品質改善に加えて言語選択の正しさにも必要になる。
// expo-speech の Android 実装は speak の language を `Locale(tag)` にそのまま渡す
// ため、'en-US' のような地域付きタグは不正な Locale となり端末既定言語へ
// フォールバックする（日本語端末では英語文が日本語音声で合成される）。
// voice を明示指定すれば setVoice が言語設定を上書きするため、この不備の影響を
// 受けない。そのため Android では高品質音声が無くても既定品質のローカル音声を
// 返せるよう allowDefaultQuality オプションを用意している。
//
// 注意: expo-speech の iOS 実装は AVSpeechSynthesisVoiceQuality.premium を
// "Default" として報告する（native 側が enhanced 以外を一律 Default に落とす）ため、
// quality フィールドだけでは Premium 音声を検出できない。iOS の音声識別子は
// `com.apple.voice.premium.ja-JP.Kyoko` / `com.apple.ttsbundle.Kyoko-premium` の
// ように品質を含む命名になっているので、識別子でも判定して補完する。

const normalizeLanguageTag = (tag: string): string =>
  tag.toLowerCase().replace(/_/g, '-');

// 品質スコア。premium > enhanced > その他。
export const scoreVoiceQuality = (voice: Voice): number => {
  const id = (voice.identifier ?? '').toLowerCase();
  if (id.includes('premium')) {
    return 3;
  }
  if (voice.quality === VoiceQuality.Enhanced || id.includes('enhanced')) {
    return 2;
  }
  return 1;
};

export interface SelectBestVoiceOptions {
  // premium / enhanced が見つからない場合にも既定品質のローカル音声を返す。
  // Android では voice 未指定だと言語フォールバック不備の影響を受けるため
  // true を指定して必ず明示指定する。iOS は false のままにして、ユーザーが
  // OS 設定で選んだ既定音声を尊重する（コンパクト版同士で上書きしない）。
  allowDefaultQuality?: boolean;
}

// 指定言語で最高品質の音声識別子を返す。条件を満たす音声が無い場合は
// undefined を返してシステム既定に任せる。
export const selectBestVoiceIdentifier = (
  voices: Voice[],
  language: string,
  options?: SelectBestVoiceOptions
): string | undefined => {
  const target = normalizeLanguageTag(language);
  const minScore = options?.allowDefaultQuality ? 1 : 2;
  const best = voices
    .filter((v) => normalizeLanguageTag(v.language ?? '') === target)
    // Android の '-network' 音声はネットワーク接続必須のため除外する。
    // 乗車中はトンネル等で接続が切れやすく、読み上げが無音で失敗しうる。
    .filter((v) => !(v.identifier ?? '').toLowerCase().includes('network'))
    .filter((v) => scoreVoiceQuality(v) >= minScore)
    // 同スコア間は識別子順で決定的に選ぶ（実行ごとに音声が変わらないように）
    .sort(
      (a, b) =>
        scoreVoiceQuality(b) - scoreVoiceQuality(a) ||
        (a.identifier ?? '').localeCompare(b.identifier ?? '')
    )
    .at(0);
  return best?.identifier;
};
