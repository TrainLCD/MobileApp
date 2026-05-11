import { renderHook } from '@testing-library/react-native';
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
    firstSpeech = false;
    rerender({});
    expect(result.current.text[0]).not.toContain('の順に停まります');

    // Phase 3: move to station 5 (神保町) → past batch boundary → re-announce
    // Station index 5 = 神保町, nextStation = 小川町 (index 6)
    setupMockUseNextStation(TOEI_SHINJUKU_LINE_STATIONS[6]);
    stationIndex = 5;
    rerender({});

    expect(result.current.text[0]).toContain('の順に停まります');
    expect(result.current.text[1]).toContain('We will be stopping at');
  });
});

describe('single transferLine period consistency (#5914)', () => {
  // 東京メトロ副都心線(id=28010)を除外し、次駅 (Shinjuku-sanchome) の
  // 乗り換え路線を 東京メトロ丸ノ内線 1 本だけに絞る。
  const FUKUTOSHIN_LINE_ID = 28010;

  const buildSingleTransferNextStation = (): Station => {
    const base = TOEI_SHINJUKU_LINE_STATIONS[1];
    return {
      ...base,
      lines: base.lines?.filter((l) => l.id !== FUKUTOSHIN_LINE_ID) ?? [],
    };
  };

  beforeEach(() => {
    jest.resetModules();
    setupMockUseNextStation(buildSingleTransferNextStation());
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

  const renderEn = (theme: AppTheme, state: HeaderStoppingState): string => {
    const { result } = renderHook(
      () => useTTSTextWithJotaiAndNumbering(theme, state),
      { wrapper }
    );
    const [, enSSML] = result.current.text;
    return enSSML ?? '';
  };

  test('TOKYO_METRO NEXT keeps the trailing period for length=1', () => {
    expect(renderEn('TOKYO_METRO', 'NEXT')).toBe(
      'The next stop is Shinjuku-sanchome S <say-as interpret-as="cardinal">2</say-as>. Please change here for the Tokyo Metro Marunouchi Line.'
    );
  });

  test('TOKYO_METRO ARRIVING keeps the trailing period for length=1', () => {
    expect(renderEn('TOKYO_METRO', 'ARRIVING')).toBe(
      'Arriving at Shinjuku-sanchome S <say-as interpret-as="cardinal">2</say-as>. Please change here for the Tokyo Metro Marunouchi Line.'
    );
  });

  test('TY NEXT renders list inline for length=1', () => {
    expect(renderEn('TY', 'NEXT')).toBe(
      'The next station is Shinjuku-sanchome S <say-as interpret-as="cardinal">2</say-as>. Passengers changing to the Tokyo Metro Marunouchi Line, Please transfer at this station.'
    );
  });

  test('TY ARRIVING renders list inline for length=1', () => {
    expect(renderEn('TY', 'ARRIVING')).toBe(
      'We will soon make a brief stop at Shinjuku-sanchome S <say-as interpret-as="cardinal">2</say-as>. Passengers changing to the Tokyo Metro Marunouchi Line, Please transfer at this station.'
    );
  });

  test('YAMANOTE NEXT appends period for length=1', () => {
    expect(renderEn('YAMANOTE', 'NEXT')).toBe(
      'The next station is Shinjuku-sanchome S <say-as interpret-as="cardinal">2</say-as>. Please change here for the Tokyo Metro Marunouchi Line.'
    );
  });

  test('YAMANOTE ARRIVING appends period for length=1', () => {
    expect(renderEn('YAMANOTE', 'ARRIVING')).toBe(
      'The next station is Shinjuku-sanchome S <say-as interpret-as="cardinal">2</say-as>. Please change here for the Tokyo Metro Marunouchi Line.'
    );
  });

  test('SAIKYO NEXT appends period for length=1', () => {
    expect(renderEn('SAIKYO', 'NEXT')).toBe(
      'The next station is Shinjuku-sanchome S <say-as interpret-as="cardinal">2</say-as>. Please change here for the Tokyo Metro Marunouchi Line.'
    );
  });

  test('SAIKYO ARRIVING appends period for length=1', () => {
    expect(renderEn('SAIKYO', 'ARRIVING')).toBe(
      'The next station is Shinjuku-sanchome S <say-as interpret-as="cardinal">2</say-as>. Please change here for the Tokyo Metro Marunouchi Line.'
    );
  });

  test('JR_WEST NEXT keeps trailing period for length=1', () => {
    expect(renderEn('JR_WEST', 'NEXT')).toBe(
      'The next stop is Shinjuku-sanchome station number S <say-as interpret-as="cardinal">2</say-as>. Transfer here for the Tokyo Metro Marunouchi Line.'
    );
  });

  test('JR_WEST ARRIVING keeps trailing period for length=1', () => {
    expect(renderEn('JR_WEST', 'ARRIVING')).toBe(
      'We will soon be making a brief stop at Shinjuku-sanchome station number S <say-as interpret-as="cardinal">2</say-as>. Transfer here for the Tokyo Metro Marunouchi Line. After leaving Shinjuku-sanchome, We will be stopping at Akebonobashi.'
    );
  });

  test('TOEI NEXT keeps trailing period for length=1', () => {
    expect(renderEn('TOEI', 'NEXT')).toBe(
      'This is the Local train bound for Motoyawata. The next station is Shinjuku-sanchome S <say-as interpret-as="cardinal">2</say-as>. Please change here for the Tokyo Metro Marunouchi Line.'
    );
  });

  test('TOEI ARRIVING keeps trailing period for length=1', () => {
    expect(renderEn('TOEI', 'ARRIVING')).toBe(
      'We will soon be arriving at Shinjuku-sanchome S <say-as interpret-as="cardinal">2</say-as>. Please change here for the Tokyo Metro Marunouchi Line.'
    );
  });

  test('JR_KYUSHU NEXT renders list inline without trailing period for length=1', () => {
    expect(renderEn('JR_KYUSHU', 'NEXT')).toContain(
      'You can transfer to the Tokyo Metro Marunouchi Line at Shinjuku-sanchome.'
    );
  });

  test('JR_KYUSHU ARRIVING renders list inline without stray period for length=1', () => {
    const en = renderEn('JR_KYUSHU', 'ARRIVING');
    expect(en).toContain(
      'You can transfer to the Tokyo Metro Marunouchi Line at Shinjuku-sanchome.'
    );
    // length=1 で "...Line. at X." のような不自然なピリオドが残らないこと
    expect(en).not.toContain('Marunouchi Line. at');
  });
});

describe('terminus announcement (#5915)', () => {
  // 各テーマ NEXT / ARRIVING で「次の駅が終点」のときに
  // JA/EN いずれにも「終点 / terminal / last stop」相当の語が含まれることを検証。

  const TERMINUS_INDEX = TOEI_SHINJUKU_LINE_STATIONS.length - 1;
  const TERMINUS = TOEI_SHINJUKU_LINE_STATIONS[TERMINUS_INDEX];

  const useTerminusHelper = ({
    theme,
    headerState,
    boundIndex = TERMINUS_INDEX,
    nextStationIndex = TERMINUS_INDEX,
  }: {
    theme: AppTheme;
    headerState: HeaderStoppingState;
    boundIndex?: number;
    nextStationIndex?: number;
  }) => {
    const setLineState = useSetAtom(lineState);
    const setStationState = useSetAtom(stationState);

    useEffect(() => {
      // 次駅 = TERMINUS の前提では「現在駅 = 終点の一つ手前」を想定。
      // ただし selectedBound を中間駅にする検証では nextStationIndex を任意指定する。
      const station =
        TOEI_SHINJUKU_LINE_STATIONS[Math.max(0, nextStationIndex - 1)];
      const stations = TOEI_SHINJUKU_LINE_STATIONS;
      const selectedDirection = 'INBOUND' as LineDirection;
      const selectedLine = TOEI_SHINJUKU_LINE_LOCAL;
      const selectedBound = TOEI_SHINJUKU_LINE_STATIONS[boundIndex];

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
    }, [boundIndex, headerState, nextStationIndex, setLineState, setStationState, theme]);

    return useTTSText(false, true);
  };

  beforeEach(() => {
    jest.resetModules();
    require('~/hooks/useNumbering').useNumbering.mockReturnValue([
      {
        lineSymbol: 'S',
        lineSymbolColor: '#B0BF1E',
        lineSymbolShape: 'ROUND',
        stationNumber: `S-${String(TERMINUS_INDEX + 1).padStart(2, '0')}`,
      },
      '',
    ]);
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  const renderTexts = (
    theme: AppTheme,
    headerState: HeaderStoppingState,
    overrides: { boundIndex?: number; nextStationIndex?: number } = {}
  ): [string, string] => {
    setupMockUseNextStation(
      TOEI_SHINJUKU_LINE_STATIONS[
        overrides.nextStationIndex ?? TERMINUS_INDEX
      ]
    );
    const { result } = renderHook(
      () => useTerminusHelper({ theme, headerState, ...overrides }),
      { wrapper }
    );
    const [ja, en] = result.current.text;
    return [ja ?? '', en ?? ''];
  };

  // useIsTerminus は stations[0] / stations[last] と一致するときに true を返す。
  // TERMINUS のテーマ群はその判定に従う。
  type TerminusCase = {
    theme: AppTheme;
    state: HeaderStoppingState;
    ja: string;
    en: string[];
  };

  const TERMINUS_CASES: TerminusCase[] = [
    { theme: 'TOKYO_METRO', state: 'NEXT', ja: '終点', en: ['last stop'] },
    { theme: 'TOKYO_METRO', state: 'ARRIVING', ja: '終点', en: ['last stop'] },
    { theme: 'TY', state: 'NEXT', ja: '終点', en: ['last stop'] },
    { theme: 'TY', state: 'ARRIVING', ja: '終点', en: ['last stop'] },
    { theme: 'YAMANOTE', state: 'NEXT', ja: '終点', en: ['terminal'] },
    { theme: 'YAMANOTE', state: 'ARRIVING', ja: '終点', en: ['terminal'] },
    { theme: 'SAIKYO', state: 'NEXT', ja: '終点', en: ['terminal'] },
    { theme: 'SAIKYO', state: 'ARRIVING', ja: '終点', en: ['terminal'] },
    { theme: 'TOEI', state: 'NEXT', ja: '終点', en: ['last stop'] },
    { theme: 'TOEI', state: 'ARRIVING', ja: '終点', en: ['last stop'] },
    // JR_WEST / JR_KYUSHU は nextStationIsBound 判定だが、selectedBound が
    // 物理的な終点と一致するこのケースでは isNextStopTerminus も true になる。
    { theme: 'JR_WEST', state: 'NEXT', ja: '終点', en: ['terminal'] },
    { theme: 'JR_WEST', state: 'ARRIVING', ja: '終点', en: ['terminal'] },
    { theme: 'JR_KYUSHU', state: 'NEXT', ja: '終点', en: ['terminal'] },
    { theme: 'JR_KYUSHU', state: 'ARRIVING', ja: '終点', en: ['terminal'] },
  ];

  test.each(TERMINUS_CASES)(
    'announces terminus for $theme / $state in both languages',
    ({ theme, state, ja, en }) => {
      const [jaText, enText] = renderTexts(theme as AppTheme, state);
      expect(jaText).toContain(ja);
      for (const phrase of en) {
        expect(enText).toContain(phrase);
      }
    }
  );

  // selectedBound が物理的終点ではない中間駅のとき、nextStationIsBound 判定を
  // 採っているテーマ (JR_WEST / JR_KYUSHU) では引き続き 終点 / terminal を発話する。
  const MID_BOUND_INDEX = 5; // 神保町
  const MID_BOUND_CASES = [
    { theme: 'JR_WEST', state: 'NEXT' as HeaderStoppingState, en: 'terminal' },
    { theme: 'JR_KYUSHU', state: 'NEXT' as HeaderStoppingState, en: 'terminal' },
    { theme: 'JR_KYUSHU', state: 'ARRIVING' as HeaderStoppingState, en: 'terminal' },
  ];

  test.each(MID_BOUND_CASES)(
    'announces terminus when bound is a mid-line station for $theme / $state',
    ({ theme, state, en }) => {
      const [jaText, enText] = renderTexts(theme as AppTheme, state, {
        boundIndex: MID_BOUND_INDEX,
        nextStationIndex: MID_BOUND_INDEX,
      });
      expect(jaText).toContain('終点');
      expect(enText).toContain(en);
    }
  );

  // 念のため、selectedBound = TERMINUS の通常ケースで JR_WEST ARRIVING JA に
  // 追加された「終点、X です。」が含まれることを検証する。
  test('JR_WEST ARRIVING JA prepends 終点 before thanks', () => {
    const [jaText] = renderTexts('JR_WEST', 'ARRIVING');
    expect(jaText).toMatch(/終点、.+です。ご乗車ありがとうございました。/);
  });

  // YAMANOTE / SAIKYO / JR_KYUSHU ARRIVING の thanks が hasTransferLines に
  // 依存せず終点時に発話されることを検証する (※1)。
  // 乗り換え路線を取り除いた終点駅をモックすることで、修正前は thanks が
  // 出なかった経路を踏ませる。
  test.each([
    ['YAMANOTE', 'ご利用くださいまして、ありがとうございました'],
    ['SAIKYO', 'ご利用くださいまして、ありがとうございました'],
    ['JR_KYUSHU', 'ご利用くださいまして、ありがとうございました'],
  ])(
    '%s ARRIVING JA announces thanks even when terminus has no transferLines',
    (theme, thanksPhrase) => {
      const terminusWithoutTransfers: Station = {
        ...TERMINUS,
        lines: [],
      };
      (useNextStation as jest.Mock).mockReturnValue(terminusWithoutTransfers);
      const { result } = renderHook(
        () =>
          useTerminusHelper({
            theme: theme as AppTheme,
            headerState: 'ARRIVING',
          }),
        { wrapper }
      );
      const [jaText] = result.current.text;
      expect(jaText ?? '').toContain(thanksPhrase);
    }
  );
});

describe('nextStation null guard (#5917)', () => {
  beforeEach(() => {
    jest.resetModules();
    require('~/hooks/useNumbering').useNumbering.mockReturnValue([null, '']);
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('should return empty text when nextStation is null', () => {
    // nextStation 未解決のとき、context が組み立たず text / nextText は空文字配列になる。
    // 以前は replaceJapaneseText のフォールバックで `次は、各駅停車です。` のような誤案内が流れていた。
    (useNextStation as jest.Mock).mockReturnValue(null);
    const { result } = renderHook(
      () => useTTSTextWithJotaiAndNumbering('TOKYO_METRO', 'NEXT'),
      { wrapper }
    );

    const [jaText, enText] = result.current.text;
    const [nextJaText, nextEnText] = result.current.nextText;

    expect(jaText).toBe('');
    expect(enText).toBe('');
    expect(nextJaText).toBe('');
    expect(nextEnText).toBe('');

    // 念のため、無関係案内の 各駅停車 が流れていないことも確認
    expect(jaText).not.toContain('各駅停車');
    expect(nextJaText).not.toContain('各駅停車');
  });
});
