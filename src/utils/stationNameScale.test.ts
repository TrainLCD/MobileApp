import { Dimensions } from 'react-native';
import { calcStationNameScaleX } from './stationNameScale';

describe('calcStationNameScaleX', () => {
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
    expect(calcStationNameScaleX('', 0.6, 50)).toBe(1);
  });

  it('短い駅名は上限 1 にクランプされる（圧縮しない）', () => {
    expect(calcStationNameScaleX('あ', 0.6, 50)).toBe(1);
  });

  it('極端に長い駅名はフロア値 0.5 にクランプされる', () => {
    expect(calcStationNameScaleX('あ'.repeat(1000), 0.6, 50)).toBe(0.5);
  });

  it('中間長の駅名は (0.5, 1) の範囲内の圧縮率を返す', () => {
    const scaleX = calcStationNameScaleX('はねだくうこうだい', 0.55, 45);
    expect(scaleX).toBeGreaterThan(0.5);
    expect(scaleX).toBeLessThan(1);
  });

  it('文字数に応じて単調に圧縮率が減少する', () => {
    const shortScaleX = calcStationNameScaleX('みと', 0.55, 45);
    const midScaleX = calcStationNameScaleX('はねだくうこう', 0.55, 45);
    const longScaleX = calcStationNameScaleX(
      'ちょうじゃがはまましおさいはまなすこうえんまえ',
      0.55,
      45
    );
    expect(shortScaleX).toBeGreaterThanOrEqual(midScaleX);
    expect(midScaleX).toBeGreaterThan(longScaleX);
  });
});
