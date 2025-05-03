import { renderHook } from '@testing-library/react-native';
import React, { useEffect } from 'react';
import { RecoilRoot, useSetRecoilState } from 'recoil';
import { setupMockUseNumbering } from '~/hooks/useNumbering/__mocks__';
import useTTSText from '~/hooks/useTTSText';
import { useThemeStore } from '~/hooks/useThemeStore';
import type { LineDirection } from '~/models/Bound';
import type { HeaderStoppingState } from '~/models/HeaderTransitionState';
import type { AppTheme } from '~/models/Theme';
import lineState from '~/store/atoms/line';
import navigationState from '~/store/atoms/navigation';
import stationState from '~/store/atoms/station';
import { TOEI_SHINJUKU_LINE_LOCAL } from '../../__mocks__/fixture/line';
import { TOEI_SHINJUKU_LINE_STATIONS } from '../../__mocks__/fixture/station';
import { setupMockUseNextStation } from '../../__mocks__/useNextStation';
import { StationNumber } from '../../gen/proto/stationapi_pb';

jest.mock('~/translation', () => ({ isJapanese: true }));

const useTTSTextWithRecoilAndNumbering = (
  theme: AppTheme,
  headerState: HeaderStoppingState
) => {
  const setLineState = useSetRecoilState(lineState);
  const setStationState = useSetRecoilState(stationState);
  const setNaivgationState = useSetRecoilState(navigationState);

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
          useTTSTextWithRecoilAndNumbering(
            theme as AppTheme,
            state as HeaderStoppingState
          ),
        {
          wrapper: ({ children }) => <RecoilRoot>{children}</RecoilRoot>,
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
        () => useTTSTextWithRecoilAndNumbering('TOKYO_METRO', 'NEXT'),
        {
          wrapper: ({ children }) => <RecoilRoot>{children}</RecoilRoot>,
        }
      );
      expect(result.current).toEqual([
        '次は、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>はお乗り換えです。',
        'The next stop is Shinjuku-sanchome S 2. Please change here for the Tokyo Metro Marunouchi Line, and the Tokyo Metro Fukutoshin Line.',
      ]);
    });
    test('should be ARRIVING', () => {
      const { result } = renderHook(
        () => useTTSTextWithRecoilAndNumbering('TOKYO_METRO', 'ARRIVING'),
        {
          wrapper: ({ children }) => <RecoilRoot>{children}</RecoilRoot>,
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
        () => useTTSTextWithRecoilAndNumbering('TY', 'NEXT'),
        {
          wrapper: ({ children }) => <RecoilRoot>{children}</RecoilRoot>,
        }
      );
      expect(result.current).toEqual([
        '次は、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>をご利用のお客様はお乗り換えです。',
        'The next station is Shinjuku-sanchome S 2. Passengers changing to the Tokyo Metro Marunouchi Line, and the Tokyo Metro Fukutoshin Line, Please transfer at this station.',
      ]);
    });
    test('should be ARRIVING', () => {
      const { result } = renderHook(
        () => useTTSTextWithRecoilAndNumbering('TY', 'ARRIVING'),
        {
          wrapper: ({ children }) => <RecoilRoot>{children}</RecoilRoot>,
        }
      );
      expect(result.current).toEqual([
        'まもなく、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>を出ますと、<sub alias="あけぼのばし">曙橋</sub>に停まります。',
        'We will soon make a brief stop at Shinjuku-sanchome S 2.',
      ]);
    });
  });

  describe('YAMANOTE Theme', () => {
    test('should be NEXT', () => {
      const { result } = renderHook(
        () => useTTSTextWithRecoilAndNumbering('YAMANOTE', 'NEXT'),
        {
          wrapper: ({ children }) => <RecoilRoot>{children}</RecoilRoot>,
        }
      );
      expect(result.current).toEqual([
        '次は、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>はお乗り換えです。',
        'The next station is Shinjuku-sanchome S 2. Please change here for the Tokyo Metro Marunouchi Line, and the Tokyo Metro Fukutoshin Line.',
      ]);
    });
    test('should be ARRIVING', () => {
      const { result } = renderHook(
        () => useTTSTextWithRecoilAndNumbering('YAMANOTE', 'ARRIVING'),
        {
          wrapper: ({ children }) => <RecoilRoot>{children}</RecoilRoot>,
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
        () => useTTSTextWithRecoilAndNumbering('JR_WEST', 'NEXT'),
        {
          wrapper: ({ children }) => <RecoilRoot>{children}</RecoilRoot>,
        }
      );
      expect(result.current).toEqual([
        '次は、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>はお乗り換えです。',
        'The next stop is Shinjuku-sanchome station number S 2. Transfer here for the Tokyo Metro Marunouchi Line, and the Tokyo Metro Fukutoshin Line.',
      ]);
    });
    test('should be ARRIVING', () => {
      const { result } = renderHook(
        () => useTTSTextWithRecoilAndNumbering('JR_WEST', 'ARRIVING'),
        {
          wrapper: ({ children }) => <RecoilRoot>{children}</RecoilRoot>,
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
        () => useTTSTextWithRecoilAndNumbering('SAIKYO', 'NEXT'),
        {
          wrapper: ({ children }) => <RecoilRoot>{children}</RecoilRoot>,
        }
      );
      expect(result.current).toEqual([
        '次は、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>は、お乗り換えです。',
        'The next station is Shinjuku-sanchome S 2. Please change here for the Tokyo Metro Marunouchi Line, and the Tokyo Metro Fukutoshin Line.',
      ]);
    });
    test('should be ARRIVING', () => {
      const { result } = renderHook(
        () => useTTSTextWithRecoilAndNumbering('SAIKYO', 'ARRIVING'),
        {
          wrapper: ({ children }) => <RecoilRoot>{children}</RecoilRoot>,
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
        () => useTTSTextWithRecoilAndNumbering('TOEI', 'NEXT'),
        {
          wrapper: ({ children }) => <RecoilRoot>{children}</RecoilRoot>,
        }
      );
      expect(result.current).toEqual([
        '次は、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>。 <sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>はお乗り換えです。この電車は、各駅停車、<sub alias="もとやわた">本八幡</sub>ゆきです。',
        'This is the Local train bound for Motoyawata. The next station is Shinjuku-sanchome S 2. Please change here for the Tokyo Metro Marunouchi Line, and the Tokyo Metro Fukutoshin Line.',
      ]);
    });
    test('should be ARRIVING', () => {
      const { result } = renderHook(
        () => useTTSTextWithRecoilAndNumbering('TOEI', 'ARRIVING'),
        {
          wrapper: ({ children }) => <RecoilRoot>{children}</RecoilRoot>,
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
        () => useTTSTextWithRecoilAndNumbering('LED', 'NEXT'),
        {
          wrapper: ({ children }) => <RecoilRoot>{children}</RecoilRoot>,
        }
      );
      expect(result.current).toEqual([
        '次は、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>はお乗り換えです。',
        'The next stop is Shinjuku-sanchome S 2. Please change here for the Tokyo Metro Marunouchi Line, and the Tokyo Metro Fukutoshin Line.',
      ]);
    });
    test('should be ARRIVING', () => {
      const { result } = renderHook(
        () => useTTSTextWithRecoilAndNumbering('LED', 'ARRIVING'),
        {
          wrapper: ({ children }) => <RecoilRoot>{children}</RecoilRoot>,
        }
      );
      expect(result.current).toEqual([
        'まもなく、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>はお乗り換えです。',
        'Arriving at Shinjuku-sanchome S 2. Please change here for the Tokyo Metro Marunouchi Line, and the Tokyo Metro Fukutoshin Line.',
      ]);
    });
  });
});
