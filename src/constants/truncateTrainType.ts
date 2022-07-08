import { parenthesisRegexp } from './regexp';

const TRUNCATE_TRAIN_TYPE_WORD = ['commuter', 'limited', 'express'];

const truncateTrainType = (
  nameR: string | undefined,
  alwaysTruncate?: boolean
): string | undefined => {
  const replacedName = nameR?.replace(parenthesisRegexp, '');

  return replacedName
    ?.split(' ')
    ?.map((v, _, arr) => {
      if (arr.length === 1 && !alwaysTruncate) {
        return v;
      }

      if (TRUNCATE_TRAIN_TYPE_WORD.find((w) => v.toLowerCase() === w)) {
        const truncated = v
          .split('')
          .slice(0, 3)
          .map((w) => (w === 'lim' ? 'ltd' : w))
          .map((w, i) => (i === 0 ? w.toUpperCase() : w))
          .join('');
        return `${truncated !== 'Lim' ? truncated : 'Ltd'}.`;
      }
      return v;
    })
    .join(' ');
};

export default truncateTrainType;
