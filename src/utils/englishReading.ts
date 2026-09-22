// 英語音声の TTS エンジンが日本語由来の固有名詞を誤読するケースを、読み上げ
// 直前のプレーンテキストに対する表記置換で補正する。旧外部 TTS 向けの
// `<phoneme>` (IPA) は OS ネイティブ TTS (expo-speech) もリモート TTS も解釈
// しないため、エンジンが確実に読める英単語の綴りへ倒すしかない。
// 表示用テキストには適用しないこと (TTS 生成時専用)。

type EnglishReadingRule = {
  // 置換対象。原則は ASCII 英字の単語境界 (`\b`) で囲み、`Keisei-Ueno` のような
  // ハイフン連結の駅名でも語単位で一致させる。語中も置換する場合 (Mine) は
  // reading を関数にして、前後の文字との区切りを補う。
  pattern: RegExp;
  reading: string | ((match: string, offset: number, text: string) => string);
};

// ローマ字表記の文字か。端末内蔵 TTS 向けの経路ではマクロンを除去しないため、
// 「Ō」などのラテン拡張文字も語の一部として扱う。
const isRomanLetter = (char: string | undefined): boolean =>
  char !== undefined && /[A-Za-z\u00C0-\u024F]/.test(char);

// 「mine」を読み替え先へ置換する。Tsurugamine のように語中にある場合も置換し、
// 前後の文字とつながって別の綴りとして読まれないよう、接する側にハイフンを挟む。
// 先頭の大文字・小文字は元の綴りに合わせる (Mine → Me-nay, Takamine → Taka-me-nay)。
// TrainLCD/functions の normalizeRomanText (replaceMine) と同じ置換にして、
// リモート TTS が無効な回とも読みを揃える。
const toMineReading = (match: string, offset: number, text: string) => {
  const before = isRomanLetter(text[offset - 1]) ? '-' : '';
  const after = isRomanLetter(text[offset + match.length]) ? '-' : '';
  const head = /[A-Z]/.test(match.charAt(0)) ? 'Me' : 'me';
  return `${before}${head}-nay${after}`;
};

// NOTE: 読み替え先は必ず英語の辞書語 (か、辞書語のハイフン連結) にする。
// 未知語の綴りを与えると G2P の推定に戻ってしまい、エンジンごとに結果がぶれる。
const ENGLISH_READING_RULES: readonly EnglishReadingRule[] = [
  // 「Keisei (京成)」は英語 TTS が "ei" を /aɪ/ と推定して「かいせい」と読む
  // ため、英単語 "Kay" + "say" で /keɪ.seɪ/ (けいせい) を確定させる。
  { pattern: /\bKeisei\b/gi, reading: 'Kay-say' },
  // 「Seibu (西武)」も同じく "ei" を /aɪ/ と推定して「さいぶ」と読むため、
  // "Say" + "boo" で /seɪ.buː/ (せいぶ) を確定させる。
  { pattern: /\bSeibu\b/gi, reading: 'Say-boo' },
  // 「Mine (美祢・峰など)」は英語 TTS が英単語 "mine" (まいん) として読むため、
  // "Me" + "nay" で /mi.neɪ/ (みね) に寄せる。Tsurugamine・Mitsumineguchi の
  // ように語中にある場合も対象にするため、単語境界では区切らない。
  { pattern: /mine/gi, reading: toMineReading },
];

/**
 * 英語の読み上げ用テキスト内の固有名詞を、TTS エンジンが正しく読める表記へ置換する。
 */
export const fixEnglishReading = (text: string): string =>
  ENGLISH_READING_RULES.reduce(
    (acc, { pattern, reading }) =>
      typeof reading === 'string'
        ? acc.replace(pattern, reading)
        : acc.replace(pattern, reading),
    text
  );
