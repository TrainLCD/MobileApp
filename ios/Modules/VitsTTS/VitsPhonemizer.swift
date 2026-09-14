import Foundation

/// 英語アナウンス文を VITS モデルの入力トークン ID 列へ変換する。
///
/// モデル (vits-ljs) は IPA 音素で学習されており、付属の `lexicon.txt` が
/// 「単語 → 音素列」、`tokens.txt` が「音素 → ID」を持つ。基本は辞書引きだが、
/// TrainLCD のアナウンスには辞書に載らない語が 2 種類混ざるため、それぞれ規則で補う。
///
/// - 駅名・路線名のローマ字 (Shinjuku, Yamanote など): ヘボン式として読み、
///   英語話者が日本の地名を読むときの音へ写像する。
/// - 駅ナンバリングの数字 (`<say-as>` が外れて "17" のまま来る): 英単語へ開いてから
///   辞書を引く。路線記号は useTTSText が既に "J Y" と 1 文字ずつ分かち書きしており、
///   lexicon が単独アルファベットをアルファベット読みで持っているのでそのまま引ける。
///
/// 辞書にも規則にも載らない語は読み飛ばす (sherpa-onnx の Lexicon と同じ挙動)。
/// 端末内蔵 TTS へ倒しても、そこで読めるようになる語ではない (辞書に無いのは
/// たいてい規則から外れた固有名詞で、内蔵 TTS も同じように読み違える) ため、
/// その回だけエンジンを替える意味が無い。読み飛ばした語はネイティブ側がログに残す。
enum VitsPhonemizer {

  /// 文単位のトークン ID 列。VITS は 1 文ずつ推論して結果を繋ぐ。
  typealias Sentence = [Int64]

  /// 句読点のうち、ここで文の切れ目として扱うもの。`,` は息継ぎだけで切らない。
  private static let sentenceBreaks: Set<String> = [".", "!", "?", ";", ":"]
  private static let punctuations: Set<String> = [".", "!", "?", ";", ":", ","]

  /// 辞書・トークン表を読み込んだ状態。`setup` で作って合成のたびに使い回す。
  struct Dictionary {
    /// 音素 → トークン ID
    let tokenToId: [String: Int64]
    /// 単語 (小文字) → 音素列のトークン ID
    let wordToIds: [String: [Int64]]
    /// 単語の区切りに挟む空白トークンの ID
    let spaceId: Int64

    init(tokensPath: String, lexiconPath: String) throws {
      var tokenToId: [String: Int64] = [:]
      let tokensText = try String(contentsOfFile: tokensPath, encoding: .utf8)
      for line in tokensText.split(separator: "\n", omittingEmptySubsequences: true) {
        // "<音素> <id>" 形式。音素が半角スペースそのものの行があるため、
        // split ではなく「最後の空白の後ろが ID」として切り出す。
        guard let separator = line.lastIndex(of: " ") else { continue }
        let symbol = String(line[line.startIndex..<separator])
        guard let id = Int64(line[line.index(after: separator)...]) else { continue }
        tokenToId[symbol] = id
      }
      guard let spaceId = tokenToId[" "] else {
        throw VitsPhonemizerError.invalidTokens("tokens file has no space token")
      }

      var wordToIds: [String: [Int64]] = [:]
      let lexiconText = try String(contentsOfFile: lexiconPath, encoding: .utf8)
      for line in lexiconText.split(separator: "\n", omittingEmptySubsequences: true) {
        var fields = line.split(separator: " ", omittingEmptySubsequences: true)
        guard fields.count >= 2 else { continue }
        let word = String(fields.removeFirst()).lowercased()
        var ids: [Int64] = []
        ids.reserveCapacity(fields.count)
        for phoneme in fields {
          guard let id = tokenToId[String(phoneme)] else {
            ids.removeAll()
            break
          }
          ids.append(id)
        }
        // 1 音素でも表に無い辞書行は読み上げが壊れるので、その行ごと捨てる
        if !ids.isEmpty {
          wordToIds[word] = ids
        }
      }
      guard !wordToIds.isEmpty else {
        throw VitsPhonemizerError.invalidLexicon("lexicon file has no usable entry")
      }

      self.tokenToId = tokenToId
      self.wordToIds = wordToIds
      self.spaceId = spaceId
    }
  }

  enum VitsPhonemizerError: Error, CustomStringConvertible {
    case invalidTokens(String)
    case invalidLexicon(String)

    var description: String {
      switch self {
      case .invalidTokens(let message): return message
      case .invalidLexicon(let message): return message
      }
    }
  }

  // MARK: - 入力の分割

  private enum Token {
    case word(String)
    case number(String)
    case punctuation(String)
  }

