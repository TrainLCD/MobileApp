import { fixJrReading } from './jrReading';
import { containsJapaneseCharacters, stripJapaneseCharacters } from './phoneme';
import { ssmlToPlainText } from './ssmlToPlainText';

// TTS テンプレートが生成する SSML 断片を、読み上げエンジンへ渡せるプレーン
// テキストへ変換する。端末内蔵 TTS (expo-speech) も iOS のリモート TTS
// (gpt-4o-mini-tts) も SSML を解釈せずタグをそのまま読み上げてしまうため、
// どちらの経路でもこの変換を通す。

/**
 * SSML 断片を読み上げ用のプレーンテキストへ変換する。
 *
 * - `<break/>` は日本語では「、」、英語ではテンプレ側に区切りのカンマが既に
 *   含まれるため半角スペースへ置き換える。
 * - 「JR」は TTS エンジンが "Jr."（ジュニア）と誤読するため、読み方が確定する
 *   表記へ置換する。
 * - 英語文に日本語が残っている場合は除去する。nameRoman が欠落した駅データ等では
 *   wrapPhoneme のローマ字フォールバックが効かず英語文に日本語が混ざることがあり、
 *   その場合エンジンが言語を誤判定して全文を日本語音声で合成してしまうため。
 */
export const toSpeakableText = (
  ssml: string,
  language: 'JA' | 'EN'
): string => {
  const plain = fixJrReading(
    ssmlToPlainText(ssml, {
      breakReplacement: language === 'JA' ? '、' : ' ',
    }),
    language
  );

  if (language === 'EN' && containsJapaneseCharacters(plain)) {
    console.warn(
      '[speakableText] English text contains Japanese characters, stripping:',
      plain
    );
    return stripJapaneseCharacters(plain);
  }

  return plain;
};

/**
 * エンジンの入力長上限に合わせて切り詰める。上限を超えると発話自体が失敗する
 * エンジンがあるため、静かに失敗するより切り詰めて読み上げる方がマシとして
 * 防衛的に丸める。通常のアナウンス文は上限に達しない。
 */
export const truncateToSpeechLimit = (
  text: string,
  limit: number | undefined
): string => {
  if (typeof limit === 'number' && limit > 0 && text.length > limit) {
    return text.slice(0, limit);
  }
  return text;
};
