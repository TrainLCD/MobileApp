import { PixelRatio, Platform } from 'react-native';
import {
  numberingGlyphLift,
  numberingStackedGlyphLift,
} from './numberingGlyphLift';

describe('numberingGlyphLift', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS });
    jest.clearAllMocks();
  });

  const setOS = (os: typeof Platform.OS) =>
    Object.defineProperty(Platform, 'OS', { value: os });

  const translateY = (transform: { translateY: number }[]) =>
    transform[0].translateY;

  it('iOSではどのフォントでも補正しない', () => {
    setOS('ios');
    expect(numberingGlyphLift(24, 'FrutigerNeueLTProBold')).toEqual([]);
    expect(numberingGlyphLift(24, 'FuturaLTPro')).toEqual([]);
    expect(numberingGlyphLift(24, 'MyriadPro')).toEqual([]);
    expect(numberingGlyphLift(24, 'VerdanaBold')).toEqual([]);
    expect(
      numberingStackedGlyphLift(
        { fontSize: 24, font: 'FrutigerNeueLTProBold' },
        { fontSize: 32, font: 'FrutigerNeueLTProBold' }
      )
    ).toEqual([]);
  });

  // FrutigerNeueLTPro-Bold は ink が行ボックスの下寄りに描かれるため上へ持ち上げる
  it('下寄りに描画されるフォントは上方向(負)へ補正する', () => {
    setOS('android');
    for (const fontSize of [8, 10, 12, 20, 24, 30, 32, 45, 48]) {
      expect(
        translateY(numberingGlyphLift(fontSize, 'FrutigerNeueLTProBold'))
      ).toBeLessThan(0);
      expect(
        translateY(numberingGlyphLift(fontSize, 'VerdanaBold'))
      ).toBeLessThan(0);
    }
  });

  // myriadpro-bold / FuturaLTPro-Bold は逆に上寄りなので押し下げる
  it('上寄りに描画されるフォントは下方向(正)へ補正する', () => {
    setOS('android');
    for (const fontSize of [10, 16, 22, 24, 35]) {
      expect(
        translateY(numberingGlyphLift(fontSize, 'MyriadPro'))
      ).toBeGreaterThan(0);
      expect(
        translateY(numberingGlyphLift(fontSize, 'FuturaLTPro'))
      ).toBeGreaterThan(0);
    }
  });

  it('補正量は文字サイズに対して単調に増える', () => {
    setOS('android');
    const lifts = [8, 12, 20, 24, 32, 48].map((fontSize) =>
      Math.abs(
        translateY(numberingGlyphLift(fontSize, 'FrutigerNeueLTProBold'))
      )
    );
    for (let i = 1; i < lifts.length; i++) {
      expect(lifts[i]).toBeGreaterThanOrEqual(lifts[i - 1]);
    }
  });

  it('文字がぼやけないよう物理ピクセル境界に丸める', () => {
    setOS('android');
    const lift = translateY(numberingGlyphLift(24, 'FrutigerNeueLTProBold'));
    expect(PixelRatio.roundToNearestPixel(lift)).toBe(lift);
  });
});

describe('numberingStackedGlyphLift', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS });
    jest.clearAllMocks();
  });

  const setOS = (os: typeof Platform.OS) =>
    Object.defineProperty(Platform, 'OS', { value: os });

  const translateY = (transform: { translateY: number }[]) =>
    transform[0].translateY;

  it('番号が大きいほど ink 全体は下に伸びるので補正は下方向へ寄る', () => {
    setOS('android');
    const symbol = { fontSize: 22, font: 'FrutigerNeueLTProBold' } as const;
    const small = numberingStackedGlyphLift(symbol, {
      fontSize: 26,
      font: 'FrutigerNeueLTProBold',
    });
    const large = numberingStackedGlyphLift(symbol, {
      fontSize: 40,
      font: 'FrutigerNeueLTProBold',
    });
    expect(translateY(large)).toBeGreaterThan(translateY(small));
  });

  it('記号と番号が同じ行なら単独行の補正と一致する', () => {
    setOS('android');
    const line = { fontSize: 30, font: 'FrutigerNeueLTProBold' } as const;
    expect(numberingStackedGlyphLift(line, line)).toEqual(
      numberingGlyphLift(line.fontSize, line.font)
    );
  });

  it('記号と番号でフォントが違っても両方のメトリクスから求める', () => {
    setOS('android');
    const symbol = { fontSize: 22, font: 'FuturaLTPro' } as const;
    const sameFont = numberingStackedGlyphLift(symbol, {
      fontSize: 35,
      font: 'FuturaLTPro',
    });
    const mixedFont = numberingStackedGlyphLift(symbol, {
      fontSize: 35,
      font: 'MyriadPro',
    });
    expect(translateY(mixedFont)).not.toBe(translateY(sameFont));
  });
});
