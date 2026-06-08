import { normalizeRomanText } from './normalize';

describe('utils/normalize.ts', () => {
  it('Should be normalized', () => {
    expect(normalizeRomanText('TOKYO')).toBe('Tokyo');
    expect(normalizeRomanText('MEITETSU NAGOYA')).toBe('Meitetsu Nagoya');
    expect(
      normalizeRomanText('Nagoya Main Line bound for MEITETSU GIFU.')
    ).toBe('Nagoya Main Line bound for Meitetsu Gifu.');
    expect(normalizeRomanText('JR Kobe Line')).toBe('J-R Kobe Line');
  });

  it.each(['Tokyo', 'tOkyo'])('text: %s', (text) => {
    expect(normalizeRomanText(text)).toBe('Tokyo');
  });

  it('should not modify SSML/XML tags', () => {
    expect(
      normalizeRomanText(
        '<phoneme alphabet="ipa" ph="çɯɯga" xml:lang="ja-JP">HYUGA</phoneme>'
      )
    ).toBe(
      '<phoneme alphabet="ipa" ph="çɯɯga" xml:lang="ja-JP">Hyuga</phoneme>'
    );
  });

  it('should handle mixed text and SSML tags', () => {
    expect(
      normalizeRomanText(
        'The next stop is <phoneme alphabet="ipa" ph="naɾɯtoː" xml:lang="ja-JP">NARUTO</phoneme>.'
      )
    ).toBe(
      'The next stop is <phoneme alphabet="ipa" ph="naɾɯtoː" xml:lang="ja-JP">Naruto</phoneme>.'
    );
  });
});
