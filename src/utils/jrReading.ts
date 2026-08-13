// OS ネイティブ TTS は「JR」を英語の略記 "Jr." と解釈し、日本語音声でも
// 「ジュニア」と読み上げてしまう (例: 「JR神戸線」→「ジュニアこうべせん」)。
// 路線名・会社名は API 由来のため表記そのものは変えられず、また画面表示は
// 「JR」のままにしたいので、読み上げ直前のプレーンテキストに対してのみ
// 読み方が確定する表記へ置換する。

// 日本語音声向け。カタカナへ倒して「ジェーアール」と読ませる。
const JR_READING_JA = 'ジェーアール';
// 英語音声向け。ハイフンで区切ることで単語 ("Junior") ではなく
// アルファベット 1 文字ずつ ("jay are") として読ませる。
const JR_READING_EN = 'J-R';

// 半角・全角の「JR」。大文字のみを対象にし、`Jr` のような通常の略記
// (人名の Junior など) は誤置換しない。
const JR_REGEXP = /JR|ＪＲ/g;

// 「JR」の前後がこの文字種なら別語の一部とみなして置換しない
// (例: 架空の識別子 `AJRB` / `JR2` を壊さないための保険)。
const ALPHANUMERIC_REGEXP = /[0-9A-Za-z０-９Ａ-Ｚａ-ｚ]/;

/**
 * 読み上げ用テキスト内の「JR」を、TTS エンジンが正しく読める表記へ置換する。
 * 表示用テキストには適用しないこと (TTS 生成時専用)。
 */
export const fixJrReading = (text: string, language: 'JA' | 'EN'): string => {
  const reading = language === 'JA' ? JR_READING_JA : JR_READING_EN;

  return text.replace(JR_REGEXP, (match: string, offset: number) => {
    const before = text[offset - 1];
    const after = text[offset + match.length];
    if (
      (before && ALPHANUMERIC_REGEXP.test(before)) ||
      (after && ALPHANUMERIC_REGEXP.test(after))
    ) {
      return match;
    }
    return reading;
  });
};
