/**
 * 英語TTS用の固有名詞で ji / jo が「ヒ / ホ」と読まれるのを避ける。
 * ja / ji / ju / je / jo を「ジャ / ジ / ジュ / ジェ / ジョ」に寄せる
 * 読み上げ用の綴りへ置換する。ji は語を分断しないよう前後とつなげる。
 * 案内文全体には適用しない（join / journey などの英単語を壊さないため）。
 */
export const fixRomanizedNameReading = (name: string): string =>
  name.normalize('NFC').replace(/[A-Za-z\u00C0-\u024F]+/g, (word) => {
    // 読み替え済みの綴りは再変換しない。Joetsu のような語頭の jo は対象。
    if (/^(?:jah|jew|jeh|joe)$/i.test(word)) return word;
    return word
      .replace(/j[aiueoō]/gi, (syllable) => {
        const reading =
          {
            ja: 'jah',
            ji: 'gee',
            ju: 'jew',
            je: 'jeh',
            jo: 'joe',
            jō: 'joe',
          }[syllable.toLowerCase()] ?? syllable;
        const cased =
          syllable[0] === 'J'
            ? reading.charAt(0).toUpperCase() + reading.slice(1)
            : reading;
        // Mejiro → Me-gee-ro では単語内に不自然な切れ目が生じるため、
        // ji の読み替えには区切りを挿入しない。元からあるハイフンは維持する。
        return syllable.toLowerCase() === 'ji' ? cased : `-${cased}-`;
      })
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  });
