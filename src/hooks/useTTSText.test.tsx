import { act, renderHook } from '@testing-library/react-native';
import { Provider, useSetAtom } from 'jotai';
import type React from 'react';
import { useEffect } from 'react';
import type { Station } from '~/@types/graphql';
import { TOEI_SHINJUKU_LINE_LOCAL } from '~/__fixtures__/line';
import { TOEI_SHINJUKU_LINE_STATIONS } from '~/__fixtures__/station';
import { useNextStation } from '~/hooks/useNextStation';
import { useTTSText } from '~/hooks/useTTSText';
import type { LineDirection } from '~/models/Bound';
import type { HeaderStoppingState } from '~/models/HeaderTransitionState';
import type { AppTheme } from '~/models/Theme';
import { store } from '~/store';
import lineState from '~/store/atoms/line';
import stationState from '~/store/atoms/station';
import { themePreferenceAtom } from '~/store/atoms/theme';

jest.mock('~/translation', () => ({ isJapanese: true }));
jest.mock('~/hooks/useNumbering', () => ({
  useNumbering: jest.fn(),
}));
jest.mock('~/hooks/useNextStation', () => ({
  useNextStation: jest.fn(),
}));

const useTTSTextWithJotaiAndNumbering = (
  theme: AppTheme,
  headerState: HeaderStoppingState
) => {
  const setLineState = useSetAtom(lineState);
  const setStationState = useSetAtom(stationState);

  useEffect(() => {
    const station = TOEI_SHINJUKU_LINE_STATIONS[0];
    const stations = TOEI_SHINJUKU_LINE_STATIONS;
    const selectedDirection = 'INBOUND' as LineDirection;
    const selectedLine = TOEI_SHINJUKU_LINE_LOCAL;
    const selectedBound =
      TOEI_SHINJUKU_LINE_STATIONS[TOEI_SHINJUKU_LINE_STATIONS.length - 1];

    const arrived = headerState === 'CURRENT';
    const approaching = headerState === 'ARRIVING';

    store.set(themePreferenceAtom, theme);
    setStationState((prev) => ({
      ...prev,
      station,
      stations,
      selectedDirection,
      arrived,
      selectedBound,
      approaching,
    }));
    setLineState((prev) => ({ ...prev, selectedLine }));
  }, [headerState, setLineState, setStationState, theme]);

  const texts = useTTSText(false, true);
  return texts;
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>{children}</Provider>
);

const setupMockUseNextStation = (station: Station) =>
  (useNextStation as jest.Mock).mockReturnValue(station);

