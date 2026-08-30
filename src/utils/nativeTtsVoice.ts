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
// Android のローカル音声は Google TTS の日本語のように quality が軒並み
// QUALITY_NORMAL へ並ぶため、expo-speech が返す 2 値の quality だけでは優劣を
// 判定できず、識別子のアルファベット順という無根拠なタイブレークで音声が決まって
// しまう（'ja-jp-x-htm-local' が常に勝ち、ユーザーが端末設定で選んだ音声も無視
// される）。そのため expo-speech の Android 実装へ patch を当てて生の
// Voice メタデータ（qualityScore / isDefault / networkRequired / notInstalled）
// を受け取り、それらを優先順の判断材料にする。iOS ではこれらのフィールドは
// 返らないため、従来どおり識別子と quality で判定する。
//
// 注意: expo-speech の iOS 実装は AVSpeechSynthesisVoiceQuality.premium を
// "Default" として報告する（native 側が enhanced 以外を一律 Default に落とす）ため、
// quality フィールドだけでは Premium 音声を検出できない。iOS の音声識別子は
// `com.apple.voice.premium.ja-JP.Kyoko` / `com.apple.ttsbundle.Kyoko-premium` の
// ように品質を含む命名になっているので、識別子でも判定して補完する。

// expo-speech の Voice 型は Android patch で追加したフィールドを含まないため、
// アプリ側で拡張して扱う。iOS ではいずれも返らないので optional にしている。
export type NativeVoice = Voice & {
  // android.speech.tts.Voice.getQuality() の生値 (VERY_LOW=100 〜 VERY_HIGH=500)
  qualityScore?: number;
  // 端末設定で選ばれているエンジン既定音声か
  isDefault?: boolean;
  // 合成にネットワーク接続が必要か
  networkRequired?: boolean;
  // 音声データが未ダウンロードで、指定しても合成できない状態か
  notInstalled?: boolean;
};

const normalizeLanguageTag = (tag: string): string =>
  tag.toLowerCase().replace(/_/g, '-');

const primarySubtag = (tag: string): string =>
  normalizeLanguageTag(tag).split('-')[0] ?? '';

// 品質スコア。premium > enhanced > その他。
export const scoreVoiceQuality = (voice: NativeVoice): number => {
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
// patch 済みの Android は Voice.isNetworkConnectionRequired() を返すのでそれを使い、
// 返らない環境では従来どおり識別子の 'network' で判定する。
const isNetworkVoice = (voice: NativeVoice): boolean =>
  voice.networkRequired ??
  (voice.identifier ?? '').toLowerCase().includes('network');

// 音声データ未ダウンロードの音声は指定しても合成できない。候補が他に無いときの
// 保険として残したいので、除外はせず優先順の最劣後へ回す。
const isNotInstalledVoice = (voice: NativeVoice): boolean =>
  voice.notInstalled === true;

// Android の生の品質値。iOS では返らないため、その場合は同点として扱い
// 後続の識別子ベースの品質判定へ委ねる。
const nativeQualityScore = (voice: NativeVoice): number =>
  voice.qualityScore ?? 0;

// 端末設定で選ばれているエンジン既定音声か。ユーザーの明示的な選択なので、
// 同じ地域の候補が並んだときは機械的な優劣より優先する。
const isDefaultVoice = (voice: NativeVoice): boolean =>
  voice.isDefault === true;

// 指定言語で最適な音声識別子を返す。地域まで一致する音声を優先しつつ、
// 無ければ同一言語の別地域（en-US が無い端末の en-GB 等）も候補にする。
// 条件を満たす音声が無い場合は undefined を返してシステム既定に任せる。
export const selectBestVoiceIdentifier = (
  voices: NativeVoice[],
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
    // インストール済み > ローカル > 地域一致 > 端末既定 > 品質 の優先順。
    // 最後まで差がつかない場合のみ識別子順で決定的に選ぶ（実行ごとに音声が
    // 変わらないように）。識別子順は品質と無関係なので、その手前で判断材料を
    // 出し切るのが狙い。
    .sort(
      (a, b) =>
        Number(isNotInstalledVoice(a)) - Number(isNotInstalledVoice(b)) ||
        Number(isNetworkVoice(a)) - Number(isNetworkVoice(b)) ||
        Number(isExactRegion(b)) - Number(isExactRegion(a)) ||
        Number(isDefaultVoice(b)) - Number(isDefaultVoice(a)) ||
        nativeQualityScore(b) - nativeQualityScore(a) ||
        scoreVoiceQuality(b) - scoreVoiceQuality(a) ||
        (a.identifier ?? '').localeCompare(b.identifier ?? '')
    )
    .at(0);
  return best?.identifier;
};
