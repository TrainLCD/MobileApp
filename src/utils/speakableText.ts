import { fixEnglishReading } from './englishReading';
import { fixJrReading } from './jrReading';
import { containsJapaneseCharacters, stripJapaneseCharacters } from './phoneme';
import { ssmlToPlainText } from './ssmlToPlainText';
import getStringBytes from './stringBytes';

// TTS テンプレートが生成する SSML 断片を、読み上げエンジンへ渡せるプレーン
// テキストへ変換する。端末内蔵 TTS (expo-speech) も iOS のリモート TTS
// (Google Cloud TTS) も SSML を解釈せずタグをそのまま読み上げてしまうため、
// どちらの経路でもこの変換を通す。

/**
 * SSML 断片を読み上げ用のプレーンテキストへ変換する。
 *
 * - `<break/>` は日本語では「、」、英語ではテンプレ側に区切りのカンマが既に
 *   含まれるため半角スペースへ置き換える。
 * - 「JR」は TTS エンジンが "Jr."（ジュニア）と誤読するため、読み方が確定する
 *   表記へ置換する。
 * - 端末内蔵 TTS 向け (`engine: 'native'`) の英語文では、「Keisei」など英語 TTS が
 *   誤読する固有名詞も読み方が確定する英単語の綴りへ置換する。リモート TTS
 *   (`engine: 'remote'`) では同じ置換を TrainLCD/functions の `normalizeRomanText`
 *   が合成前に行うため、アプリ側では適用せず原文の表記のまま送る。二重に置換
 *   しても結果は変わらないが、サーバー側の正規化とキャッシュキーを単一の入力に
 *   揃えるため、置換の責務をサーバーに寄せる。
 * - 英語文に日本語が残っている場合は除去する。nameRoman が欠落した駅データ等では
 *   wrapPhoneme のローマ字フォールバックが効かず英語文に日本語が混ざることがあり、
 *   その場合エンジンが言語を誤判定して全文を日本語音声で合成してしまうため。
 */
export type SpeechEngineKind = 'native' | 'remote';

export const toSpeakableText = (
  ssml: string,
  language: 'JA' | 'EN',
  engine: SpeechEngineKind
): string => {
  const plain = fixJrReading(
    ssmlToPlainText(ssml, {
      breakReplacement: language === 'JA' ? '、' : ' ',
    }),
    language
  );

  if (language === 'JA') {
    return plain;
  }

  if (containsJapaneseCharacters(plain)) {
    console.warn(
      '[speakableText] English text contains Japanese characters, stripping:',
      plain
    );
  }
  const english = stripJapaneseCharacters(plain);
  return engine === 'native' ? fixEnglishReading(english) : english;
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

/**
 * UTF-8 バイト数の上限に合わせて切り詰める。リモート TTS の Worker は入力長を
 * バイトで検証するため、文字数で丸めると日本語の長文が 400 で弾かれ、無用な
 * フォールバックを招く。文字の途中で切らないようコードポイント単位で積む。
 */
export const truncateToByteLimit = (text: string, limit: number): string => {
  if (limit <= 0 || getStringBytes(text) <= limit) {
    return text;
  }

  let bytes = 0;
  let truncated = '';
  for (const char of text) {
    const charBytes = getStringBytes(char);
    if (bytes + charBytes > limit) {
      break;
    }
    bytes += charBytes;
    truncated += char;
  }
  return truncated;
};
