/**
 * 英語TTS用の固有名詞で ji / jo が「ヒ / ホ」と読まれるのを避ける。
 * 英単語 gee / Joe の綴りで「ジ / ジョ」に寄せ、前後の音節とは区切る。
 * 案内文全体には適用しない（join / journey などの英単語を壊さないため）。
 */
export const fixRomanizedNameReading = (name: string): string =>
  name.replace(/[A-Za-z\u00C0-\u024F]+/g, (word) => {
    // 読み替え済みの Joe は再変換しない。Joetsu のような語頭の jo は対象。
    if (/^joe$/i.test(word)) return word;
    return word
      .replace(/ji|j[oō]/gi, (syllable) => {
        const reading = syllable.toLowerCase() === 'ji' ? 'gee' : 'joe';
        const cased =
          syllable[0] === 'J'
            ? reading.charAt(0).toUpperCase() + reading.slice(1)
            : reading;
        return `-${cased}-`;
      })
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  });
