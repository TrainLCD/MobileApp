/**
 * メイン画面E2Eテスト
 *
 * 山手線の実運行データを用いて、メイン画面（Header + LineBoard）の
 * レンダリング結果をテストする。プライバシー画面・路線選択画面をスキップし、
 * Jotai状態を直接注入してコンポーネントを描画する。
 *
 * デグレ検知の対象:
 * - ヘッダーの駅名表示（日本語・英語・中国語・韓国語）
 * - ヘッダーの方面表示（環状線特有の「方面」表記）
 * - ヘッダーの状態テキスト（到着・次駅表示）
 * - ラインボードの駅一覧表示（最大8駅）
 * - テーマごとのコンポーネント切り替え
 * - ループライン（環状線）固有の駅表示ロジック
 */
import { render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import {
  YAMANOTE_IKEBUKURO,
  YAMANOTE_INBOUND_BOUND,
  YAMANOTE_LINE,
  YAMANOTE_LINE_STATIONS,
  YAMANOTE_OUTBOUND_BOUND,
  YAMANOTE_SHIBUYA,
  YAMANOTE_SHINAGAWA,
  YAMANOTE_SHINJUKU,
  YAMANOTE_TOKYO,
  YAMANOTE_UENO,
} from '~/__fixtures__/yamanote';
import type { HeaderLangState } from '~/models/HeaderTransitionState';
import { APP_THEME } from '~/models/Theme';
import type { LineState } from '~/store/atoms/line';
import type { NavigationState } from '~/store/atoms/navigation';
import type { StationState } from '~/store/atoms/station';
import {
  buildHeaderProps,
  buildLineState,
  buildNavigationState,
  buildStationState,
  type E2EStationConfig,
} from './e2eHelpers';

// --- Mocks ---

jest.mock('jotai', () => ({
  useAtomValue: jest.fn(),
  useSetAtom: jest.fn(() => jest.fn()),
  useAtom: jest.fn(() => [{}, jest.fn()]),
  atom: jest.fn((val) => val),
}));

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  return {
    ...Reanimated,
    useSharedValue: jest.fn(() => ({ value: 1 })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((value) => value),
    runOnJS: jest.fn((fn) => fn),
    Easing: { ease: jest.fn() },
  };
});

jest.mock('~/store/atoms/station', () => ({
  __esModule: true,
  default: { toString: () => 'stationState' },
}));

jest.mock('~/store/atoms/navigation', () => ({
  __esModule: true,
  default: { toString: () => 'navigationState' },
  initialNavigationState: {
    headerState: 'CURRENT',
    pendingTrainType: null,
    trainType: null,
    bottomState: 'LINE',
    leftStations: [],
    stationForHeader: null,
    enabledLanguages: ['JA', 'EN', 'ZH', 'KO'],
    fetchedTrainTypes: [],
    autoModeEnabled: false,
    isAppLatest: false,
    firstStop: true,
    presetsFetched: false,
    presetRoutes: [],
  },
}));

jest.mock('~/store/atoms/line', () => ({
  __esModule: true,
  default: { toString: () => 'lineState' },
}));

jest.mock('~/store/atoms/theme', () => ({
  themeAtom: { toString: () => 'themeAtom' },
  isLEDThemeAtom: { toString: () => 'isLEDThemeAtom' },
}));

jest.mock('~/store/atoms/tuning', () => ({
  __esModule: true,
  default: { toString: () => 'tuningState' },
}));

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

jest.mock('~/translation', () => ({
  translate: jest.fn((key: string) => key),
  isJapanese: true,
  setI18nConfig: jest.fn(),
}));

jest.mock('~/hooks/useTransferLines', () => ({
  useTransferLines: jest.fn(() => []),
}));

// ~/hooks はjest.setup.jsでグローバルモック済み。useLoopLineの戻り値をここで上書きする
const hooksModule = jest.requireMock('~/hooks') as Record<string, jest.Mock>;
hooksModule.useLoopLine = jest.fn(() => ({
  isYamanoteLine: true,
  isOsakaLoopLine: false,
  isMeijoLine: false,
  isOedoLine: false,
  isLoopLine: true,
  isPartiallyLoopLine: false,
  inboundStationsForLoopLine: [],
  outboundStationsForLoopLine: [],
}));