  /// 文字列を単語・数字・句読点へ分ける。ハイフンは駅ナンバリング ("17-2") の
  /// 区切りとして現れるので、区切りとして捨てて前後を別の語として読む。
  private static func tokenize(_ text: String) -> [Token] {
    var tokens: [Token] = []
    var buffer = ""
    var bufferIsDigit = false

    func flush() {
      guard !buffer.isEmpty else { return }
      tokens.append(bufferIsDigit ? .number(buffer) : .word(buffer))
      buffer = ""
    }

    for character in text {
      if character.isNumber {
        if !buffer.isEmpty && !bufferIsDigit { flush() }
        bufferIsDigit = true
        buffer.append(character)
        continue
      }
      // アポストロフィは "we'll" のように辞書の見出しへ含まれるので語の一部として扱う
      if character.isLetter || character == "'" || character == "’" {
        if !buffer.isEmpty && bufferIsDigit { flush() }
        bufferIsDigit = false
        buffer.append(character == "’" ? "'" : character)
        continue
      }
      flush()
      let symbol = String(character)
      if punctuations.contains(symbol) {
        tokens.append(.punctuation(symbol))
      }
      // 空白・ハイフン・その他の記号は区切りとしてだけ働く
    }
    flush()
    return tokens
  }

  // MARK: - 数字

  private static let onesWords = [
    "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
    "seventeen", "eighteen", "nineteen",
  ]
  private static let tensWords = [
    "", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety",
  ]

  /// 0〜999 を英単語へ開く。駅ナンバリングはこの範囲に収まる。範囲外 (4 桁以上) は
  /// 桁ごとの読み上げへ落とす ("1234" → one two three four)。
  static func numberToWords(_ digits: String) -> [String] {
    guard let value = Int(digits), value >= 0 else {
      return []
    }
    if value >= 1000 {
      return digits.compactMap { character in
        character.wholeNumberValue.map { onesWords[$0] }
      }
    }
    var words: [String] = []
    var remainder = value
    if remainder >= 100 {
      words.append(onesWords[remainder / 100])
      words.append("hundred")
      remainder %= 100
      if remainder == 0 { return words }
    }
    if remainder < 20 {
      words.append(onesWords[remainder])
      return words
    }
    words.append(tensWords[remainder / 10])
    if remainder % 10 != 0 {
      words.append(onesWords[remainder % 10])
    }
    return words
  }

  // MARK: - ローマ字

  /// ヘボン式ローマ字の子音。長いものから順に照合する。
  private static let romajiConsonants: [(String, [String])] = [
    ("sh", ["ʃ"]), ("ch", ["t", "ʃ"]), ("ts", ["t", "s"]),
    ("ky", ["k", "j"]), ("gy", ["ɡ", "j"]), ("ny", ["n", "j"]), ("hy", ["h", "j"]),
    ("by", ["b", "j"]), ("py", ["p", "j"]), ("my", ["m", "j"]), ("ry", ["ɹ", "j"]),
    ("k", ["k"]), ("g", ["ɡ"]), ("s", ["s"]), ("z", ["z"]), ("j", ["d", "ʒ"]),
    ("t", ["t"]), ("d", ["d"]), ("n", ["n"]), ("h", ["h"]), ("f", ["f"]),
    ("b", ["b"]), ("p", ["p"]), ("m", ["m"]), ("y", ["j"]), ("r", ["ɹ"]),
    ("w", ["w"]), ("v", ["v"]),
  ]

  /// ローマ字の母音を、英語話者が日本の地名を読むときの音へ写像する。
  /// 長音符つきの文字 (ō / ū) は伸ばす母音として扱う。
  private static let romajiVowels: [Character: [String]] = [
    "a": ["ɑ", "ː"],
    "i": ["i", "ː"],
    "u": ["u", "ː"],
    "e": ["ɛ"],
    "o": ["o", "ʊ"],
    "ā": ["ɑ", "ː"],
    "ī": ["i", "ː"],
    "ū": ["u", "ː"],
    "ē": ["ɛ", "ː"],
    "ō": ["o", "ʊ"],
    "â": ["ɑ", "ː"],
    "î": ["i", "ː"],
    "û": ["u", "ː"],
    "ê": ["ɛ", "ː"],
    "ô": ["o", "ʊ"],
  ]

  /// ローマ字 1 音節。強勢を後から置けるよう、音節の単位で持つ。
  private struct Syllable {
    var phonemes: [String]
  }

  /// 辞書に無い語をヘボン式ローマ字として読む。ローマ字として解釈できない文字が
  /// 混ざっていたら nil を返し、呼び出し側はその語を読み飛ばす。
  private static func romajiSyllables(_ word: String) -> [Syllable]? {
    let characters = Array(word)
    var syllables: [Syllable] = []
    var index = 0
    var pendingGemination = false

    while index < characters.count {
      // 促音 (kk / tt / pp など同じ子音の重なり)。英語話者は子音を伸ばさず
      // 1 つとして読むので、重なりは畳んで次の音節へ送る。
      if index + 1 < characters.count,
        characters[index] == characters[index + 1],
        romajiVowels[characters[index]] == nil
      {
        pendingGemination = true
        index += 1
        continue
      }

      var consonant: [String] = []
      var matched = false
      for (roman, phonemes) in romajiConsonants {
        let count = roman.count
        guard index + count <= characters.count else { continue }
        if String(characters[index..<(index + count)]).lowercased() == roman {
          // 撥音: 後ろに母音が続かない n は、それ自体で 1 つの音として立てる
          if roman == "n" {
            let next = index + 1 < characters.count ? characters[index + 1] : nil
            if next == nil || romajiVowels[next!] == nil {
              syllables.append(Syllable(phonemes: ["n"]))
              index += 1
              matched = true
              break
            }
          }
          consonant = phonemes
          index += count
          matched = true
          break
        }
      }
      if matched && consonant.isEmpty {
        // 撥音として処理済み
        pendingGemination = false
        continue
      }
      if !matched && romajiVowels[characters[index]] == nil {
        // 子音でも母音でもない文字 (記号など) が来たらローマ字として扱わない
        return nil
      }

      guard index < characters.count, let vowel = romajiVowels[characters[index]] else {
        // 子音で終わる語はローマ字らしくないので諦める
        return nil
      }
      index += 1
      syllables.append(Syllable(phonemes: consonant + vowel))
      pendingGemination = false
    }

    if pendingGemination || syllables.isEmpty {
      return nil
    }
    return syllables
  }

