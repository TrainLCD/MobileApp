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
jest.mock('~/hooks/useNextStation', () => ({
  useNextStation: jest.fn(),
}));

// バスモード (useTTSText の isBus=true) の TTS テキスト生成テスト。
// 旧 useBusTTSText を useTTSText に統合した後の回帰確認を兼ねる。
const useBusTTSTextWithJotai = (
  theme: AppTheme,
  headerState: HeaderStoppingState,
  firstSpeech = true
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

  const texts = useTTSText(firstSpeech, true, true);
  return texts;
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>{children}</Provider>
);

const setupMockUseNextStation = (station: Station) =>
  (useNextStation as jest.Mock).mockReturnValue(station);

describe('useTTSText (bus mode)', () => {
  beforeEach(() => {
    jest.resetModules();
    setupMockUseNextStation(TOEI_SHINJUKU_LINE_STATIONS[1]);
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  describe('enabled=false', () => {
    test('should return empty array when disabled', () => {
      const { result } = renderHook(
        () => {
          const setLineState = useSetAtom(lineState);
          const setStationState = useSetAtom(stationState);

          useEffect(() => {
            const station = TOEI_SHINJUKU_LINE_STATIONS[0];
            const stations = TOEI_SHINJUKU_LINE_STATIONS;
            const selectedDirection = 'INBOUND' as LineDirection;
            const selectedLine = TOEI_SHINJUKU_LINE_LOCAL;
            const selectedBound =
              TOEI_SHINJUKU_LINE_STATIONS[
                TOEI_SHINJUKU_LINE_STATIONS.length - 1
              ];

            store.set(themePreferenceAtom, 'TOKYO_METRO');
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
          }, [setLineState, setStationState]);

          return useTTSText(true, false, true);
        },
        {
          wrapper: wrapper,
        }
      );
      expect(result.current).toEqual({ text: [] });
    });
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
    ['JO', 'NEXT'],
    ['JO', 'ARRIVING'],
    ['JL', 'NEXT'],
    ['JL', 'ARRIVING'],
    ['JR_KYUSHU', 'NEXT'],
    ['JR_KYUSHU', 'ARRIVING'],
  ])(
    'Should not be contained `undefined` in the TTS text (theme: %s, state: %s)',
    (theme, state) => {
      const { result } = renderHook(
        () =>
          useBusTTSTextWithJotai(
            theme as AppTheme,
            state as HeaderStoppingState
          ),
        {
          wrapper: wrapper,
        }
      );
      const [jaText, enText] = result.current.text;
      expect(jaText?.indexOf('undefined')).toBe(-1);
      expect(enText?.indexOf('undefined')).toBe(-1);
    }
  );

  describe('TOKYO_METRO Theme', () => {
    test('should generate NEXT text with firstSpeech=true', () => {
      const { result } = renderHook(
        () => useBusTTSTextWithJotai('TOKYO_METRO', 'NEXT', true),
        {
          wrapper: wrapper,
        }
      );
      const [jaText, enText] = result.current.text;
      expect(jaText).toContain('をご利用くださいまして、ありがとうございます');
      expect(jaText).toContain('次は');
      expect(jaText).toContain('このバスは');
      expect(jaText).toContain('ゆきです');
      expect(enText).toContain('The next stop is');
      expect(enText).toContain('This bus is bound for');
    });

    test('should generate NEXT text with firstSpeech=false', () => {
      const { result } = renderHook(
        () => useBusTTSTextWithJotai('TOKYO_METRO', 'NEXT', false),
        {
          wrapper: wrapper,
        }
      );
      const [jaText, enText] = result.current.text;
      expect(jaText).toContain('次は');
      expect(jaText).not.toContain('ご利用くださいまして');
      expect(enText).toContain('The next stop is');
      expect(enText).not.toContain('This bus is bound for');
    });

    test('should generate ARRIVING text', () => {
      const { result } = renderHook(
        () => useBusTTSTextWithJotai('TOKYO_METRO', 'ARRIVING'),
        {
          wrapper: wrapper,
        }
      );
      const [jaText, enText] = result.current.text;
      expect(jaText).toContain('まもなく');
      expect(enText).toContain('Arriving at');
    });
  });

  describe('TY Theme', () => {
    test('should generate NEXT text', () => {
      const { result } = renderHook(
        () => useBusTTSTextWithJotai('TY', 'NEXT', true),
        {
          wrapper: wrapper,
        }
      );
      const [jaText, enText] = result.current.text;
      expect(jaText).toContain('をご利用くださいまして');
      expect(jaText).toContain('このバスは');
      expect(jaText).toContain('次は');
      expect(enText).toContain('Thank you for using the');
      expect(enText).toContain('This bus is bound for');
    });

    test('should generate ARRIVING text', () => {
      const { result } = renderHook(
        () => useBusTTSTextWithJotai('TY', 'ARRIVING'),
        {
          wrapper: wrapper,
        }
      );
      const [jaText, enText] = result.current.text;
      expect(jaText).toContain('まもなく');
      expect(enText).toContain('We will soon make a brief stop at');
    });
  });

  describe('YAMANOTE Theme', () => {
    test('should generate NEXT text', () => {
      const { result } = renderHook(
        () => useBusTTSTextWithJotai('YAMANOTE', 'NEXT', true),
        {
          wrapper: wrapper,
        }
      );
      const [jaText, enText] = result.current.text;
      // 公式のJR東日本 通勤型放送は始発挨拶なしで列車案内のみ
      expect(jaText).toContain('このバスは');
      expect(jaText).toContain('ゆきです');
      expect(jaText).toContain('次は');
      expect(enText).toContain('This is the');
      expect(enText).toContain('bus bound for');
    });

    test('should generate ARRIVING text', () => {
      const { result } = renderHook(
        () => useBusTTSTextWithJotai('YAMANOTE', 'ARRIVING'),
        {
          wrapper: wrapper,
        }
      );
      const [jaText, enText] = result.current.text;
      expect(jaText).toContain('まもなく');
      expect(enText).toContain('The next stop is');
    });
  });

  describe('JR_WEST Theme', () => {
    test('should generate NEXT text', () => {
      const { result } = renderHook(
        () => useBusTTSTextWithJotai('JR_WEST', 'NEXT', true),
        {
          wrapper: wrapper,
        }
      );
      const [jaText, enText] = result.current.text;
      expect(jaText).toContain('今日も');
      expect(jaText).toContain('このバスは');
      expect(jaText).toContain('次は');
      expect(jaText).toContain('の順にとまります');
      expect(enText).toContain('Thank you for using');
      expect(enText).toContain('This bus is bound for');
    });

    test('should generate ARRIVING text', () => {
      const { result } = renderHook(
        () => useBusTTSTextWithJotai('JR_WEST', 'ARRIVING'),
        {
          wrapper: wrapper,
        }
      );
      const [jaText, enText] = result.current.text;
      expect(jaText).toContain('まもなく');
      expect(enText).toContain('We will soon be making a brief stop at');
    });
  });

  describe('SAIKYO Theme', () => {
    test('should generate NEXT text', () => {
      const { result } = renderHook(
        () => useBusTTSTextWithJotai('SAIKYO', 'NEXT', true),
        {
          wrapper: wrapper,
        }
      );
      const [jaText, enText] = result.current.text;
      // 公式のJR東日本 通勤型放送は始発挨拶なしで列車案内のみ
      expect(jaText).toContain('このバスは');
      expect(jaText).toContain('ゆきです');
      expect(jaText).toContain('次は');
      expect(enText).toContain('This is the');
      expect(enText).toContain('bus bound for');
    });

    test('should generate ARRIVING text', () => {
      const { result } = renderHook(
        () => useBusTTSTextWithJotai('SAIKYO', 'ARRIVING'),
        {
          wrapper: wrapper,
        }
      );
      const [jaText, enText] = result.current.text;
      expect(jaText).toContain('まもなく');
      expect(enText).toContain('The next stop is');
    });
  });

  describe('TOEI Theme', () => {
    test('should generate NEXT text', () => {
      const { result } = renderHook(
        () => useBusTTSTextWithJotai('TOEI', 'NEXT', true),
        {
          wrapper: wrapper,
        }
      );
      const [jaText, enText] = result.current.text;
      expect(jaText).toContain('をご利用くださいまして');
      expect(jaText).toContain('次は');
      expect(jaText).toContain('このバスは');
      expect(enText).toContain('Thank you for using the');
      expect(enText).toContain('This bus is bound for');
    });

    // 回帰テスト: TOEIの「このバスは、〜ゆきです。」/ "This bus is bound for ..." は
    // 初回放送 (firstSpeech=true) のみで再生される必要がある。
    // 以前はテンプレート構造の都合で firstSpeech 条件の外に出ており、停車のたびに
    // 繰り返し再生されていた。
    test('should omit bound-for phrase on subsequent NEXT (firstSpeech=false)', () => {
      const { result } = renderHook(
        () => useBusTTSTextWithJotai('TOEI', 'NEXT', false),
        {
          wrapper: wrapper,
        }
      );
      const [jaText, enText] = result.current.text;
      expect(jaText).toContain('次は');
      expect(jaText).not.toContain('このバスは');
      expect(jaText).not.toContain('ご利用くださいまして');
      expect(enText).not.toContain('This bus is bound for');
      expect(enText).not.toContain('Thank you for using the');
    });

    test('should generate ARRIVING text', () => {
      const { result } = renderHook(
        () => useBusTTSTextWithJotai('TOEI', 'ARRIVING'),
        {
          wrapper: wrapper,
        }
      );
      const [jaText, enText] = result.current.text;
      expect(jaText).toContain('まもなく');
      expect(enText).toContain('We will soon be arriving at');
    });
  });

  describe('LED Theme (uses TOKYO_METRO template)', () => {
    test('should generate NEXT text using TOKYO_METRO template', () => {
      const { result } = renderHook(
        () => useBusTTSTextWithJotai('LED', 'NEXT', false),
        {
          wrapper: wrapper,
        }
      );
      const [jaText, enText] = result.current.text;
      expect(jaText).toContain('次は');
      expect(enText).toContain('The next stop is');
    });

    test('should generate ARRIVING text using TOKYO_METRO template', () => {
      const { result } = renderHook(
        () => useBusTTSTextWithJotai('LED', 'ARRIVING'),
        {
          wrapper: wrapper,
        }
      );
      const [jaText, enText] = result.current.text;
      expect(jaText).toContain('まもなく');
      expect(enText).toContain('Arriving at');
    });
  });

  describe('JO Theme (uses YAMANOTE template)', () => {
    test('should generate NEXT text using YAMANOTE template', () => {
      const { result } = renderHook(
        () => useBusTTSTextWithJotai('JO', 'NEXT', true),
        {
          wrapper: wrapper,
        }
      );
      const [jaText, enText] = result.current.text;
      expect(jaText).toContain('このバスは');
      expect(jaText).toContain('次は');
      expect(enText).toContain('This is the');
    });

    test('should generate ARRIVING text using YAMANOTE template', () => {
      const { result } = renderHook(
        () => useBusTTSTextWithJotai('JO', 'ARRIVING'),
        {
          wrapper: wrapper,
        }
      );
      const [jaText, enText] = result.current.text;
      expect(jaText).toContain('まもなく');
      expect(enText).toContain('The next stop is');
    });
  });

  describe('JL Theme (uses YAMANOTE template)', () => {
    test('should generate NEXT text using YAMANOTE template', () => {
      const { result } = renderHook(
        () => useBusTTSTextWithJotai('JL', 'NEXT', true),
        {
          wrapper: wrapper,
        }
      );
      const [jaText, enText] = result.current.text;
      expect(jaText).toContain('このバスは');
      expect(jaText).toContain('次は');
      expect(enText).toContain('This is the');
    });

    test('should generate ARRIVING text using YAMANOTE template', () => {
      const { result } = renderHook(
        () => useBusTTSTextWithJotai('JL', 'ARRIVING'),
        {
          wrapper: wrapper,
        }
      );
      const [jaText, enText] = result.current.text;
      expect(jaText).toContain('まもなく');
      expect(enText).toContain('The next stop is');
    });
  });

  describe('JR_KYUSHU Theme', () => {
    test('should generate NEXT text', () => {
      const { result } = renderHook(
        () => useBusTTSTextWithJotai('JR_KYUSHU', 'NEXT', true),
        {
          wrapper: wrapper,
        }
      );
      const [jaText, enText] = result.current.text;
      expect(jaText).toContain('このバスは');
      expect(jaText).toContain('行きです');
      expect(jaText).toContain('次は');
      expect(enText).toContain('This bus is bound for');
      expect(enText).toContain('The next stop is');
    });

    test('should generate ARRIVING text', () => {
      const { result } = renderHook(
        () => useBusTTSTextWithJotai('JR_KYUSHU', 'ARRIVING'),
        {
          wrapper: wrapper,
        }
      );
      const [jaText, enText] = result.current.text;
      expect(jaText).toContain('まもなく');
      expect(enText).toContain('We will soon be arriving at');
    });
  });

  describe('No station numbering in bus TTS', () => {
    test('should not contain station number text', () => {
      const { result } = renderHook(
        () => useBusTTSTextWithJotai('TOKYO_METRO', 'NEXT', true),
        {
          wrapper: wrapper,
        }
      );
      const [, enText] = result.current.text;
      expect(enText).not.toContain('Station Number');
      expect(enText).not.toContain('station number');
    });
  });

  describe('No through service text in bus TTS', () => {
    test('should not contain through service text in Japanese', () => {
      const { result } = renderHook(
        () => useBusTTSTextWithJotai('TOKYO_METRO', 'NEXT', true),
        {
          wrapper: wrapper,
        }
      );
      const [jaText] = result.current.text;
      expect(jaText).not.toContain('直通');
    });

    test('should not contain through service text in English', () => {
      const { result } = renderHook(
        () => useBusTTSTextWithJotai('TY', 'NEXT', true),
        {
          wrapper: wrapper,
        }
      );
      const [, enText] = result.current.text;
      expect(enText).not.toContain('on the');
    });
  });
});
