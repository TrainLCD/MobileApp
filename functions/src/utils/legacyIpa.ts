/**
 * 旧バージョンのアプリ向けのレガシーIPA置換。
 * アプリ側でnameIpaを使った<phoneme>タグが埋め込まれていない場合にフォールバックとして適用する。
 */
export const applyLegacyIpaReplacements = (text: string): string =>
  text
    .replace(/jo/gi, '<phoneme alphabet="ipa" ph="ʤo">じょ</phoneme>')
    .replace(
      /-itchome/gi,
      '<phoneme alphabet="ipa" ph="itt͡ɕoːme">いっちょうめ</phoneme>'
    )
    .replace(
      /-sanchome/gi,
      ' <phoneme alphabet="ipa" ph="sant͡ɕoːme">さんちょうめ</phoneme>'
    )
    .replace(/Ube/gi, '<phoneme alphabet="ipa" ph="ɯbe">うべ</phoneme>')
    .replace(
      /Isesaki/gi,
      '<phoneme alphabet="ipa" ph="isesakʲi">いせさき</phoneme>'
    )
    .replace(
      /Mejiro/gi,
      '<phoneme alphabet="ipa" ph="meʤiɾo">めじろ</phoneme>'
    )
    .replace(
      /Keisei/gi,
      '<phoneme alphabet="ipa" ph="keisei">けいせい</phoneme>'
    )
    .replace(
      /Oshiage/gi,
      `<phoneme alphabet="ipa" ph="'oɕiaɡe">おしあげ</phoneme>`
    )
    .replace(
      /Meitetsu/gi,
      '<phoneme alphabet="ipa" ph="meitetsɯ">めいてつ</phoneme>'
    )
    .replace(
      /Seibu/gi,
      '<phoneme alphabet="ipa" ph="seibɯ">せいぶ</phoneme>'
    )
    .replace(
      /Toride/gi,
      '<phoneme alphabet="ipa" ph="toɾʲide">とりで</phoneme>'
    )
    .replace(
      /Fukiage/gi,
      '<phoneme alphabet="ipa" ph="ɸɯkʲiaɡe">ふきあげ</phoneme>'
    )
    .replace(
      /\bFuse\b/gi,
      '<phoneme alphabet="ipa" ph="ɸɯse">ふせ</phoneme>'
    )
    .replace(
      /\bInagekaigan\b/gi,
      '<phoneme alphabet="ipa" ph="inaɡekaiɡaɴ">いなげかいがん</phoneme>'
    )
    .replace(
      /\bInage\b/gi,
      '<phoneme alphabet="ipa" ph="inaɡe">いなげ</phoneme>'
    )
    .replace(
      /\bKire-Uriwari\b/gi,
      '<phoneme alphabet="ipa" ph="kiɾeɯɾiwaɾi">きれうりわり</phoneme>'
    )
    .replace(
      /\bYao\b/gi,
      '<phoneme alphabet="ipa" ph="jao">やお</phoneme>'
    )
    .replace(
      /Shimbashi/gi,
      '<phoneme alphabet="ipa" ph="ɕimbaɕi">しんばし</phoneme>'
    )
    .replace(
      /Shibuya/gi,
      '<phoneme alphabet="ipa" ph="ɕibɯja">しぶや</phoneme>'
    )
    .replace(
      /Shinagawa/gi,
      '<phoneme alphabet="ipa" ph="ɕinaɡawa">しながわ</phoneme>'
    )
    .replace(
      /Ueno/gi,
      '<phoneme alphabet="ipa" ph="ɯeno">うえの</phoneme>'
    )
    .replace(
      /Ikebukuro/gi,
      '<phoneme alphabet="ipa" ph="ikebɯkɯɾo">いけぶくろ</phoneme>'
    )
    .replace(
      /Shinjuku/gi,
      '<phoneme alphabet="ipa" ph="ɕiɲdʑɯkɯ">しんじゅく</phoneme>'
    )
    .replace(
      /Osaka/gi,
      '<phoneme alphabet="ipa" ph="oːsaka">おおさか</phoneme>'
    )
    .replace(
      /Kyoto/gi,
      '<phoneme alphabet="ipa" ph="kʲoːto">きょうと</phoneme>'
    )
    .replace(
      /Yokohama/gi,
      '<phoneme alphabet="ipa" ph="jokohama">よこはま</phoneme>'
    )
    .replace(
      /Chiba/gi,
      '<phoneme alphabet="ipa" ph="t͡ɕiba">ちば</phoneme>'
    )
    .replace(
      /Kawasaki/gi,
      '<phoneme alphabet="ipa" ph="kawasakʲi">かわさき</phoneme>'
    )
    .replace(
      /Tsurumi/gi,
      '<phoneme alphabet="ipa" ph="t͡sɯɾɯmi">つるみ</phoneme>'
    )
    .replace(
      /Ryogoku/gi,
      '<phoneme alphabet="ipa" ph="ɾʲoːɡokɯ">りょうごく</phoneme>'
    )
    .replace(
      /koen/gi,
      '<phoneme alphabet="ipa" ph="koeɴ">こえん</phoneme>'
    );
