import { TtsAlphabet, type TtsSegment } from '~/@types/graphql';

const escapeXml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const escapeXmlAttr = (s: string): string =>
  escapeXml(s).replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/** TtsSegment 配列を SSML 文字列に変換する。IPA セグメントは phoneme タグで囲む */
export const wrapPhoneme = (
  segments: TtsSegment[] | null | undefined
): string => {
  if (!segments?.length) return '';
  return segments
    .map((seg) => {
      const text = seg.surface ?? seg.fallbackText ?? '';
      const rendered =
        seg.alphabet === TtsAlphabet.Ipa && seg.pronunciation
          ? `<phoneme alphabet="ipa" ph="${escapeXmlAttr(seg.pronunciation)}">${escapeXml(seg.fallbackText ?? text)}</phoneme>`
          : escapeXml(text);
      return rendered + (seg.separator ? escapeXml(seg.separator) : '');
    })
    .join('');
};
