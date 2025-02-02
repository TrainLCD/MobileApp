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
});
