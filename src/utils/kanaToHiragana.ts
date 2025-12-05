const katakanaToHiragana = (src: string | undefined | null): string => {
  if (!src) return '';
  return src.replace(/[\u30a1-\u30f6]/g, (match) => {
    const chr = match.charCodeAt(0) - 0x60;
    return String.fromCharCode(chr);
  });
};

export default katakanaToHiragana;
