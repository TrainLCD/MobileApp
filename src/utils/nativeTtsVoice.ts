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
// また対象言語の音声データが端末に無い場合も setLanguage が LANG_MISSING_DATA
// となり同じフォールバックが起きる。voice を明示指定すれば setVoice が言語設定を
// 上書きするため、これらの不備の影響を受けない。そのため Android では高品質
// 音声が無くても既定品質のローカル音声を返せるよう allowDefaultQuality
// オプションを用意し、地域違い（en-GB 等）やネットワーク必須音声も
// フォールバック候補に含める。
//
// 注意: expo-speech の iOS 実装は AVSpeechSynthesisVoiceQuality.premium を
// "Default" として報告する（native 側が enhanced 以外を一律 Default に落とす）ため、
// quality フィールドだけでは Premium 音声を検出できない。iOS の音声識別子は
// `com.apple.voice.premium.ja-JP.Kyoko` / `com.apple.ttsbundle.Kyoko-premium` の
// ように品質を含む命名になっているので、識別子でも判定して補完する。

const normalizeLanguageTag = (tag: string): string =>
  tag.toLowerCase().replace(/_/g, '-');

const primarySubtag = (tag: string): string =>
  normalizeLanguageTag(tag).split('-')[0] ?? '';

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
  // premium / enhanced が見つからない場合にも既定品質の音声を返す。
  // Android では voice 未指定だと言語フォールバック不備の影響を受けるため
  // true を指定して必ず明示指定する。iOS は false のままにして、ユーザーが
  // OS 設定で選んだ既定音声を尊重する（コンパクト版同士で上書きしない）。
  allowDefaultQuality?: boolean;
}

// Android の '-network' 音声はネットワーク接続必須。乗車中はトンネル等で接続が
// 切れやすく読み上げが失敗しうるため、ローカル音声を優先し最後の手段としてのみ使う。
const isNetworkVoice = (voice: Voice): boolean =>
  (voice.identifier ?? '').toLowerCase().includes('network');

// 指定言語で最適な音声識別子を返す。地域まで一致する音声を優先しつつ、
// 無ければ同一言語の別地域（en-US が無い端末の en-GB 等）も候補にする。
// 条件を満たす音声が無い場合は undefined を返してシステム既定に任せる。
export const selectBestVoiceIdentifier = (
  voices: Voice[],
  language: string,
  options?: SelectBestVoiceOptions
): string | undefined => {
  const target = normalizeLanguageTag(language);
  const targetPrimary = primarySubtag(language);
  const minScore = options?.allowDefaultQuality ? 1 : 2;
  const isExactRegion = (v: Voice) =>
    normalizeLanguageTag(v.language ?? '') === target;

  const best = voices
    .filter((v) => primarySubtag(v.language ?? '') === targetPrimary)
    .filter((v) => scoreVoiceQuality(v) >= minScore)
    // ローカル > 地域一致 > 品質 の優先順。同点は識別子順で決定的に選ぶ
    // （実行ごとに音声が変わらないように）
    .sort(
      (a, b) =>
        Number(isNetworkVoice(a)) - Number(isNetworkVoice(b)) ||
        Number(isExactRegion(b)) - Number(isExactRegion(a)) ||
        scoreVoiceQuality(b) - scoreVoiceQuality(a) ||
        (a.identifier ?? '').localeCompare(b.identifier ?? '')
    )
    .at(0);
  return best?.identifier;
};
