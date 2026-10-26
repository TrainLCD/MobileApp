/**
 * 英語TTS用の固有名詞で ji / jo が「ヒ / ホ」と読まれるのを避ける。
 * ja / ji / ju / je / jo を「ジャ / ジ / ジュ / ジェ / ジョ」に寄せる
 * 読み上げ用の綴りへ置換する。ji は語を分断しないよう前後とつなげる。
 * kei は kay に読み替え、「カイ」と読まれるのを避ける。
 * mei と語頭の ei は may / eh に分け、「マイ / アイ」と読まれるのを避ける。
 * 病院の byoin / byouin / byōin は bee-oh-in に読み替える。
 * 丁目の chome は choh-meh、一丁目は itch-oh-meh に読み替える。
 * 案内文全体には適用しない（join / journey などの英単語を壊さないため）。
 */
export const fixRomanizedNameReading = (name: string): string =>
  name.normalize('NFC').replace(/[A-Za-z\u00C0-\u024F]+/g, (word) => {
    // 読み替え済みの綴りは再変換しない。Joetsu のような語頭の jo は対象。
    if (/^(?:jah|jew|jeh|joe)$/i.test(word)) return word;
    // 丁目は語末に限定し、一丁目の促音を処理してから共通の読みへ補正する。
    // byoh は未知語のため発音推定がぶれる。辞書語 bee / oh / in に分ける。
    // 病院前などの複合名も対象にする。
    return word
      .replace(/by(?:ou?|ō)in/gi, (syllable) =>
        syllable[0] === 'B' ? 'Bee-oh-in' : 'bee-oh-in'
      )
      .replace(/kei/gi, (syllable) => (syllable[0] === 'K' ? 'Kay' : 'kay'))
      .replace(/mei|^ei/gi, (syllable) => {
        // 駅名全体ではなく音節で補正する。前後の綴りと結合して未知語に
        // 戻らないよう区切る。語中の ei 全般には広げず、既存の kei は維持する。
        // vits-ljs の辞書では ay は /aɪ/、eh は /eɪ/ なので ei には eh を使う。
        const reading = syllable.toLowerCase() === 'mei' ? 'may' : 'eh';
        const cased =
          syllable[0] === syllable[0].toUpperCase()
            ? reading.charAt(0).toUpperCase() + reading.slice(1)
            : reading;
        return `-${cased}-`;
      })
      .replace(/i(?:t|c)ch[oō]me$/i, (suffix) =>
        suffix[0] === 'I' ? 'Itch-oh-meh' : 'itch-oh-meh'
      )
      .replace(/ch(?:ou?|ō)me$/i, (suffix) =>
        suffix[0] === 'C' ? '-Choh-meh' : '-choh-meh'
      )
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
