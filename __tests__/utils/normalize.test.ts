import { normalizeRomanText } from '../../src/utils/normalize'

describe('utils/normalize.ts', () => {
  it('text: TOKYO', () => {
    expect(normalizeRomanText('TOKYO')).toBe('Tokyo')
  })

  it.each(['tokyo', 'Tokyo', 'tOkyo'])('text: %s', (text) => {
    expect(normalizeRomanText(text)).toBe(text)
  })
})
