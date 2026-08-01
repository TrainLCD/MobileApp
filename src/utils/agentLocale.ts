export type AgentLocale = 'ja' | 'en';

/**
 * ひらがな（濁点・繰り返し記号を含む）。日本語以外の文にひらがなが混ざる
 * ケースはほぼ無いため、日本語であることの最も強い手がかりとして扱う。
 */
const HIRAGANA_RE = /[ぁ-ゟ]/u;

/**
 * 日本語表記に使われる文字全般。々〆・ひらがな・カタカナ（区切り記号の
 * `゠`(U+30A0) と `・`(U+30FB) は除外）・漢字（拡張 A と互換漢字を含む）・
 * 半角カタカナ。
 */
const JAPANESE_RE = /[々〆ぁ-ゟァ-ヺー-ヿ㐀-䶿一-鿿豈-﫿ｦ-ﾝ]/u;

/** ラテン文字（アクセント付きを含む）。1 文字以上の連なりを 1 語と数える */
const LATIN_WORD_RE = /[A-Za-zÀ-ɏ]+/gu;

/**
 * 1 メッセージの記述言語を推定する。判断材料が足りない場合は null を返し、
 * 呼び出し側で前のターンや端末設定へフォールバックさせる。
 *
 * 判定は手がかりの強い順に行う:
 *
 * 1. ひらがながあれば日本語。英文に混ざる日本語はカタカナ・漢字の固有名詞
 *    （`I want to go to スカイツリー`）であり、ひらがなは助詞・活用として
 *    現れるため日本語の文である証拠になる（`Kamakuraに行きたい` も日本語）。
 * 2. 英単語が 2 語以上あれば英語。上記のとおり日本語の固有名詞が混ざっても
 *    文自体は英語なので、日本語文字の有無では判定しない。
 * 3. 日本語文字だけで書かれていれば日本語（`鎌倉`、`海が見える駅`）。
 * 4. それ以外（`Kamakura` だけ、`OK`、数字のみなど）は判定不能とする。
 */
export const detectTextLocale = (text: string): AgentLocale | null => {
  if (HIRAGANA_RE.test(text)) {
    return 'ja';
  }

  const latinWords = text.match(LATIN_WORD_RE) ?? [];
  if (latinWords.length >= 2) {
    return 'en';
  }

  if (JAPANESE_RE.test(text) && latinWords.length === 0) {
    return 'ja';
  }

  return null;
};

type LocaleDetectableMessage = {
  role: string;
  content: string;
};

/**
 * 会話履歴から応答に使うロケールを決める。最新のユーザ発話を優先し、
 * 判定できない短い発話（`OK`、`3`、駅名のローマ字だけ など）は
 * さかのぼって直近の判定可能な発話に合わせる。どれも判定できなければ
 * fallback（端末の言語設定）を使う。
 */
export const resolveAgentLocale = (
  messages: readonly LocaleDetectableMessage[],
  fallback: AgentLocale
): AgentLocale => {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== 'user') {
      continue;
    }
    const detected = detectTextLocale(message.content);
    if (detected) {
      return detected;
    }
  }
  return fallback;
};
