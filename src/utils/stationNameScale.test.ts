import { Dimensions } from 'react-native';
import { calcStationNameMinScale } from './stationNameScale';

describe('calcStationNameMinScale', () => {
  const mockDimensionsGet = jest.spyOn(Dimensions, 'get');

  beforeEach(() => {
    // 実機のスマートフォン相当の画面幅でクランプ・補間挙動を再現する
    mockDimensionsGet.mockReturnValue({
      width: 400,
      height: 800,
      scale: 1,
      fontScale: 1,
    } as ReturnType<typeof Dimensions.get>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('空文字は早期 return で 1 を返す', () => {
    expect(calcStationNameMinScale('', 0.6, 50)).toBe(1);
  });

  it('短い駅名は上限 1 にクランプされる', () => {
    expect(calcStationNameMinScale('あ', 0.6, 50)).toBe(1);
  });

  it('極端に長い駅名はフロア値 0.1 にクランプされる', () => {
    expect(calcStationNameMinScale('あ'.repeat(1000), 0.6, 50)).toBe(0.1);
  });

  it('中間長の駅名は (0.1, 1) の範囲内のスケールを返す', () => {
    const scale = calcStationNameMinScale(
      'はねだくうこうだいさんたーみなる',
      0.55,
      45
    );
    expect(scale).toBeGreaterThan(0.1);
    expect(scale).toBeLessThan(1);
  });

  it('文字数に応じて単調にスケールが減少する', () => {
    const shortScale = calcStationNameMinScale('みと', 0.55, 45);
    const midScale = calcStationNameMinScale('はねだくうこう', 0.55, 45);
    const longScale = calcStationNameMinScale(
      'ちょうじゃがはまましおさいはまなすこうえんまえ',
      0.55,
      45
    );
    expect(shortScale).toBeGreaterThanOrEqual(midScale);
    expect(midScale).toBeGreaterThan(longScale);
  });
});
