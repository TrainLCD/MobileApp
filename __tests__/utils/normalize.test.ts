import { normalizeRomanText } from '../../src/utils/normalize'

describe('utils/normalize.ts', () => {
  it('Should be normalized', () => {
    expect(normalizeRomanText('TOKYO')).toBe('Tokyo')
    expect(normalizeRomanText('MEITETSU NAGOYA')).toBe('Meitetsu nagoya')
    expect(normalizeRomanText('JR Kobe Line')).toBe('J-R Kobe Line')
  })

  it.each(['tokyo', 'Tokyo', 'tOkyo'])('text: %s', (text) => {
    expect(normalizeRomanText(text)).toBe(text)
  })
})