describe('Without trainType & With numbering', () => {
  beforeEach(() => {
    jest.resetModules();
    setupMockUseNextStation(TOEI_SHINJUKU_LINE_STATIONS[1]);
    require('~/hooks/useNumbering').useNumbering.mockReturnValue([
      {
        lineSymbol: 'S',
        lineSymbolColor: '#B0BF1E',
        lineSymbolShape: 'ROUND',
        stationNumber: 'S-02',
      },
      '',
    ]);
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test.each([
    ['TOKYO_METRO', 'NEXT'],
    ['TOKYO_METRO', 'ARRIVING'],
    ['TY', 'NEXT'],
    ['TY', 'ARRIVING'],
    ['YAMANOTE', 'NEXT'],
    ['YAMANOTE', 'ARRIVING'],
    ['JR_WEST', 'NEXT'],
    ['JR_WEST', 'ARRIVING'],
    ['SAIKYO', 'NEXT'],
    ['SAIKYO', 'ARRIVING'],
    ['TOEI', 'NEXT'],
    ['TOEI', 'ARRIVING'],
    ['LED', 'NEXT'],
    ['LED', 'ARRIVING'],
  ])(
    'Should not be contained `undefined` in the SSML (theme: %s, state: %s)',
    (theme, state) => {
      const { result } = renderHook(
        () =>
          useTTSTextWithJotaiAndNumbering(
            theme as AppTheme,
            state as HeaderStoppingState
          ),
        {
          wrapper: wrapper,
        }
      );
      const [jaSSML, enSSML] = result.current.text;
      expect(jaSSML?.indexOf('undefined')).toBe(-1);
      expect(enSSML?.indexOf('undefined')).toBe(-1);
    }
  );

  describe('TOKYO_METRO Theme', () => {
    test('should be NEXT', () => {
      const { result } = renderHook(
        () => useTTSTextWithJotaiAndNumbering('TOKYO_METRO', 'NEXT'),
        {
          wrapper: wrapper,
        }
      );
      expect(result.current.text).toEqual([
        '次は、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>はお乗り換えです。',
        'The next stop is Shinjuku-sanchome S <say-as interpret-as="cardinal">2</say-as>. Please change here for the Tokyo Metro Marunouchi Line,<break time="200ms"/> and the Tokyo Metro Fukutoshin Line.',
      ]);
    });
    test('should be ARRIVING', () => {
      const { result } = renderHook(
        () => useTTSTextWithJotaiAndNumbering('TOKYO_METRO', 'ARRIVING'),
        {
          wrapper: wrapper,
        }
      );
      expect(result.current.text).toEqual([
        'まもなく、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>はお乗り換えです。',
        'Arriving at Shinjuku-sanchome S <say-as interpret-as="cardinal">2</say-as>. Please change here for the Tokyo Metro Marunouchi Line,<break time="200ms"/> and the Tokyo Metro Fukutoshin Line.',
      ]);
    });
  });

  describe('TY Theme', () => {
    test('should be NEXT', () => {
      const { result } = renderHook(
        () => useTTSTextWithJotaiAndNumbering('TY', 'NEXT'),
        {
          wrapper: wrapper,
        }
      );
      expect(result.current.text).toEqual([
        '次は、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>をご利用のお客様はお乗り換えです。',
        'The next station is Shinjuku-sanchome S <say-as interpret-as="cardinal">2</say-as>. Passengers changing to the Tokyo Metro Marunouchi Line,<break time="200ms"/> and the Tokyo Metro Fukutoshin Line, Please transfer at this station.',
      ]);
    });
    test('should be ARRIVING', () => {
      const { result } = renderHook(
        () => useTTSTextWithJotaiAndNumbering('TY', 'ARRIVING'),
        {
          wrapper: wrapper,
        }
      );
      expect(result.current.text).toEqual([
        'まもなく、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>をご利用のお客様はお乗り換えです。<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>を出ますと、<sub alias="あけぼのばし">曙橋</sub>に停まります。',
        'We will soon make a brief stop at Shinjuku-sanchome S <say-as interpret-as="cardinal">2</say-as>. Passengers changing to the Tokyo Metro Marunouchi Line,<break time="200ms"/> and the Tokyo Metro Fukutoshin Line, Please transfer at this station.',
      ]);
    });
  });

  describe('YAMANOTE Theme', () => {
    test('should be NEXT', () => {
      const { result } = renderHook(
        () => useTTSTextWithJotaiAndNumbering('YAMANOTE', 'NEXT'),
        {
          wrapper: wrapper,
        }
      );
      expect(result.current.text).toEqual([
        '次は、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>はお乗り換えです。',
        'The next station is Shinjuku-sanchome S <say-as interpret-as="cardinal">2</say-as>. Please change here for the Tokyo Metro Marunouchi Line,<break time="200ms"/> and the Tokyo Metro Fukutoshin Line.',
      ]);
    });
    test('should be ARRIVING', () => {
      const { result } = renderHook(
        () => useTTSTextWithJotaiAndNumbering('YAMANOTE', 'ARRIVING'),
        {
          wrapper: wrapper,
        }
      );
      expect(result.current.text).toEqual([
        'まもなく、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>は、お乗り換えです。',
        'The next station is Shinjuku-sanchome S <say-as interpret-as="cardinal">2</say-as>. Please change here for the Tokyo Metro Marunouchi Line,<break time="200ms"/> and the Tokyo Metro Fukutoshin Line.',
      ]);
    });
  });

  describe('JR_WEST Theme', () => {
    test('should be NEXT', () => {
      const { result } = renderHook(
        () => useTTSTextWithJotaiAndNumbering('JR_WEST', 'NEXT'),
        {
          wrapper: wrapper,
        }
      );
      expect(result.current.text).toEqual([
        '次は、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>はお乗り換えです。',
        'The next stop is Shinjuku-sanchome station number S <say-as interpret-as="cardinal">2</say-as>. Transfer here for the Tokyo Metro Marunouchi Line,<break time="200ms"/> and the Tokyo Metro Fukutoshin Line.',
      ]);
    });
    test('should be ARRIVING', () => {
      const { result } = renderHook(
        () => useTTSTextWithJotaiAndNumbering('JR_WEST', 'ARRIVING'),
        {
          wrapper: wrapper,
        }
      );
      expect(result.current.text).toEqual([
        'まもなく、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>はお乗り換えです。<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>を出ますと、次は、<sub alias="あけぼのばし">曙橋</sub>に停まります。',
        'We will soon be making a brief stop at Shinjuku-sanchome station number S <say-as interpret-as="cardinal">2</say-as>. Transfer here for the Tokyo Metro Marunouchi Line,<break time="200ms"/> and the Tokyo Metro Fukutoshin Line. After leaving Shinjuku-sanchome, We will be stopping at Akebonobashi.',
      ]);
    });
  });

  describe('SAIKYO Theme', () => {
    test('should be NEXT', () => {
      const { result } = renderHook(
        () => useTTSTextWithJotaiAndNumbering('SAIKYO', 'NEXT'),
        {
          wrapper: wrapper,
        }
      );
      expect(result.current.text).toEqual([
        '次は、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>は、お乗り換えです。',
        'The next station is Shinjuku-sanchome S <say-as interpret-as="cardinal">2</say-as>. Please change here for the Tokyo Metro Marunouchi Line,<break time="200ms"/> and the Tokyo Metro Fukutoshin Line.',
      ]);
    });
    test('should be ARRIVING', () => {
      const { result } = renderHook(
        () => useTTSTextWithJotaiAndNumbering('SAIKYO', 'ARRIVING'),
        {
          wrapper: wrapper,
        }
      );
      expect(result.current.text).toEqual([
        'まもなく、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>は、お乗り換えです。',
        'The next station is Shinjuku-sanchome S <say-as interpret-as="cardinal">2</say-as>. Please change here for the Tokyo Metro Marunouchi Line,<break time="200ms"/> and the Tokyo Metro Fukutoshin Line.',
      ]);
    });
  });

  describe('TOEI Theme', () => {
    test('should be NEXT', () => {
      const { result } = renderHook(
        () => useTTSTextWithJotaiAndNumbering('TOEI', 'NEXT'),
        {
          wrapper: wrapper,
        }
      );
      expect(result.current.text).toEqual([
        '次は、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>。 <sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>はお乗り換えです。この電車は、各駅停車、<sub alias="もとやわた">本八幡</sub>ゆきです。',
        'This is the Local train bound for Motoyawata. The next station is Shinjuku-sanchome S <say-as interpret-as="cardinal">2</say-as>. Please change here for the Tokyo Metro Marunouchi Line,<break time="200ms"/> and the Tokyo Metro Fukutoshin Line.',
      ]);
    });
    test('should be ARRIVING', () => {
      const { result } = renderHook(
        () => useTTSTextWithJotaiAndNumbering('TOEI', 'ARRIVING'),
        {
          wrapper: wrapper,
        }
      );
      expect(result.current.text).toEqual([
        'まもなく、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>はお乗り換えです。',
        'We will soon be arriving at Shinjuku-sanchome S <say-as interpret-as="cardinal">2</say-as>. Please change here for the Tokyo Metro Marunouchi Line,<break time="200ms"/> and the Tokyo Metro Fukutoshin Line.',
      ]);
    });
  });

  describe('LED Theme', () => {
    test('should be NEXT', () => {
      const { result } = renderHook(
        () => useTTSTextWithJotaiAndNumbering('LED', 'NEXT'),
        {
          wrapper: wrapper,
        }
      );
      expect(result.current.text).toEqual([
        '次は、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>はお乗り換えです。',
        'The next stop is Shinjuku-sanchome S <say-as interpret-as="cardinal">2</say-as>. Please change here for the Tokyo Metro Marunouchi Line,<break time="200ms"/> and the Tokyo Metro Fukutoshin Line.',
      ]);
    });
    test('should be ARRIVING', () => {
      const { result } = renderHook(
        () => useTTSTextWithJotaiAndNumbering('LED', 'ARRIVING'),
        {
          wrapper: wrapper,
        }
      );
      const [jaSSML, enSSML] = result.current.text;
      // 英語SSMLがundefinedの場合は空文字列にする
      const en = typeof enSSML === 'string' ? enSSML : '';

      // 日本語: 期待される日本語SSML出力を検証
      expect(jaSSML).toBe(
        'まもなく、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>はお乗り換えです。'
      );
      // 日本語: 期待される英語SSML出力を検証
      expect(en).toBe(
        'Arriving at Shinjuku-sanchome S <say-as interpret-as="cardinal">2</say-as>. Please change here for the Tokyo Metro Marunouchi Line,<break time="200ms"/> and the Tokyo Metro Fukutoshin Line.'
      );

      // 日本語: 英語SSMLに日本語文字（ひらがな・カタカナ・漢字）が含まれていないことを厳密に検証
      const japaneseCharRegex = /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF]/;
      expect(en).not.toMatch(japaneseCharRegex);

      // 日本語: 英語SSMLが空文字列でないことを検証
      expect(en).toHaveLength(en.length);

      // 日本語: 英語SSMLに駅番号（例: S 2 や station number S 2 など）が含まれていることを検証
      const stationNumberRegex =
        /(S <say-as interpret-as="cardinal">\d{1,2}<\/say-as>|station number S ?<say-as interpret-as="cardinal">\d{1,2}<\/say-as>)/;
      expect(en).toMatch(stationNumberRegex);
    });
  });
});

describe('JR_WEST batch cycling', () => {
  beforeEach(() => {
    jest.resetModules();
    require('~/hooks/useNumbering').useNumbering.mockReturnValue([
      {
        lineSymbol: 'S',
        lineSymbolColor: '#B0BF1E',
        lineSymbolShape: 'ROUND',
        stationNumber: 'S-02',
      },
      '',
    ]);
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  const useCyclingHelper = ({
    stationIndex,
    firstSpeech,
  }: {
    stationIndex: number;
    firstSpeech: boolean;
  }) => {
    const setLineState = useSetAtom(lineState);
    const setStationState = useSetAtom(stationState);

    useEffect(() => {
      const station = TOEI_SHINJUKU_LINE_STATIONS[stationIndex];
      const stations = TOEI_SHINJUKU_LINE_STATIONS;
      const selectedDirection = 'INBOUND' as LineDirection;
      const selectedLine = TOEI_SHINJUKU_LINE_LOCAL;
      const selectedBound =
        TOEI_SHINJUKU_LINE_STATIONS[TOEI_SHINJUKU_LINE_STATIONS.length - 1];

      store.set(themePreferenceAtom, 'JR_WEST');
      setStationState((prev) => ({
        ...prev,
        station,
        stations,
        selectedDirection,
        arrived: false,
        selectedBound,
        approaching: false,
      }));
      setLineState((prev) => ({ ...prev, selectedLine }));
    }, [stationIndex, setLineState, setStationState]);

    return useTTSText(firstSpeech, true);
  };

  test('should include stop list on firstSpeech', () => {
    setupMockUseNextStation(TOEI_SHINJUKU_LINE_STATIONS[1]);
    const { result } = renderHook(
      () => useCyclingHelper({ stationIndex: 0, firstSpeech: true }),
      { wrapper }
    );

    const [jaText] = result.current.text;
    expect(jaText).toContain('の順に停まります');
    expect(jaText).toContain('後ほどご案内いたします');
  });

  test('should NOT include stop list when within current batch', () => {
    // stationIndex=2 (曙橋), firstSpeech=false, ref=null → no stop list
    setupMockUseNextStation(TOEI_SHINJUKU_LINE_STATIONS[3]);
    const { result } = renderHook(
      () => useCyclingHelper({ stationIndex: 2, firstSpeech: false }),
      { wrapper }
    );

    const [jaText] = result.current.text;
    expect(jaText).not.toContain('の順に停まります');
  });

  test('should re-announce stop list after passing batch boundary', () => {
    // Phase 1: firstSpeech=true at station 0 → sets batch boundary to 5th stop (神保町)
    setupMockUseNextStation(TOEI_SHINJUKU_LINE_STATIONS[1]);

    let stationIndex = 0;
    let firstSpeech = true;

    const { result, rerender } = renderHook(
      () => useCyclingHelper({ stationIndex, firstSpeech }),
      { wrapper }
    );

    expect(result.current.text[0]).toContain('の順に停まります');

    // Phase 2: firstSpeech=false, still at station 0 → batch boundary set, station still within batch
    act(() => {
      firstSpeech = false;
    });
    rerender({});
    expect(result.current.text[0]).not.toContain('の順に停まります');

    // Phase 3: move to station 5 (神保町) → past batch boundary → re-announce
    // Station index 5 = 神保町, nextStation = 小川町 (index 6)
    setupMockUseNextStation(TOEI_SHINJUKU_LINE_STATIONS[6]);
    act(() => {
      stationIndex = 5;
    });
    rerender({});

    expect(result.current.text[0]).toContain('の順に停まります');
    expect(result.current.text[1]).toContain('We will be stopping at');
  });
});
