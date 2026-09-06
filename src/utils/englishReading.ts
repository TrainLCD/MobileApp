// 英語音声の TTS エンジンが日本語由来の固有名詞を誤読するケースを、読み上げ
// 直前のプレーンテキストに対する表記置換で補正する。旧外部 TTS 向けの
// `<phoneme>` (IPA) は OS ネイティブ TTS (expo-speech) もリモート TTS も解釈
// しないため、エンジンが確実に読める英単語の綴りへ倒すしかない。
// 表示用テキストには適用しないこと (TTS 生成時専用)。

type EnglishReadingRule = {
  // 置換対象。ASCII 英字の単語境界 (`\b`) で囲み、`Keisei-Ueno` のような
  // ハイフン連結の駅名でも語単位で一致させる。
  pattern: RegExp;
  reading: string;
};

// NOTE: 読み替え先は必ず英語の辞書語 (か、辞書語のハイフン連結) にする。
// 未知語の綴りを与えると G2P の推定に戻ってしまい、エンジンごとに結果がぶれる。
const ENGLISH_READING_RULES: readonly EnglishReadingRule[] = [
  // 「Keisei (京成)」は英語 TTS が "ei" を /aɪ/ と推定して「かいせい」と読む
  // ため、英単語 "Kay" + "say" で /keɪ.seɪ/ (けいせい) を確定させる。
  { pattern: /\bKeisei\b/gi, reading: 'Kay-say' },
];

/**
 * 英語の読み上げ用テキスト内の固有名詞を、TTS エンジンが正しく読める表記へ置換する。
 */
export const fixEnglishReading = (text: string): string =>
  ENGLISH_READING_RULES.reduce(
    (acc, { pattern, reading }) => acc.replace(pattern, reading),
    text
  );
