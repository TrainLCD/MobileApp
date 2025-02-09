export const normalizeRomanText = (str: string | undefined): string => {
  if (!str) return '';

  const replaced = str
    .split(' ')

    .map((seg) =>
      /[A-Z]/.test(seg)
        ? seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase()
        : seg
    )
    .join(' ');

  return replaced.replace('Jr', 'J-R');
};
