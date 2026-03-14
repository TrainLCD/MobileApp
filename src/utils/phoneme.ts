/** nameIpa が定義されていれば SSML phoneme タグで囲み、なければ nameRoman をそのまま返す */
export const wrapPhoneme = (
  nameRoman: string | null | undefined,
  nameIpa?: string | null | undefined
): string => {
  if (!nameRoman) return '';
  if (!nameIpa) return nameRoman;
  return `<phoneme alphabet="ipa" ph="${nameIpa}">${nameRoman}</phoneme>`;
};
