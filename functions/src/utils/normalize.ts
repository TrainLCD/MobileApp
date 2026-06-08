import { removeMacron } from './removeMacron';

const capitalizeSegment = (seg: string): string =>
  /[A-Z]/.test(seg)
    ? seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase()
    : seg;

export const normalizeRomanText = (str: string | undefined): string => {
  if (!str) return '';

  // XMLタグを保護しつつテキスト部分のみ正規化する
  const replaced = str
    .split(/(<[^>]+>)/g)
    .map((part) =>
      part.startsWith('<')
        ? part
        : part
            .split(' ')
            .map((seg) => capitalizeSegment(seg))
            .join(' ')
    )
    .join('');

  return (
    removeMacron(replaced)
      // Airport Terminal 1･2等
      .replace(/･/g, ' ')
      // Otsuka・Teikyo-Daigakuなど
      .replace(/・/g, ' ')
      // 環状運転の場合に & が含まれる可能性があるため置換
      .replace(/&(?!#\d+;|#x[0-9A-Fa-f]+;|\w+;)/g, 'and')
      // 全角記号
      .replace(/[！-／：-＠［-｀｛-～、-〜”・]+/g, ' ')
      // 明治神宮前駅等の駅名にバッククォートが含まれる場合があるため除去
      .replace(/`/g, '')
      .replace(/JR/gi, 'J-R')
      // 都営バスを想定
      .replace(/\bSta\./gi, ' Station')
      .replace(/\bUniv\./gi, ' University')
      .replace(/\bHp\./gi, ' Hospital')
  );
};
