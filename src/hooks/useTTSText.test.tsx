import { renderHook } from '@testing-library/react-native';
import { Provider, useSetAtom } from 'jotai';
import type React from 'react';
import { useEffect } from 'react';
import { StationNumber } from '~/gen/proto/stationapi_pb';
import { useThemeStore } from '~/hooks/useThemeStore';
import { useTTSText } from '~/hooks/useTTSText';
import type { LineDirection } from '~/models/Bound';
import type { HeaderStoppingState } from '~/models/HeaderTransitionState';
import type { AppTheme } from '~/models/Theme';
import lineState from '~/store/atoms/line';
import stationState from '~/store/atoms/station';
import { TOEI_SHINJUKU_LINE_LOCAL } from '../../__mocks__/fixture/line';
import { TOEI_SHINJUKU_LINE_STATIONS } from '../../__mocks__/fixture/station';
import { setupMockUseNextStation } from '../../__mocks__/useNextStation';

jest.mock('~/translation', () => ({ isJapanese: true }));
jest.mock('~/hooks/useNumbering', () => ({
  useNumbering: jest.fn(),
}));

const setupMockUseNumbering = ([stationNumber, threeLetterCode]: [
  StationNumber | undefined,
  string,
]) =>
  require('~/hooks/useNumbering').useNumbering.mockReturnValue([
    stationNumber,
    threeLetterCode,
  ]);

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

    useThemeStore.setState(theme);
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
  <Provider>{children}</Provider>
);

