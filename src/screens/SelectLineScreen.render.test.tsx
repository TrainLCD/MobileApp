import { render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import type { Line, Station } from '~/@types/graphql';
import { TransportType } from '~/@types/graphql';
import { useDeviceOrientation } from '~/hooks/useDeviceOrientation';
import { useInitialNearbyStation } from '~/hooks/useInitialNearbyStation';
import { useLineSelection } from '~/hooks/useLineSelection';
import { usePresetCarouselData } from '~/hooks/usePresetCarouselData';
import { useSelectLineWalkthrough } from '~/hooks/useSelectLineWalkthrough';
import { useStationsCache } from '~/hooks/useStationsCache';
import { createLine, createStation } from '~/utils/test/factories';
import SelectLineScreen from './SelectLineScreen';

// --- モジュールモック ---

jest.mock('jotai', () => ({
  useAtomValue: jest.fn(),
  atom: jest.fn(),
}));

// usePresetCarouselData → useSavedRoutes → expo-sqlite のチェーンを断つ
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => ({
    execAsync: jest.fn(),
    getAllAsync: jest.fn().mockResolvedValue([]),
    runAsync: jest.fn(),
  })),
}));

// usePresetCarouselData → gqlClient → react-native-device-info のチェーンを断つ
jest.mock('~/lib/gql', () => ({
  gqlClient: { query: jest.fn() },
}));

jest.mock('expo-screen-orientation', () => ({
  unlockAsync: jest.fn().mockResolvedValue(undefined),
  Orientation: {
    PORTRAIT_UP: 1,
    PORTRAIT_DOWN: 2,
    LANDSCAPE_LEFT: 3,
    LANDSCAPE_RIGHT: 4,
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }: { children: React.ReactNode }) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
  useSafeAreaInsets: jest.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0 })),
}));

jest.mock('react-native-skeleton-placeholder', () => {
  const { View } = require('react-native');
  const SkeletonPlaceholder = ({ children }: { children: React.ReactNode }) => (
    <View testID="skeleton-placeholder">{children}</View>
  );
  SkeletonPlaceholder.Item = ({ children }: { children?: React.ReactNode }) => (
    <View testID="skeleton-item">{children}</View>
  );
  return SkeletonPlaceholder;
});

// カスタムフック
jest.mock('~/hooks/useInitialNearbyStation');
jest.mock('~/hooks/useStationsCache');
jest.mock('~/hooks/usePresetCarouselData');
jest.mock('~/hooks/useLineSelection');
jest.mock('~/hooks/useSelectLineWalkthrough');
jest.mock('~/hooks/useDeviceOrientation');

// 子コンポーネント
jest.mock('~/components/CommonCard', () => ({
  CommonCard: ({
    testID,
    line,
  }: {
    testID?: string;
    line: { nameShort?: string };
  }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={testID ?? 'common-card'}>
        <Text>{line?.nameShort ?? ''}</Text>
      </View>
    );
  },
}));

jest.mock('~/components/NowHeader', () => ({
  NowHeader: ({ station }: { station: Station | null }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="now-header">
        <Text testID="now-header-station">{station?.name ?? ''}</Text>
      </View>
    );
  },
}));

jest.mock('~/components/SelectBoundModal', () => ({
  SelectBoundModal: ({
    visible,
    loading,
  }: {
    visible: boolean;
    loading: boolean;
  }) => {
    const { View } = require('react-native');
    return visible ? (
      <View testID="select-bound-modal">
        {loading && <View testID="modal-loading" />}
      </View>
    ) : null;
  },
}));

jest.mock('~/components/WalkthroughOverlay', () => {
  const { View } = require('react-native');
  return ({
    visible,
    currentStepIndex,
  }: {
    visible: boolean;
    currentStepIndex: number;
  }) =>
    visible ? (
      <View testID={`walkthrough-overlay-step-${currentStepIndex}`} />
    ) : null;
});