// --- Test Setup ---

const mockUseAtomValue = useAtomValue as jest.MockedFunction<
  typeof useAtomValue
>;

type AtomSetup = {
  stationState: StationState;
  lineState: LineState;
  navigationState: Partial<NavigationState>;
  theme: string;
  isLEDTheme?: boolean;
  tuningState?: Record<string, unknown>;
};

const setupAtoms = (setup: AtomSetup) => {
  // biome-ignore lint/suspicious/noExplicitAny: テスト用モック
  mockUseAtomValue.mockImplementation((atom: any) => {
    const key = atom?.toString?.() ?? '';
    if (key === 'stationState') return setup.stationState;
    if (key === 'lineState') return setup.lineState;
    if (key === 'navigationState') return setup.navigationState;
    if (key === 'themeAtom') return setup.theme;
    if (key === 'isLEDThemeAtom') return setup.isLEDTheme ?? false;
    if (key === 'tuningState')
      return (
        setup.tuningState ?? {
          headerTransitionDelay: 300,
          devOverlayEnabled: false,
          untouchableModeEnabled: false,
          telemetryEnabled: false,
        }
      );
    return undefined;
  });
};

const makeConfig = (
  currentStation = YAMANOTE_SHINJUKU,
  direction: 'INBOUND' | 'OUTBOUND' = 'INBOUND',
  arrived = true
): E2EStationConfig => ({
  stations: YAMANOTE_LINE_STATIONS,
  currentStation,
  selectedLine: YAMANOTE_LINE,
  selectedDirection: direction,
  selectedBound:
    direction === 'INBOUND' ? YAMANOTE_INBOUND_BOUND : YAMANOTE_OUTBOUND_BOUND,
  arrived,
});

const setupAtomsFromConfig = (
  config: E2EStationConfig,
  theme: string = APP_THEME.YAMANOTE
) => {
  setupAtoms({
    stationState: buildStationState(config),
    lineState: buildLineState(config),
    navigationState: {
      headerState: config.arrived ? 'CURRENT' : 'NEXT',
      pendingTrainType: null,
      trainType: null,
      bottomState: 'LINE',
      stationForHeader: null,
      enabledLanguages: ['JA', 'EN', 'ZH', 'KO'],
      fetchedTrainTypes: [],
      autoModeEnabled: false,
      isAppLatest: false,
      firstStop: false,
      presetsFetched: false,
      presetRoutes: [],
      ...buildNavigationState(config),
    },
    theme,
  });
};

// --- Components under test ---

// HeaderE235（山手線テーマ用ヘッダー）を直接テスト
const HeaderE235 = require('~/components/HeaderE235').default;

// LineBoardJO（山手線テーマ用ラインボード）を直接テスト
jest.mock('~/components/LineBoardEast', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: jest.fn(() => (
      <View testID="LineBoardEast">
        <Text>LineBoardEast</Text>
      </View>
    )),
  };
});

