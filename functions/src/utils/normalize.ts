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

  return removeMacron(replaced.replace('Jr', 'J-R'));
};
