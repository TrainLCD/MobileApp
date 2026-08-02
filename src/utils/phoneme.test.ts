import { TtsAlphabet, type TtsSegment } from '~/@types/graphql';
import {
  containsJapaneseCharacters,
  stripJapaneseCharacters,
  wrapPhoneme,
} from './phoneme';

const ipaSegment = (
  surface: string | null,
  pronunciation: string,
  fallbackText: string | null = null,
  separator = ''
): TtsSegment => ({
  __typename: 'TtsSegment',
  alphabet: TtsAlphabet.Ipa,
  lang: 'en',
  surface,
  pronunciation,
  fallbackText,
  separator,
});

describe('wrapPhoneme', () => {
  it('ローマ字の表記を持つセグメントはphonemeタグに変換する', () => {
    const result = wrapPhoneme(
      [ipaSegment('Osaki', 'oːsaki')],
      'Osaki fallback'
    );
    expect(result).toBe('<phoneme alphabet="ipa" ph="oːsaki">Osaki</phoneme>');
  });

  it('表記が日本語のセグメントはローマ字名(fallback)全体へフォールバックする', () => {
    // surface が「あかさか」で fallbackText 未設定の駅データ。ネイティブ TTS は
    // IPA を解釈せず中身の表記を読むため、英語文に日本語が混入して TTS エンジンが
    // 言語を誤判定し、日本語音声で合成されてしまう (例: "Arriving at あかさか")
    const result = wrapPhoneme([ipaSegment('あかさか', 'akasaka')], 'Akasaka');
    expect(result).toBe('Akasaka');
  });

  it('fallbackTextがローマ字なら日本語surfaceでもセグメントを使う', () => {
    const result = wrapPhoneme(
      [ipaSegment('あかさか', 'akasaka', 'Akasaka')],
      'Akasaka Station'
    );
    expect(result).toBe(
      '<phoneme alphabet="ipa" ph="akasaka">Akasaka</phoneme>'
    );
  });

  it('日本語表記でもfallbackが無い場合はセグメント出力を維持する', () => {
    const result = wrapPhoneme([ipaSegment('あかさか', 'akasaka')], null);
    expect(result).toBe(
      '<phoneme alphabet="ipa" ph="akasaka">あかさか</phoneme>'
    );
  });

  it('セグメントが空の場合はfallbackを返す', () => {
    expect(wrapPhoneme([], 'Osaki')).toBe('Osaki');
    expect(wrapPhoneme(null, 'Osaki')).toBe('Osaki');
  });

  it('phonemeのph属性(IPA)は日本語混入判定の対象にしない', () => {
    // IPA 記号自体は日本語文字ではないが、判定はタグ除去後の可視テキストのみで行う
    const result = wrapPhoneme(
      [ipaSegment('Shinjuku', 'ɕiɲdʑɯkɯ')],
      'Shinjuku'
    );
    expect(result).toBe(
      '<phoneme alphabet="ipa" ph="ɕiɲdʑɯkɯ">Shinjuku</phoneme>'
    );
  });
});

describe('stripJapaneseCharacters', () => {
  it('英語文に混入した日本語の連続を除去する', () => {
    expect(stripJapaneseCharacters('Arriving at あかさか K 7.')).toBe(
      'Arriving at K 7.'
    );
  });

  it('全角記号・句読点も含めて除去する', () => {
    expect(
      stripJapaneseCharacters('The next stop is 大崎・品川方面、 Osaki.')
    ).toBe('The next stop is Osaki.');
  });

  it('日本語を含まないテキストはそのまま返す', () => {
    expect(stripJapaneseCharacters('Arriving at Akasaka K 7.')).toBe(
      'Arriving at Akasaka K 7.'
    );
  });
});

describe('containsJapaneseCharacters', () => {
  it.each([
    ['あかさか', true],
    ['アカサカ', true],
    ['赤坂', true],
    ['ｱｶｻｶ', true],
    ['Arriving at あかさか K 7.', true],
    ['Arriving at Akasaka K 7.', false],
    ['Ōsaki', false],
  ])('%s → %s', (text, expected) => {
    expect(containsJapaneseCharacters(text)).toBe(expected);
  });
});