jest.mock('~/components/LineBoardJO', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: jest.fn(
      ({
        stations,
        lineColors,
      }: {
        stations: { name: string | null; nameRoman: string | null }[];
        lineColors: (string | undefined)[];
      }) => (
        <View testID="LineBoardJO">
          {stations.map(
            (
              s: { name: string | null; nameRoman: string | null },
              i: number
            ) => (
              <View key={`station-${s.name ?? i}`} testID={`lb-station-${i}`}>
                <Text testID={`lb-station-name-${i}`}>{s.name}</Text>
                <Text testID={`lb-station-roman-${i}`}>{s.nameRoman}</Text>
              </View>
            )
          )}
          {lineColors.map((c: string | undefined, i: number) => (
            <View
              key={`color-${c ?? 'none'}-${i}`}
              testID={`lb-line-color-${i}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </View>
      )
    ),
  };
});

jest.mock('~/components/LineBoardToei', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: () => (
      <View testID="LineBoardToei">
        <Text>LineBoardToei</Text>
      </View>
    ),
  };
});

jest.mock('~/components/LineBoardWest', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: () => (
      <View testID="LineBoardWest">
        <Text>LineBoardWest</Text>
      </View>
    ),
  };
});

jest.mock('~/components/LineBoardSaikyo', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: () => (
      <View testID="LineBoardSaikyo">
        <Text>LineBoardSaikyo</Text>
      </View>
    ),
  };
});

jest.mock('~/components/LineBoardYamanotePad', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: () => (
      <View testID="LineBoardYamanotePad">
        <Text>LineBoardYamanotePad</Text>
      </View>
    ),
  };
});

jest.mock('~/components/LineBoardLED', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: () => (
      <View testID="LineBoardLED">
        <Text>LineBoardLED</Text>
      </View>
    ),
  };
});

jest.mock('~/components/LineBoardJRKyushu', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: () => (
      <View testID="LineBoardJRKyushu">
        <Text>LineBoardJRKyushu</Text>
      </View>
    ),
  };
});

// --- Tests ---

describe('メイン画面 E2E: Header (HeaderE235)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('山手線 新宿駅停車中', () => {
    it('日本語ヘッダーに「新宿」が表示される', () => {
      const config = makeConfig(YAMANOTE_SHINJUKU, 'INBOUND', true);
      setupAtomsFromConfig(config);
      const props = buildHeaderProps(config, { headerLangState: 'JA' });

      const { getByText } = render(<HeaderE235 {...props} />);
      expect(getByText('新宿')).toBeTruthy();
    });

    it('英語ヘッダーに「Shinjuku」が表示される', () => {
      const config = makeConfig(YAMANOTE_SHINJUKU, 'INBOUND', true);
      setupAtomsFromConfig(config);
      const props = buildHeaderProps(config, { headerLangState: 'EN' });

      const { getByText } = render(<HeaderE235 {...props} />);
      expect(getByText('Shinjuku')).toBeTruthy();
    });

    it('方面テキストに「有楽町」（環状線の方面名）が表示される', () => {
      const config = makeConfig(YAMANOTE_SHINJUKU, 'INBOUND', true);
      setupAtomsFromConfig(config);
      const props = buildHeaderProps(config, { headerLangState: 'JA' });

      const { getByText } = render(<HeaderE235 {...props} />);
      expect(getByText('有楽町')).toBeTruthy();
    });

    it('環状線のため方面suffix「方面」が表示される', () => {
      const config = makeConfig(YAMANOTE_SHINJUKU, 'INBOUND', true);
      setupAtomsFromConfig(config);
      const props = buildHeaderProps(config, { headerLangState: 'JA' });

      const { getByText } = render(<HeaderE235 {...props} />);
      expect(getByText('方面')).toBeTruthy();
    });

    it('ラインカラーバーに山手線の緑色(#80C241)が反映される', () => {
      const config = makeConfig(YAMANOTE_SHINJUKU, 'INBOUND', true);
      setupAtomsFromConfig(config);
      const props = buildHeaderProps(config, { headerLangState: 'JA' });

      const { toJSON } = render(<HeaderE235 {...props} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('#80C241');
    });
  });

  describe('山手線 各主要駅の表示', () => {
    const majorStations = [
      { station: YAMANOTE_TOKYO, nameJA: '東京', nameEN: 'Tokyo' },
      { station: YAMANOTE_UENO, nameJA: '上野', nameEN: 'Ueno' },
      { station: YAMANOTE_IKEBUKURO, nameJA: '池袋', nameEN: 'Ikebukuro' },
      { station: YAMANOTE_SHIBUYA, nameJA: '渋谷', nameEN: 'Shibuya' },
      { station: YAMANOTE_SHINAGAWA, nameJA: '品川', nameEN: 'Shinagawa' },
    ];

    for (const { station, nameJA, nameEN } of majorStations) {
      it(`${nameJA}駅で日本語の駅名が正しく表示される`, () => {
        const config = makeConfig(station, 'INBOUND', true);
        setupAtomsFromConfig(config);
        const props = buildHeaderProps(config);

        const { getByText } = render(<HeaderE235 {...props} />);
        expect(getByText(nameJA)).toBeTruthy();
      });

      it(`${nameEN}で英語の駅名が正しく表示される`, () => {
        const config = makeConfig(station, 'INBOUND', true);
        setupAtomsFromConfig(config);
        const props = buildHeaderProps(config, { headerLangState: 'EN' });

        const { getByText } = render(<HeaderE235 {...props} />);
        expect(getByText(nameEN)).toBeTruthy();
      });
    }
  });

  describe('走行中（次駅表示）', () => {
    it('走行中は状態テキスト「次は」が表示される', () => {
      const config = makeConfig(YAMANOTE_SHINJUKU, 'INBOUND', false);
      setupAtomsFromConfig(config);
      const props = buildHeaderProps(config, { headerLangState: 'JA' });

      const { getByText } = render(<HeaderE235 {...props} />);
      expect(getByText('次は')).toBeTruthy();
    });

    it('英語走行中は「Next」が表示される', () => {
      const config = makeConfig(YAMANOTE_SHINJUKU, 'INBOUND', false);
      setupAtomsFromConfig(config);
      const props = buildHeaderProps(config, { headerLangState: 'EN' });

      const { getByText } = render(<HeaderE235 {...props} />);
      expect(getByText('Next')).toBeTruthy();
    });
  });

  describe('多言語対応', () => {
    const languages: { lang: HeaderLangState; boundSuffix: string }[] = [
      { lang: 'JA', boundSuffix: '方面' },
      { lang: 'EN', boundSuffix: '' },
      { lang: 'ZH', boundSuffix: '' },
      { lang: 'KO', boundSuffix: '방면' },
    ];

    for (const { lang, boundSuffix } of languages) {
      if (boundSuffix) {
        it(`${lang}で環状線の方面suffix「${boundSuffix}」が表示される`, () => {
          const config = makeConfig(YAMANOTE_SHINJUKU, 'INBOUND', true);
          setupAtomsFromConfig(config);
          const props = buildHeaderProps(config, { headerLangState: lang });

          const { getByText } = render(<HeaderE235 {...props} />);
          expect(getByText(boundSuffix)).toBeTruthy();
        });
      }
    }

    it('英語で「Bound for」プレフィックスが表示される', () => {
      const config = makeConfig(YAMANOTE_SHINJUKU, 'INBOUND', true);
      setupAtomsFromConfig(config);
      const props = buildHeaderProps(config, { headerLangState: 'EN' });

      const { getByText } = render(<HeaderE235 {...props} />);
      expect(getByText('Bound for')).toBeTruthy();
    });

    it('中国語で「开往」プレフィックスが表示される', () => {
      const config = makeConfig(YAMANOTE_SHINJUKU, 'INBOUND', true);
      setupAtomsFromConfig(config);
      const props = buildHeaderProps(config, { headerLangState: 'ZH' });

      const { getByText } = render(<HeaderE235 {...props} />);
      expect(getByText('开往')).toBeTruthy();
    });
  });

  describe('スナップショット: デグレ検知用', () => {
    it('新宿駅停車中(JA)のスナップショット', () => {
      const config = makeConfig(YAMANOTE_SHINJUKU, 'INBOUND', true);
      setupAtomsFromConfig(config);
      const props = buildHeaderProps(config);

      const { toJSON } = render(<HeaderE235 {...props} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('東京駅停車中(EN)のスナップショット', () => {
      const config = makeConfig(YAMANOTE_TOKYO, 'OUTBOUND', true);
      setupAtomsFromConfig(config);
      const props = buildHeaderProps(config, { headerLangState: 'EN' });

      const { toJSON } = render(<HeaderE235 {...props} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('渋谷駅走行中(JA)のスナップショット', () => {
      const config = makeConfig(YAMANOTE_SHIBUYA, 'INBOUND', false);
      setupAtomsFromConfig(config);
      const props = buildHeaderProps(config);

      const { toJSON } = render(<HeaderE235 {...props} />);
      expect(toJSON()).toMatchSnapshot();
    });
  });
});

describe('メイン画面 E2E: LineBoard', () => {
  const LineBoard = require('~/components/LineBoard').default;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('山手線 新宿駅 内回り', () => {
    it('LineBoardJOがレンダリングされる（山手線テーマ・非タブレット）', () => {
      const config = makeConfig(YAMANOTE_SHINJUKU, 'INBOUND', true);
      setupAtomsFromConfig(config, APP_THEME.YAMANOTE);

      const { getByTestId } = render(<LineBoard hasTerminus={false} />);
      expect(getByTestId('LineBoardJO')).toBeTruthy();
    });

    it('leftStationsに基づく駅名が表示される', () => {
      const config = makeConfig(YAMANOTE_SHINJUKU, 'INBOUND', true);
      setupAtomsFromConfig(config, APP_THEME.YAMANOTE);

      const { getByTestId } = render(<LineBoard hasTerminus={false} />);
      // 新宿(index 16) INBOUND → 新宿から内回り方向に8駅
      expect(getByTestId('lb-station-name-0')).toBeTruthy();
    });

    it('ラインカラーが山手線の緑色で統一される', () => {
      const config = makeConfig(YAMANOTE_SHINJUKU, 'INBOUND', true);
      setupAtomsFromConfig(config, APP_THEME.YAMANOTE);

      const { toJSON } = render(<LineBoard hasTerminus={false} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('#80C241');
    });
  });

  describe('テーマごとのLineBoardコンポーネント選択', () => {
    const themeTests: { theme: string; expectedTestId: string }[] = [
      { theme: APP_THEME.TOKYO_METRO, expectedTestId: 'LineBoardEast' },
      { theme: APP_THEME.YAMANOTE, expectedTestId: 'LineBoardJO' },
      { theme: APP_THEME.JO, expectedTestId: 'LineBoardJO' },
      { theme: APP_THEME.JL, expectedTestId: 'LineBoardJO' },
      { theme: APP_THEME.TOEI, expectedTestId: 'LineBoardToei' },
      { theme: APP_THEME.JR_WEST, expectedTestId: 'LineBoardWest' },
      { theme: APP_THEME.SAIKYO, expectedTestId: 'LineBoardSaikyo' },
      { theme: APP_THEME.LED, expectedTestId: 'LineBoardLED' },
      { theme: APP_THEME.JR_KYUSHU, expectedTestId: 'LineBoardJRKyushu' },
    ];

    for (const { theme, expectedTestId } of themeTests) {
      it(`${theme}テーマで${expectedTestId}が表示される`, () => {
        const config = makeConfig(YAMANOTE_SHINJUKU, 'INBOUND', true);
        setupAtomsFromConfig(config, theme);

        const { getByTestId } = render(<LineBoard hasTerminus={false} />);
        expect(getByTestId(expectedTestId)).toBeTruthy();
      });
    }
  });

  describe('駅移動シミュレーション（環状線）', () => {
    const stationsToTest = [
      { station: YAMANOTE_TOKYO, name: '東京', index: 0 },
      { station: YAMANOTE_UENO, name: '上野', index: 4 },
      { station: YAMANOTE_IKEBUKURO, name: '池袋', index: 12 },
      { station: YAMANOTE_SHINJUKU, name: '新宿', index: 16 },
      { station: YAMANOTE_SHIBUYA, name: '渋谷', index: 19 },
      { station: YAMANOTE_SHINAGAWA, name: '品川', index: 24 },
    ];

    for (const { station, name } of stationsToTest) {
      it(`${name}駅でLineBoardが正常にレンダリングされる`, () => {
        const config = makeConfig(station, 'OUTBOUND', true);
        setupAtomsFromConfig(config, APP_THEME.YAMANOTE);

        const { getByTestId } = render(<LineBoard hasTerminus={false} />);
        expect(getByTestId('LineBoardJO')).toBeTruthy();
      });
    }
  });

  describe('方向別テスト', () => {
    it('内回り（INBOUND）で正常にレンダリングされる', () => {
      const config = makeConfig(YAMANOTE_SHINJUKU, 'INBOUND', true);
      setupAtomsFromConfig(config, APP_THEME.YAMANOTE);

      const { getByTestId } = render(<LineBoard hasTerminus={false} />);
      expect(getByTestId('LineBoardJO')).toBeTruthy();
    });

    it('外回り（OUTBOUND）で正常にレンダリングされる', () => {
      const config = makeConfig(YAMANOTE_SHINJUKU, 'OUTBOUND', true);
      setupAtomsFromConfig(config, APP_THEME.YAMANOTE);

      const { getByTestId } = render(<LineBoard hasTerminus={false} />);
      expect(getByTestId('LineBoardJO')).toBeTruthy();
    });
  });

  describe('スナップショット: デグレ検知用', () => {
    it('新宿駅 内回り YAMANOTE テーマのスナップショット', () => {
      const config = makeConfig(YAMANOTE_SHINJUKU, 'INBOUND', true);
      setupAtomsFromConfig(config, APP_THEME.YAMANOTE);

      const { toJSON } = render(<LineBoard hasTerminus={false} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('東京駅 外回り TOKYO_METRO テーマのスナップショット', () => {
      const config = makeConfig(YAMANOTE_TOKYO, 'OUTBOUND', true);
      setupAtomsFromConfig(config, APP_THEME.TOKYO_METRO);

      const { toJSON } = render(<LineBoard hasTerminus={false} />);
      expect(toJSON()).toMatchSnapshot();
    });
  });
});

describe('メイン画面 E2E: フィクスチャデータの整合性', () => {
  it('山手線フィクスチャは30駅を含む', () => {
    expect(YAMANOTE_LINE_STATIONS).toHaveLength(30);
  });

  it('全駅が山手線のline IDを持つ', () => {
    for (const station of YAMANOTE_LINE_STATIONS) {
      expect(station.line?.id).toBe(11302);
    }
  });

  it('全駅がJYの駅ナンバリングを持つ', () => {
    for (const station of YAMANOTE_LINE_STATIONS) {
      expect(station.stationNumbers?.[0]?.lineSymbol).toBe('JY');
    }
  });

  it('駅ナンバリングがJY-01からJY-30まで連番である', () => {
    for (let i = 0; i < 30; i++) {
      const expected = `JY-${String(i + 1).padStart(2, '0')}`;
      expect(YAMANOTE_LINE_STATIONS[i].stationNumbers?.[0]?.stationNumber).toBe(
        expected
      );
    }
  });

  it('全駅が有効な緯度・経度を持つ', () => {
    for (const station of YAMANOTE_LINE_STATIONS) {
      expect(station.latitude).toBeGreaterThan(35);
      expect(station.latitude).toBeLessThan(36);
      expect(station.longitude).toBeGreaterThan(139);
      expect(station.longitude).toBeLessThan(140);
    }
  });

  it('全駅がStopCondition.Allである（山手線に通過駅はない）', () => {
    for (const station of YAMANOTE_LINE_STATIONS) {
      expect(station.stopCondition).toBe('All');
    }
  });

  it('主要駅のIDがYAMANOTE_LINE_MAJOR_STATIONS_IDに含まれる', () => {
    const { YAMANOTE_LINE_MAJOR_STATIONS_ID } = require('~/constants/station');
    const majorIds = new Set(YAMANOTE_LINE_MAJOR_STATIONS_ID);

    expect(majorIds.has(YAMANOTE_SHINAGAWA.id)).toBe(true);
    expect(majorIds.has(YAMANOTE_SHIBUYA.id)).toBe(true);
    expect(majorIds.has(YAMANOTE_SHINJUKU.id)).toBe(true);
    expect(majorIds.has(YAMANOTE_IKEBUKURO.id)).toBe(true);
    expect(majorIds.has(YAMANOTE_UENO.id)).toBe(true);
    expect(majorIds.has(YAMANOTE_TOKYO.id)).toBe(true);
  });

  it('隣接駅間の距離が妥当な範囲内（100m〜5km）である', () => {
    const getDistance = require('geolib/es/getDistance').default;
    for (let i = 0; i < YAMANOTE_LINE_STATIONS.length - 1; i++) {
      const a = YAMANOTE_LINE_STATIONS[i];
      const b = YAMANOTE_LINE_STATIONS[i + 1];
      const distance = getDistance(
        { latitude: a.latitude, longitude: a.longitude },
        { latitude: b.latitude, longitude: b.longitude }
      );
      expect(distance).toBeGreaterThan(100);
      expect(distance).toBeLessThan(5000);
    }
  });
});

describe('メイン画面 E2E: ヘルパー関数', () => {
  describe('buildStationState', () => {
    it('設定から正しいStationStateを構築する', () => {
      const config = makeConfig(YAMANOTE_SHINJUKU, 'INBOUND', true);
      const state = buildStationState(config);

      expect(state.station).toBe(YAMANOTE_SHINJUKU);
      expect(state.stations).toBe(YAMANOTE_LINE_STATIONS);
      expect(state.selectedDirection).toBe('INBOUND');
      expect(state.selectedBound).toBe(YAMANOTE_INBOUND_BOUND);
      expect(state.arrived).toBe(true);
    });

    it('走行中の状態を正しく反映する', () => {
      const config = makeConfig(YAMANOTE_SHIBUYA, 'OUTBOUND', false);
      const state = buildStationState(config);

      expect(state.arrived).toBe(false);
      expect(state.station).toBe(YAMANOTE_SHIBUYA);
      expect(state.selectedDirection).toBe('OUTBOUND');
    });
  });

  describe('buildNavigationState', () => {
    it('INBOUNDでleftStationsが最大8駅である', () => {
      const config = makeConfig(YAMANOTE_SHINJUKU, 'INBOUND', true);
      const navState = buildNavigationState(config);

      expect(navState.leftStations).toBeDefined();
      expect(navState.leftStations!.length).toBeLessThanOrEqual(8);
      expect(navState.leftStations!.length).toBeGreaterThan(0);
    });

    it('OUTBOUNDでleftStationsが最大8駅である', () => {
      const config = makeConfig(YAMANOTE_SHINJUKU, 'OUTBOUND', true);
      const navState = buildNavigationState(config);

      expect(navState.leftStations).toBeDefined();
      expect(navState.leftStations!.length).toBeLessThanOrEqual(8);
      expect(navState.leftStations!.length).toBeGreaterThan(0);
    });

    it('環状線の端（index 0）でINBOUND時に折り返し処理される', () => {
      const config = makeConfig(YAMANOTE_TOKYO, 'INBOUND', true);
      const navState = buildNavigationState(config);

      expect(navState.leftStations).toBeDefined();
      expect(navState.leftStations![0].groupId).toBe(YAMANOTE_TOKYO.groupId);
    });

    it('環状線の端（最終index）でOUTBOUND時に折り返し処理される', () => {
      const lastStation =
        YAMANOTE_LINE_STATIONS[YAMANOTE_LINE_STATIONS.length - 1];
      const config = makeConfig(lastStation, 'OUTBOUND', true);
      const navState = buildNavigationState(config);

      expect(navState.leftStations).toBeDefined();
      expect(navState.leftStations![0].groupId).toBe(lastStation.groupId);
    });
  });

  describe('buildHeaderProps', () => {
    it('到着中は空のstateTextを返す', () => {
      const config = makeConfig(YAMANOTE_SHINJUKU, 'INBOUND', true);
      const props = buildHeaderProps(config);

      expect(props.stateText).toBe('');
      expect(props.headerState).toBe('CURRENT');
    });

    it('走行中は「次は」のstateTextを返す', () => {
      const config = makeConfig(YAMANOTE_SHINJUKU, 'INBOUND', false);
      const props = buildHeaderProps(config);

      expect(props.stateText).toBe('次は');
      expect(props.headerState).toBe('NEXT');
    });

    it('駅ナンバリング情報が含まれる', () => {
      const config = makeConfig(YAMANOTE_SHINJUKU, 'INBOUND', true);
      const props = buildHeaderProps(config);

      expect(props.currentStationNumber).toBeDefined();
      expect(props.currentStationNumber?.stationNumber).toBe('JY-17');
      expect(props.currentStationNumber?.lineSymbol).toBe('JY');
    });
  });
});