  /// ローマ字語の音素列を組み立てる。強勢を 1 つも置かないと LJSpeech で学習した
  /// モデルが平板に読むため、英語の一般的な型に合わせて後ろから 2 番目の音節へ
  /// 第一強勢を置く (1 音節語は先頭)。日本語のアクセントとは無関係なので、
  /// ここは実機で聞いて調整する余地がある。
  private static func romajiPhonemes(_ word: String) -> [String]? {
    guard let syllables = romajiSyllables(word) else { return nil }
    let stressIndex = syllables.count >= 2 ? syllables.count - 2 : 0
    var phonemes: [String] = []
    for (index, syllable) in syllables.enumerated() {
      if index == stressIndex {
        phonemes.append("ˈ")
      }
      phonemes.append(contentsOf: syllable.phonemes)
    }
    return phonemes
  }

  // MARK: - 変換

  /// 1 語分のトークン ID 列を返す。読めない語は nil。
  private static func idsForWord(_ word: String, dictionary: Dictionary) -> [Int64]? {
    let lowercased = word.lowercased()
    if let ids = dictionary.wordToIds[lowercased] {
      return ids
    }
    guard let phonemes = romajiPhonemes(lowercased) else {
      return nil
    }
    var ids: [Int64] = []
    ids.reserveCapacity(phonemes.count)
    for phoneme in phonemes {
      guard let id = dictionary.tokenToId[phoneme] else {
        return nil
      }
      ids.append(id)
    }
    return ids
  }

  /// 変換結果。`unreadableWords` が空でなければ、その回は合成せず端末内蔵 TTS へ倒す。
  struct Result {
    let sentences: [Sentence]
    let unreadableWords: [String]
  }

  /// アナウンス文を文ごとのトークン ID 列へ変換する。
  /// `addBlank` が真なら、モデルの学習設定に合わせて音素の間へ blank (ID 0) を挟む。
  static func tokenIds(
    text: String,
    dictionary: Dictionary,
    addBlank: Bool
  ) -> Result {
    // ō のような文字が結合文字列 (o + U+0304) で届くと母音表を引けないため、
    // 合成済みの形へ正規化してから読む
    let text = text.precomposedStringWithCanonicalMapping
    var sentences: [Sentence] = []
    var current: Sentence = []
    var unreadableWords: [String] = []

    func closeSentence() {
      // 末尾の空白トークンは落とす (sherpa-onnx の Lexicon と同じ整形)
      if current.last == dictionary.spaceId {
        current.removeLast()
      }
      if !current.isEmpty {
        sentences.append(addBlank ? withBlanks(current) : current)
      }
      current = []
    }

    func appendWord(_ ids: [Int64]) {
      current.append(contentsOf: ids)
      current.append(dictionary.spaceId)
    }

    for token in tokenize(text) {
      switch token {
      case .word(let word):
        if let ids = idsForWord(word, dictionary: dictionary) {
          appendWord(ids)
        } else {
          unreadableWords.append(word)
        }
      case .number(let digits):
        let words = numberToWords(digits)
        if words.isEmpty {
          unreadableWords.append(digits)
        }
        for word in words {
          if let ids = idsForWord(word, dictionary: dictionary) {
            appendWord(ids)
          } else {
            unreadableWords.append(word)
          }
        }
      case .punctuation(let symbol):
        if let id = dictionary.tokenToId[symbol] {
          if current.last == dictionary.spaceId {
            current.removeLast()
          }
          current.append(id)
          current.append(dictionary.spaceId)
        }
        if sentenceBreaks.contains(symbol) {
          closeSentence()
        }
      }
    }
    closeSentence()
    return Result(sentences: sentences, unreadableWords: unreadableWords)
  }

  /// 音素 ID の間と両端へ blank (ID 0) を挟む。VITS の add_blank 設定に対応する。
  private static func withBlanks(_ ids: [Int64]) -> [Int64] {
    var result = [Int64](repeating: 0, count: ids.count * 2 + 1)
    for (index, id) in ids.enumerated() {
      result[index * 2 + 1] = id
    }
    return result
  }
}
