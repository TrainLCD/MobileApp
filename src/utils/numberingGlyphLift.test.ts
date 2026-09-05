import { Platform } from 'react-native';
import { numberingGlyphLift } from './numberingGlyphLift';

describe('numberingGlyphLift', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS });
    jest.clearAllMocks();
  });

  const setOS = (os: typeof Platform.OS) =>
    Object.defineProperty(Platform, 'OS', { value: os });

  it('iOSでは補正しない', () => {
    setOS('ios');
    expect(numberingGlyphLift(24)).toEqual([]);
  });

  // FrutigerNeueLTPro-Bold のメトリクスから導かれる比率は約 0.084em
  it('Androidでは行の高さに比例して上方向へ補正する', () => {
    setOS('android');
    expect(numberingGlyphLift(8)).toEqual([{ translateY: -1 }]);
    expect(numberingGlyphLift(24)).toEqual([{ translateY: -2 }]);
    expect(numberingGlyphLift(36)).toEqual([{ translateY: -3 }]);
  });

  it('補正量は行の高さに対して単調増加する', () => {
    setOS('android');
    const lifts = [8, 12, 20, 24, 32, 48].map(
      (lh) => -numberingGlyphLift(lh)[0].translateY
    );
    for (let i = 1; i < lifts.length; i++) {
      expect(lifts[i]).toBeGreaterThanOrEqual(lifts[i - 1]);
    }
  });

  it('補正量は常に上方向(負)になる', () => {
    setOS('android');
    for (const lineHeight of [8, 10, 12, 17, 20, 24, 30, 32, 45, 48]) {
      const [{ translateY }] = numberingGlyphLift(lineHeight);
      expect(translateY).toBeLessThan(0);
    }
  });
});
