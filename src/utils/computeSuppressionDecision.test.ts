import { computeSuppressionDecision } from './computeSuppressionDecision';

const createParams = (
  overrides: Partial<{
    suppressPostFirstSpeech: boolean;
    firstSpeech: boolean;
    suppressFirstSpeechUntilDeparture: boolean;
    arrived: boolean;
    stoppingStateChanged: boolean;
  }> = {}
) => ({
  suppressPostFirstSpeechRef: {
    current: overrides.suppressPostFirstSpeech ?? false,
  },
  firstSpeechRef: { current: overrides.firstSpeech ?? false },
  suppressFirstSpeechUntilDepartureRef: {
    current: overrides.suppressFirstSpeechUntilDeparture ?? false,
  },
  arrived: overrides.arrived ?? false,
  stoppingStateChanged: overrides.stoppingStateChanged ?? false,
});

describe('computeSuppressionDecision', () => {
  it('抑制条件に該当しない場合はfalseを返す', () => {
    const params = createParams();
    expect(computeSuppressionDecision(params)).toBe(false);
  });

  describe('Post-first-speech 抑制', () => {
    it('suppressPostFirstSpeechが有効でstoppingState未変化なら抑制してフラグをクリアする', () => {
      const params = createParams({ suppressPostFirstSpeech: true });
      expect(computeSuppressionDecision(params)).toBe(true);
      expect(params.suppressPostFirstSpeechRef.current).toBe(false);
    });

    it('suppressPostFirstSpeechが有効でもstoppingStateが変化していれば抑制しない', () => {
      const params = createParams({
        suppressPostFirstSpeech: true,
        stoppingStateChanged: true,
      });
      expect(computeSuppressionDecision(params)).toBe(false);
      expect(params.suppressPostFirstSpeechRef.current).toBe(false);
    });

    it('他の抑制条件より優先して評価される', () => {
      const params = createParams({
        suppressPostFirstSpeech: true,
        firstSpeech: true,
        suppressFirstSpeechUntilDeparture: true,
        arrived: true,
      });
      expect(computeSuppressionDecision(params)).toBe(true);
      // suppress-until-departureのフラグは変更されない
      expect(params.suppressFirstSpeechUntilDepartureRef.current).toBe(true);
    });
  });

  describe('Suppress-until-departure 抑制', () => {
    it('停車中(arrived=true)は初回TTSを抑止する', () => {
      const params = createParams({
        firstSpeech: true,
        suppressFirstSpeechUntilDeparture: true,
        arrived: true,
      });
      expect(computeSuppressionDecision(params)).toBe(true);
    });

    it('発車後(arrived=false)に抑制を解除してfalseを返す', () => {
      const params = createParams({
        firstSpeech: true,
        suppressFirstSpeechUntilDeparture: true,
        arrived: false,
      });
      expect(computeSuppressionDecision(params)).toBe(false);
      expect(params.suppressFirstSpeechUntilDepartureRef.current).toBe(false);
    });

    it('firstSpeechがfalseの場合は抑制しない', () => {
      const params = createParams({
        firstSpeech: false,
        suppressFirstSpeechUntilDeparture: true,
        arrived: true,
      });
      expect(computeSuppressionDecision(params)).toBe(false);
    });
  });
});
