import { getRunningLayout } from './runningLayout';

describe('getRunningLayout', () => {
  it.each([
    [360, 360],
    [360, 374],
    [374, 360],
    [400, 480],
    [480, 400],
  ])('uses square UI at %i × %i without the portrait toggle', (w, h) => {
    expect(getRunningLayout(w, h, false)).toBe('square');
    expect(getRunningLayout(w, h, true)).toBe('square');
  });
  it('keeps ordinary phones and tablets on their existing layout', () => {
    expect(getRunningLayout(390, 844, false)).toBe('landscape');
    expect(getRunningLayout(390, 844, true)).toBe('portrait');
    expect(getRunningLayout(844, 390, true)).toBe('landscape');
    expect(getRunningLayout(768, 1024, true)).toBe('portrait');
    expect(getRunningLayout(400, 481, true)).toBe('portrait');
  });
  it.each([
    [0, 0],
    [0, 360],
    [Number.NaN, 360],
    [Number.POSITIVE_INFINITY, 360],
  ])('does not select square for invalid dimensions', (w, h) => {
    expect(getRunningLayout(w, h, false)).not.toBe('square');
  });
});
