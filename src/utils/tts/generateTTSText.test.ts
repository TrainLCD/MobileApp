import { TOEI_SHINJUKU_LINE_LOCAL } from '~/__fixtures__/line';
import { TOEI_SHINJUKU_LINE_STATIONS } from '~/__fixtures__/station';
import { APP_THEME } from '../../models/Theme';
import { generateTTSText, type TTSTextData } from './generateTTSText';

describe('generateTTSText', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const createBaseData = (
    overrides: Partial<TTSTextData> = {}
  ): TTSTextData => {
    const stations = TOEI_SHINJUKU_LINE_STATIONS;
    const lastStation = stations.at(-1);
    return {
      theme: APP_THEME.TY,
      firstSpeech: false,
      stoppingState: 'NEXT',
      currentLine: TOEI_SHINJUKU_LINE_LOCAL,
      currentStation: stations[0],
      nextStation: stations[1],
      afterNextStation: stations[2],
      selectedBound: lastStation ?? null,
      transferLines: [],
      connectedLines: [],
      currentTrainType: null,
      isLoopLine: false,
      isPartiallyLoopLine: false,
      loopLineBoundJa: undefined,
      loopLineBoundEn: undefined,
      directionalStops: lastStation ? [lastStation] : [],
      slicedStations: stations,
      isNextStopTerminus: false,
      isAfterNextStopTerminus: false,
      nextStationNumber: undefined,
      ...overrides,
    };
  };

  describe('betweenNextStation guard against findIndex returning -1', () => {
    test('should not throw when nextStation is not in slicedStations', () => {
      const data = createBaseData({
        theme: APP_THEME.JR_WEST,
        nextStation: {
          ...TOEI_SHINJUKU_LINE_STATIONS[1],
          groupId: 99999999, // not in slicedStations
        },
      });

      expect(() => generateTTSText(data)).not.toThrow();
      const result = generateTTSText(data);
      expect(result).toHaveLength(2);
    });

    test('should not throw when afterNextStation is not in slicedStations', () => {
      const data = createBaseData({
        theme: APP_THEME.JR_WEST,
        afterNextStation: {
          ...TOEI_SHINJUKU_LINE_STATIONS[2],
          groupId: 99999999, // not in slicedStations
        },
      });

      expect(() => generateTTSText(data)).not.toThrow();
      const result = generateTTSText(data);
      expect(result).toHaveLength(2);
    });

    test('should not throw when both nextStation and afterNextStation are not in slicedStations', () => {
      const data = createBaseData({
        theme: APP_THEME.JR_WEST,
        nextStation: {
          ...TOEI_SHINJUKU_LINE_STATIONS[1],
          groupId: 88888888,
        },
        afterNextStation: {
          ...TOEI_SHINJUKU_LINE_STATIONS[2],
          groupId: 99999999,
        },
      });

      expect(() => generateTTSText(data)).not.toThrow();
      const result = generateTTSText(data);
      expect(result).toHaveLength(2);
    });
  });

  describe('nextStationNumberText empty string handling', () => {
    test('should not produce "Name ." when nextStationNumber is undefined (TY theme)', () => {
      const data = createBaseData({
        theme: APP_THEME.TY,
        nextStationNumber: undefined,
      });

      const result = generateTTSText(data);
      expect(result).toHaveLength(2);
      const [, enText] = result;

      // Should not have double spaces or " ." pattern
      expect(enText).not.toMatch(/\s\.\s/);
      expect(enText).not.toMatch(/\s{2,}/);
    });

    test('should not produce "Name ." when nextStationNumber is undefined (YAMANOTE theme)', () => {
      const data = createBaseData({
        theme: APP_THEME.YAMANOTE,
        nextStationNumber: undefined,
      });

      const result = generateTTSText(data);
      expect(result).toHaveLength(2);
      const [, enText] = result;

      expect(enText).not.toMatch(/\s\.\s/);
      expect(enText).not.toMatch(/\s{2,}/);
    });

    test('should not produce "Name ." when nextStationNumber is undefined (TOEI theme)', () => {
      const data = createBaseData({
        theme: APP_THEME.TOEI,
        nextStationNumber: undefined,
      });

      const result = generateTTSText(data);
      expect(result).toHaveLength(2);
      const [, enText] = result;

      expect(enText).not.toMatch(/\s\.\s/);
      expect(enText).not.toMatch(/\s{2,}/);
    });

    test('should not produce "Name ." when nextStationNumber is undefined (JR_KYUSHU theme)', () => {
      const data = createBaseData({
        theme: APP_THEME.JR_KYUSHU,
        nextStationNumber: undefined,
      });

      const result = generateTTSText(data);
      expect(result).toHaveLength(2);
      const [, enText] = result;

      expect(enText).not.toMatch(/\s\.\s/);
      expect(enText).not.toMatch(/\s{2,}/);
    });

    test('should include station number when nextStationNumber is provided', () => {
      const data = createBaseData({
        theme: APP_THEME.TY,
        nextStationNumber: {
          stationNumber: 'S-02',
          lineSymbol: 'S',
        },
      });

      const result = generateTTSText(data);
      expect(result).toHaveLength(2);
      const [, enText] = result;

      expect(enText).toContain('S 2');
    });

    test('should handle ARRIVING state with empty nextStationNumber (TY theme)', () => {
      const data = createBaseData({
        theme: APP_THEME.TY,
        stoppingState: 'ARRIVING',
        nextStationNumber: undefined,
      });

      const result = generateTTSText(data);
      expect(result).toHaveLength(2);
      const [, enText] = result;

      expect(enText).not.toMatch(/\s\.\s/);
      expect(enText).not.toMatch(/\s{2,}/);
    });

    test('should handle ARRIVING state with empty nextStationNumber (YAMANOTE theme)', () => {
      const data = createBaseData({
        theme: APP_THEME.YAMANOTE,
        stoppingState: 'ARRIVING',
        nextStationNumber: undefined,
      });

      const result = generateTTSText(data);
      expect(result).toHaveLength(2);
      const [, enText] = result;

      expect(enText).not.toMatch(/\s\.\s/);
      expect(enText).not.toMatch(/\s{2,}/);
    });
  });

  describe('station number in English text by theme', () => {
    test('TOKYO_METRO: should include "Station Number" prefix', () => {
      const data = createBaseData({
        theme: APP_THEME.TOKYO_METRO,
        nextStationNumber: {
          stationNumber: 'S-05',
          lineSymbol: null, // lineSymbolがないと"Station Number"プレフィックスが付く
        },
      });

      const result = generateTTSText(data);
      const [, enText] = result;

      expect(enText).toContain('Station Number S 5');
    });

    test('TOKYO_METRO: should not include "Station Number" prefix when lineSymbol exists', () => {
      const data = createBaseData({
        theme: APP_THEME.TOKYO_METRO,
        nextStationNumber: {
          stationNumber: 'S-05',
          lineSymbol: 'S',
        },
      });

      const result = generateTTSText(data);
      const [, enText] = result;

      expect(enText).toContain('S 5');
      expect(enText).not.toContain('Station Number S 5');
    });

    test('JR_WEST: should use "station number" format', () => {
      const data = createBaseData({
        theme: APP_THEME.JR_WEST,
        nextStationNumber: {
          stationNumber: 'A-01',
          lineSymbol: 'A',
        },
      });

      const result = generateTTSText(data);
      const [, enText] = result;

      expect(enText).toContain('station number A 1');
    });

    test('YAMANOTE: should include station number in NEXT state', () => {
      const data = createBaseData({
        theme: APP_THEME.YAMANOTE,
        stoppingState: 'NEXT',
        nextStationNumber: {
          stationNumber: 'JY-15',
          lineSymbol: 'JY',
        },
      });

      const result = generateTTSText(data);
      const [, enText] = result;

      expect(enText).toContain('J Y 15');
    });

    test('YAMANOTE: should include station number in ARRIVING state', () => {
      const data = createBaseData({
        theme: APP_THEME.YAMANOTE,
        stoppingState: 'ARRIVING',
        nextStationNumber: {
          stationNumber: 'JY-15',
          lineSymbol: 'JY',
        },
      });

      const result = generateTTSText(data);
      const [, enText] = result;

      expect(enText).toContain('J Y 15');
    });

    test('TOEI: should include station number', () => {
      const data = createBaseData({
        theme: APP_THEME.TOEI,
        nextStationNumber: {
          stationNumber: 'E-23',
          lineSymbol: 'E',
        },
      });

      const result = generateTTSText(data);
      const [, enText] = result;

      expect(enText).toContain('E 23');
    });

    test('JR_KYUSHU: should include station number', () => {
      const data = createBaseData({
        theme: APP_THEME.JR_KYUSHU,
        nextStationNumber: {
          stationNumber: 'JB-10',
          lineSymbol: 'JB',
        },
      });

      const result = generateTTSText(data);
      const [, enText] = result;

      expect(enText).toContain('J B 10');
    });

    test('should handle three-part station number (e.g., A-1-2)', () => {
      const data = createBaseData({
        theme: APP_THEME.TY,
        nextStationNumber: {
          stationNumber: 'DT-1-2',
          lineSymbol: 'DT',
        },
      });

      const result = generateTTSText(data);
      const [, enText] = result;

      expect(enText).toContain('D T 1-2');
    });

    test('should handle simple numeric station number', () => {
      const data = createBaseData({
        theme: APP_THEME.TY,
        nextStationNumber: {
          stationNumber: '123',
          lineSymbol: null,
        },
      });

      const result = generateTTSText(data);
      const [, enText] = result;

      expect(enText).toContain('Station Number 123');
    });
  });
});