jest.mock('../components/FooterTabBar', () => {
  const { View } = require('react-native');
  const FooterTabBar = ({ active }: { active: string }) => (
    <View testID={`footer-tab-${active}`} />
  );
  FooterTabBar.FOOTER_BASE_HEIGHT = 72;
  return {
    __esModule: true,
    default: FooterTabBar,
    FOOTER_BASE_HEIGHT: 72,
  };
});

jest.mock('../components/Heading', () => ({
  Heading: ({ children }: { children: React.ReactNode }) => {
    const { Text } = require('react-native');
    return <Text testID="heading">{children}</Text>;
  },
}));

jest.mock('~/components/EmptyLineSeparator', () => ({
  EmptyLineSeparator: () => {
    const { View } = require('react-native');
    return <View testID="empty-separator" />;
  },
}));

jest.mock('./SelectLineScreenPresets', () => ({
  SelectLineScreenPresets: ({
    isPresetsLoading,
    carouselData,
  }: {
    isPresetsLoading: boolean;
    carouselData: unknown[];
  }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="presets">
        <Text testID="presets-count">{carouselData.length}</Text>
        {isPresetsLoading && <View testID="presets-loading" />}
      </View>
    );
  },
}));

jest.mock('../translation', () => ({
  translate: jest.fn((key: string) => key),
  isJapanese: true,
}));

jest.mock('../utils/generateTestID', () => ({
  generateLineTestId: jest.fn(
    (line: { id: number | null }) => `line_${line.id}`
  ),
}));

jest.mock('~/utils/line', () => ({
  isBusLine: jest.fn(
    (line: { transportType?: string } | null) =>
      line?.transportType === 'BUS' || line?.transportType === 'Bus'
  ),
}));

// --- ヘルパー ---

const mockHandleLineSelected = jest.fn();
const mockHandleTrainTypeSelect = jest.fn();
const mockHandlePresetPress = jest.fn();
const mockHandleCloseSelectBoundModal = jest.fn();
const mockNextStep = jest.fn();
const mockGoToStep = jest.fn();
const mockSkipWalkthrough = jest.fn();

const defaultLineSelection = () => ({
  handleLineSelected: mockHandleLineSelected,
  handleTrainTypeSelect: mockHandleTrainTypeSelect,
  handlePresetPress: mockHandlePresetPress,
  handleCloseSelectBoundModal: mockHandleCloseSelectBoundModal,
  isSelectBoundModalOpen: false,
  fetchTrainTypesLoading: false,
  fetchStationsByLineIdLoading: false,
  fetchStationsByLineGroupIdLoading: false,
  fetchTrainTypesError: undefined,
  fetchStationsByLineIdError: undefined,
  fetchStationsByLineGroupIdError: undefined,
});

const defaultWalkthrough = () => ({
  isWalkthroughActive: false,
  currentStepIndex: 0,
  currentStep: null as Record<string, unknown> | null,
  totalSteps: 5,
  nextStep: mockNextStep,
  goToStep: mockGoToStep,
  skipWalkthrough: mockSkipWalkthrough,
  setSettingsButtonLayout: jest.fn(),
  setNowHeaderLayout: jest.fn(),
  lineListRef: { current: null },
  presetsRef: { current: null },
  handlePresetsLayout: jest.fn(),
  handleLineListLayout: jest.fn(),
});

const setupDefaults = ({
  station = null as Station | null,
  nearbyStationLoading = false,
  carouselData = [] as unknown[],
  isRoutesDBInitialized = true,
  lineSelection = defaultLineSelection(),
  walkthrough = defaultWalkthrough(),
  stationsCache = [] as Station[][],
} = {}) => {
  (useInitialNearbyStation as jest.Mock).mockReturnValue({
    station,
    nearbyStationLoading,
  });
  (useStationsCache as jest.Mock).mockImplementation(() => {});
  (usePresetCarouselData as jest.Mock).mockReturnValue({
    carouselData,
    routes: [],
    isRoutesDBInitialized,
  });
  (useLineSelection as jest.Mock).mockReturnValue(lineSelection);
  (useSelectLineWalkthrough as jest.Mock).mockReturnValue(walkthrough);
  (useDeviceOrientation as jest.Mock).mockReturnValue(1); // PORTRAIT_UP
  // stationState を1回目、isLEDThemeAtom を2回目に返す
  let atomCallCount = 0;
  (useAtomValue as jest.Mock).mockImplementation(() => {
    atomCallCount++;
    if (atomCallCount % 2 === 1) return { stationsCache };
    return false; // isLEDTheme
  });
};