// TODO: firstSpeech refの動作検証が取れていないので後でfirstSpeechも対象にして実施する
describe('Without trainType & With numbering', () => {
  beforeAll(() => {
    setupMockUseNextStation(TOEI_SHINJUKU_LINE_STATIONS[1]);
    setupMockUseNumbering([
      new StationNumber({
        lineSymbol: 'S',
        lineSymbolColor: '#B0BF1E',
        lineSymbolShape: 'ROUND',
        stationNumber: 'S-02',
      }),
      '',
    ]);
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
      const [jaSSML, enSSML] = result.current;
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
      expect(result.current).toEqual([
        '次は、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>はお乗り換えです。',
        'The next stop is Shinjuku-sanchome S 2. Please change here for the Tokyo Metro Marunouchi Line, and the Tokyo Metro Fukutoshin Line.',
      ]);
    });
    test('should be ARRIVING', () => {
      const { result } = renderHook(
        () => useTTSTextWithJotaiAndNumbering('TOKYO_METRO', 'ARRIVING'),
        {
          wrapper: wrapper,
        }
      );
      expect(result.current).toEqual([
        'まもなく、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>はお乗り換えです。',
        'Arriving at Shinjuku-sanchome S 2. Please change here for the Tokyo Metro Marunouchi Line, and the Tokyo Metro Fukutoshin Line.',
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
      expect(result.current).toEqual([
        '次は、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>をご利用のお客様はお乗り換えです。',
        'The next station is Shinjuku-sanchome S 2. Passengers changing to the Tokyo Metro Marunouchi Line, and the Tokyo Metro Fukutoshin Line, Please transfer at this station.',
      ]);
    });
    test('should be ARRIVING', () => {
      const { result } = renderHook(
        () => useTTSTextWithJotaiAndNumbering('TY', 'ARRIVING'),
        {
          wrapper: wrapper,
        }
      );
      expect(result.current).toEqual([
        'まもなく、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>をご利用のお客様はお乗り換えです。<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>を出ますと、<sub alias="あけぼのばし">曙橋</sub>に停まります。',
        'We will soon make a brief stop at Shinjuku-sanchome S 2. Passengers changing to the Tokyo Metro Marunouchi Line, and the Tokyo Metro Fukutoshin Line, Please transfer at this station.',
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
      expect(result.current).toEqual([
        '次は、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>はお乗り換えです。',
        'The next station is Shinjuku-sanchome S 2. Please change here for the Tokyo Metro Marunouchi Line, and the Tokyo Metro Fukutoshin Line.',
      ]);
    });
    test('should be ARRIVING', () => {
      const { result } = renderHook(
        () => useTTSTextWithJotaiAndNumbering('YAMANOTE', 'ARRIVING'),
        {
          wrapper: wrapper,
        }
      );
      expect(result.current).toEqual([
        'まもなく、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>は、お乗り換えです。',
        'The next station is Shinjuku-sanchome S 2. Please change here for the Tokyo Metro Marunouchi Line, and the Tokyo Metro Fukutoshin Line.',
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
      expect(result.current).toEqual([
        '次は、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>はお乗り換えです。',
        'The next stop is Shinjuku-sanchome station number S 2. Transfer here for the Tokyo Metro Marunouchi Line, and the Tokyo Metro Fukutoshin Line.',
      ]);
    });
    test('should be ARRIVING', () => {
      const { result } = renderHook(
        () => useTTSTextWithJotaiAndNumbering('JR_WEST', 'ARRIVING'),
        {
          wrapper: wrapper,
        }
      );
      expect(result.current).toEqual([
        'まもなく、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>はお乗り換えです。<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>を出ますと、次は、<sub alias="あけぼのばし">曙橋</sub>に停まります。',
        'We will soon be making a brief stop at Shinjuku-sanchome station number S 2. Transfer here for the Tokyo Metro Marunouchi Line, and the Tokyo Metro Fukutoshin Line. After leaving Shinjuku-sanchome, We will be stopping at Akebonobashi.',
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
      expect(result.current).toEqual([
        '次は、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>は、お乗り換えです。',
        'The next station is Shinjuku-sanchome S 2. Please change here for the Tokyo Metro Marunouchi Line, and the Tokyo Metro Fukutoshin Line.',
      ]);
    });
    test('should be ARRIVING', () => {
      const { result } = renderHook(
        () => useTTSTextWithJotaiAndNumbering('SAIKYO', 'ARRIVING'),
        {
          wrapper: wrapper,
        }
      );
      expect(result.current).toEqual([
        'まもなく、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>は、お乗り換えです。',
        'The next station is Shinjuku-sanchome S 2. Please change here for the Tokyo Metro Marunouchi Line, and the Tokyo Metro Fukutoshin Line.',
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
      expect(result.current).toEqual([
        '次は、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>。 <sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>はお乗り換えです。この電車は、各駅停車、<sub alias="もとやわた">本八幡</sub>ゆきです。',
        'This is the Local train bound for Motoyawata. The next station is Shinjuku-sanchome S 2. Please change here for the Tokyo Metro Marunouchi Line, and the Tokyo Metro Fukutoshin Line.',
      ]);
    });
    test('should be ARRIVING', () => {
      const { result } = renderHook(
        () => useTTSTextWithJotaiAndNumbering('TOEI', 'ARRIVING'),
        {
          wrapper: wrapper,
        }
      );
      expect(result.current).toEqual([
        'まもなく、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>はお乗り換えです。',
        'We will soon be arriving at Shinjuku-sanchome S 2. Please change here for the Tokyo Metro Marunouchi Line, and the Tokyo Metro Fukutoshin Line.',
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
      expect(result.current).toEqual([
        '次は、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>はお乗り換えです。',
        'The next stop is Shinjuku-sanchome S 2. Please change here for the Tokyo Metro Marunouchi Line, and the Tokyo Metro Fukutoshin Line.',
      ]);
    });
    test('should be ARRIVING', () => {
      const { result } = renderHook(
        () => useTTSTextWithJotaiAndNumbering('LED', 'ARRIVING'),
        {
          wrapper: wrapper,
        }
      );
      expect(result.current).toEqual([
        'まもなく、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>はお乗り換えです。',
        'Arriving at Shinjuku-sanchome S 2. Please change here for the Tokyo Metro Marunouchi Line, and the Tokyo Metro Fukutoshin Line.',
      ]);
    });
  });
});
