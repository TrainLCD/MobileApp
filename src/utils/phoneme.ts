const escapeXml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const escapeXmlAttr = (s: string): string =>
  escapeXml(s).replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/** nameRomanIpa が定義されていれば SSML phoneme タグで囲み、なければ nameRoman をそのまま返す */
export const wrapPhoneme = (
  nameRoman: string | null | undefined,
  nameRomanIpa?: string | null | undefined
): string => {
  if (!nameRoman) return '';
  if (!nameRomanIpa) return escapeXml(nameRoman);
  return `<phoneme alphabet="ipa" ph="${escapeXmlAttr(nameRomanIpa)}">${escapeXml(nameRoman)}</phoneme>`;
};