// --- テスト ---

describe('SelectLineScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ローディング状態', () => {
    it('nearbyStationLoading=true のときスケルトンが表示される', () => {
      setupDefaults({ nearbyStationLoading: true });

      const { getByTestId, queryByTestId } = render(<SelectLineScreen />);

      expect(getByTestId('skeleton-placeholder')).toBeTruthy();
      expect(queryByTestId('presets')).toBeNull();
    });

    it('nearbyStationLoading=false のときプリセットが表示される', () => {
      setupDefaults({ nearbyStationLoading: false });

      const { getByTestId, queryByTestId } = render(<SelectLineScreen />);

      expect(queryByTestId('skeleton-placeholder')).toBeNull();
      expect(getByTestId('presets')).toBeTruthy();
    });
  });

  describe('路線一覧の表示', () => {
    it('駅がない場合はヘッディングが表示されない', () => {
      setupDefaults({ station: null });

      const { queryByTestId } = render(<SelectLineScreen />);

      expect(queryByTestId('heading')).toBeNull();
    });

    it('鉄道路線がある駅が設定されると路線カードが表示される', () => {
      const railLine = createLine(100, {
        nameShort: '山手線',
        station: { id: 1, hasTrainTypes: false } as Line['station'],
        transportType: null,
      });
      const station = createStation(1, {
        name: '渋谷',
        nameRoman: 'Shibuya',
        lines: [railLine] as Station['lines'],
      } as Parameters<typeof createStation>[1]);

      setupDefaults({ station, stationsCache: [[createStation(10)]] });

      const { getByTestId, getAllByTestId } = render(<SelectLineScreen />);

      // ヘッディングが表示される
      const headings = getAllByTestId('heading');
      expect(headings.length).toBeGreaterThan(0);

      // 路線カードが表示される
      expect(getByTestId('line_100')).toBeTruthy();
    });

    it('バス路線がある場合はバスセクションも表示される', () => {
      const railLine = createLine(100, {
        nameShort: '山手線',
        station: { id: 1, hasTrainTypes: false } as Line['station'],
        transportType: null,
      });
      const busLine = createLine(200, {
        nameShort: '都営バス',
        station: { id: 1, hasTrainTypes: false } as Line['station'],
        transportType: TransportType.Bus,
      });
      const station = createStation(1, {
        name: '新宿',
        nameRoman: 'Shinjuku',
        lines: [railLine, busLine] as Station['lines'],
      } as Parameters<typeof createStation>[1]);

      setupDefaults({ station, stationsCache: [[], []] });

      const { getByTestId, getAllByTestId } = render(<SelectLineScreen />);

      // 鉄道とバスの両方のヘッディングが表示される
      const headings = getAllByTestId('heading');
      expect(headings.length).toBe(2);

      // 両方の路線カードが表示される
      expect(getByTestId('line_100')).toBeTruthy();
      expect(getByTestId('line_200')).toBeTruthy();
    });
  });

  describe('NowHeader', () => {
    it('station が NowHeader に渡される', () => {
      const station = createStation(1, { name: '東京' });
      setupDefaults({ station });

      const { getByTestId } = render(<SelectLineScreen />);

      expect(getByTestId('now-header')).toBeTruthy();
      expect(getByTestId('now-header-station').props.children).toBe('東京');
    });

    it('station が null の場合も NowHeader が表示される', () => {
      setupDefaults({ station: null });

      const { getByTestId } = render(<SelectLineScreen />);

      expect(getByTestId('now-header')).toBeTruthy();
      expect(getByTestId('now-header-station').props.children).toBe('');
    });
  });

  describe('FooterTabBar', () => {
    it('home タブがアクティブで表示される', () => {
      setupDefaults();

      const { getByTestId } = render(<SelectLineScreen />);

      expect(getByTestId('footer-tab-home')).toBeTruthy();
    });
  });

  describe('SelectBoundModal', () => {
    it('isSelectBoundModalOpen=false のときモーダルは非表示', () => {
      setupDefaults();

      const { queryByTestId } = render(<SelectLineScreen />);

      expect(queryByTestId('select-bound-modal')).toBeNull();
    });

    it('isSelectBoundModalOpen=true のときモーダルが表示される', () => {
      setupDefaults({
        lineSelection: {
          ...defaultLineSelection(),
          isSelectBoundModalOpen: true,
        },
      });

      const { getByTestId } = render(<SelectLineScreen />);

      expect(getByTestId('select-bound-modal')).toBeTruthy();
    });

    it('loading 中はモーダル内にローディング表示', () => {
      setupDefaults({
        lineSelection: {
          ...defaultLineSelection(),
          isSelectBoundModalOpen: true,
          fetchStationsByLineIdLoading: true,
        },
      });

      const { getByTestId } = render(<SelectLineScreen />);

      expect(getByTestId('modal-loading')).toBeTruthy();
    });
  });

  describe('ウォークスルー', () => {
    it('currentStep が null のときウォークスルーは非表示', () => {
      setupDefaults();

      const { queryByTestId } = render(<SelectLineScreen />);

      expect(queryByTestId(/walkthrough-overlay/)).toBeNull();
    });

    it('currentStep がある場合はウォークスルーが表示される', () => {
      setupDefaults({
        walkthrough: {
          ...defaultWalkthrough(),
          isWalkthroughActive: true,
          currentStep: {
            id: 'welcome',
            titleKey: 'walkthroughTitle1',
            descriptionKey: 'walkthroughDescription1',
            tooltipPosition: 'bottom' as const,
          },
          currentStepIndex: 0,
        },
      });

      const { getByTestId } = render(<SelectLineScreen />);

      expect(getByTestId('walkthrough-overlay-step-0')).toBeTruthy();
    });
  });

  describe('プリセット', () => {
    it('DB 未初期化時はプリセットがローディング状態', () => {
      setupDefaults({ isRoutesDBInitialized: false });

      const { getByTestId } = render(<SelectLineScreen />);

      expect(getByTestId('presets-loading')).toBeTruthy();
    });

    it('carouselData の件数がプリセットに渡される', () => {
      const carouselData = [
        {
          id: '1',
          __k: '1-0',
          stations: [],
          name: 'a',
          lineId: 1,
          trainTypeId: null,
          hasTrainType: false,
          createdAt: new Date(),
        },
        {
          id: '2',
          __k: '2-1',
          stations: [],
          name: 'b',
          lineId: 2,
          trainTypeId: null,
          hasTrainType: false,
          createdAt: new Date(),
        },
      ];
      setupDefaults({ carouselData, isRoutesDBInitialized: true });

      const { getByTestId } = render(<SelectLineScreen />);

      expect(getByTestId('presets-count').props.children).toBe(2);
    });
  });

  describe('フック呼び出しの統合', () => {
    it('useStationsCache に station が渡される', () => {
      const station = createStation(1);
      setupDefaults({ station });

      render(<SelectLineScreen />);

      expect(useStationsCache).toHaveBeenCalledWith(station);
    });

    it('station が null のとき useStationsCache に null が渡される', () => {
      setupDefaults({ station: null });

      render(<SelectLineScreen />);

      expect(useStationsCache).toHaveBeenCalledWith(null);
    });

    it('ScreenOrientation.unlockAsync が呼ばれる', () => {
      setupDefaults();

      render(<SelectLineScreen />);

      const ScreenOrientation = require('expo-screen-orientation');
      expect(ScreenOrientation.unlockAsync).toHaveBeenCalled();
    });
  });
});
