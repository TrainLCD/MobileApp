import { TtsAlphabet, type TtsSegment } from '~/@types/graphql';

const escapeXml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const escapeXmlAttr = (s: string): string =>
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

/** TtsSegment 配列を SSML 文字列に変換する。連続する IPA セグメントは単一の phoneme タグに結合する。segments が空の場合は fallback を返す */
export const wrapPhoneme = (
  segments: TtsSegment[] | null | undefined,
  fallback?: string | null
): string => {
  if (!segments?.length) return fallback ?? '';

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
