import { fixEnglishReading } from './englishReading';

describe('fixEnglishReading', () => {
  it('路線名の「Keisei」を英語 TTS が「けいせい」と読む表記へ置換する', () => {
    expect(fixEnglishReading('Change here for the Keisei Main Line.')).toBe(
      'Change here for the Kay-say Main Line.'
    );
  });

  it('ハイフン連結の駅名でも語単位で置換する', () => {
    expect(fixEnglishReading('The next station is Keisei-Ueno.')).toBe(
      'The next station is Kay-say-Ueno.'
    );
  });

  it('会社名など 1 文中の複数箇所をすべて置換する', () => {
    expect(
      fixEnglishReading('Keisei Electric Railway operates the Keisei Line.')
    ).toBe('Kay-say Electric Railway operates the Kay-say Line.');
  });

  it('大文字小文字を問わず置換する', () => {
    expect(fixEnglishReading('KEISEI SKYLINER and keisei bus')).toBe(
      'Kay-say SKYLINER and Kay-say bus'
    );
  });

  it('「Seibu」を英語 TTS が「せいぶ」と読む表記へ置換する', () => {
    expect(fixEnglishReading('Change here for the Seibu Ikebukuro Line.')).toBe(
      'Change here for the Say-boo Ikebukuro Line.'
    );
    expect(fixEnglishReading('The next station is Seibu-Shinjuku.')).toBe(
      'The next station is Say-boo-Shinjuku.'
    );
  });

  it('「Mine」を英語 TTS が「みね」と読む表記へ置換する', () => {
    expect(fixEnglishReading('Change here for the Mine Line.')).toBe(
      'Change here for the Me-nay Line.'
    );
    expect(fixEnglishReading('The next station is MINE.')).toBe(
      'The next station is Me-nay.'
    );
    expect(fixEnglishReading('The next station is Nishi-Mine.')).toBe(
      'The next station is Nishi-Me-nay.'
    );
  });

  it('語中の「mine」も前後にハイフンを挟んで置換する', () => {
    expect(fixEnglishReading('The next station is Tsurugamine.')).toBe(
      'The next station is Tsuruga-me-nay.'
    );
    expect(fixEnglishReading('Mitsumineguchi')).toBe('Mitsu-me-nay-guchi');
    expect(fixEnglishReading('Minenobu')).toBe('Me-nay-nobu');
    expect(fixEnglishReading('Takamine')).toBe('Taka-me-nay');
    // マクロン付きの文字も語の一部として扱う
    expect(fixEnglishReading('Minami-Ōmine')).toBe('Minami-Ō-me-nay');
  });

  it('二重に適用しても結果が変わらない', () => {
    expect(fixEnglishReading(fixEnglishReading('Mine Line'))).toBe(
      'Me-nay Line'
    );
    expect(fixEnglishReading(fixEnglishReading('Tsurugamine'))).toBe(
      'Tsuruga-me-nay'
    );
  });

  it('別語の一部は置換しない', () => {
    expect(fixEnglishReading('Keiseibus')).toBe('Keiseibus');
    // 西武園 (Seibuen) は 1 語なので語単位の一致では対象外
    expect(fixEnglishReading('Seibuen')).toBe('Seibuen');
    expect(fixEnglishReading('Minami-Urawa')).toBe('Minami-Urawa');
  });

  it('対象を含まないテキストはそのまま返す', () => {
    expect(fixEnglishReading('The next station is Osaki.')).toBe(
      'The next station is Osaki.'
    );
  });
});
