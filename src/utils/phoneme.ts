import { TtsAlphabet, type TtsSegment } from '~/@types/graphql';

export const escapeXml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const escapeXmlAttr = (s: string): string =>
  escapeXml(s).replace(/"/g, '&quot;').replace(/'/g, '&apos;');

type IpaGroup = {
  kind: 'ipa';
  pronunciations: string[];
  fallbacks: string[];
  separators: string[];
  trailingSeparator: string;
};

type PlainGroup = {
  kind: 'plain';
  text: string;
};

type SegmentGroup = IpaGroup | PlainGroup;

/** 連続する同種セグメントをグループ化する */
const groupSegments = (segments: TtsSegment[]): SegmentGroup[] => {
  const groups: SegmentGroup[] = [];

  for (const seg of segments) {
    const isIpa = seg.alphabet === TtsAlphabet.Ipa && seg.pronunciation;
    const separator = seg.separator ?? '';

    if (isIpa) {
      const last = groups[groups.length - 1];
      if (last?.kind === 'ipa') {
        // 直前のグループの末尾 separator を結合用に取り込む
        last.separators.push(last.trailingSeparator);
        last.pronunciations.push(seg.pronunciation ?? '');
        last.fallbacks.push(seg.fallbackText ?? seg.surface ?? '');
        last.trailingSeparator = separator;
      } else {
        groups.push({
          kind: 'ipa',
          pronunciations: [seg.pronunciation ?? ''],
          fallbacks: [seg.fallbackText ?? seg.surface ?? ''],
          separators: [],
          trailingSeparator: separator,
        });
      }
    } else {
      const text = seg.surface ?? seg.fallbackText ?? '';
      groups.push({ kind: 'plain', text: text + separator });
    }
  }

  return groups;
};

// ひらがな・カタカナ・CJK漢字・半角カナ。英語向けテキストへの日本語混入検出に使う
const JAPANESE_CHAR_REGEXP = /[぀-ヿ㐀-䶿一-鿿豈-﫿ｦ-ﾟ]/;

// タグを除いた可視テキストを取り出す（phoneme の ph 属性など、読み上げ対象に
// ならない属性値を日本語混入判定へ含めないため）
const stripTagsForInspection = (ssml: string): string =>
  ssml.replace(/<[^>]+>/g, '');

/** 英語向けテキストへの日本語混入検知（診断・フォールバック判定用） */
export const containsJapaneseCharacters = (text: string): boolean =>
  JAPANESE_CHAR_REGEXP.test(text);

// 日本語文字と全角記号（CJK記号・全角英数を含む）の連続。英語テキストからの
// 除去に使うため、検知用より広く全角圏の文字を対象にする
const JAPANESE_RUN_REGEXP = /[　-ヿ㐀-䶿一-鿿豈-﫿＀-￯]+/g;

/**
 * 英語向けテキストから日本語文字の連続を除去する。
 * nameRoman が欠落した駅データ等ではローマ字へのフォールバックが効かず、
 * 英語文に日本語が残ることがある。日本語が混じった英語文は TTS エンジンが
 * 言語を誤判定して全文を日本語音声で合成してしまうため、固有名詞が欠けても
 * 正しい英語音声で読み上げる方を優先する（最終防衛線）。
 */
export const stripJapaneseCharacters = (text: string): string =>
  text
    .replace(JAPANESE_RUN_REGEXP, ' ')
    .replace(/[\t ]+/g, ' ')
    .trim();

/**
 * TtsSegment 配列を SSML 文字列に変換する。連続する IPA セグメントは単一の phoneme タグに結合する。segments が空の場合は fallback を返す。
 *
 * OS ネイティブ TTS は IPA（ph 属性）を解釈できず phoneme タグの中身の表記が
 * そのまま読まれるため、表記に日本語文字が含まれる場合（例: surface が
 * 「あかさか」で fallbackText 未設定の駅）は英語文へ日本語が混入し、エンジンが
 * 言語を誤判定して日本語音声で合成されてしまう。その場合はセグメントを使わず
 * ローマ字名（fallback）全体へフォールバックする。
 */
export const wrapPhoneme = (
  segments: TtsSegment[] | null | undefined,
  fallback?: string | null
): string => {
  if (!segments?.length) return fallback ? escapeXml(fallback) : '';

  const built = buildFromSegments(segments);
  if (fallback && JAPANESE_CHAR_REGEXP.test(stripTagsForInspection(built))) {
    return escapeXml(fallback);
  }
  return built;
};

const buildFromSegments = (segments: TtsSegment[]): string => {
  return groupSegments(segments)
    .map((group) => {
      if (group.kind === 'ipa') {
        const ph = group.pronunciations
          .reduce<string[]>((acc, p, i) => {
            if (i > 0) acc.push(group.separators[i - 1] ?? '');
            acc.push(p);
            return acc;
          }, [])
          .join('');
        const inner = group.fallbacks
          .reduce<string[]>((acc, f, i) => {
            if (i > 0) acc.push(group.separators[i - 1] ?? '');
            acc.push(f);
            return acc;
          }, [])
          .join('');
        return `<phoneme alphabet="ipa" ph="${escapeXmlAttr(ph)}">${escapeXml(inner)}</phoneme>${escapeXml(group.trailingSeparator)}`;
      }
      return escapeXml(group.text);
    })
    .join('');
};
