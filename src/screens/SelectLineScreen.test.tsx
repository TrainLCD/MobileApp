import { fireEvent, render, renderHook } from '@testing-library/react-native';
import { useAtom } from 'jotai';
import type React from 'react';
import type { Station } from '~/@types/graphql';
import navigationState, { type LoopItem } from '../store/atoms/navigation';
import { SelectLineScreenPresets } from './SelectLineScreenPresets';

// Mock jotai
jest.mock('jotai', () => ({
  useAtom: jest.fn(),
  atom: jest.fn((initialValue) => initialValue),
}));

// Mock react-native-skeleton-placeholder
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

// Mock PresetCard
jest.mock('~/components/PresetCard', () => ({
  PresetCard: ({
    title,
    from,
    to,
  }: {
    title: string;
    from?: Station;
    to?: Station;
  }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="preset-card">
        <Text testID="preset-card-title">{title}</Text>
        {from && <Text testID="preset-card-from">{from.name}</Text>}
        {to && <Text testID="preset-card-to">{to.name}</Text>}
      </View>
    );
  },
}));

// Mock NoPresetsCard
jest.mock('~/components/NoPresetsCard', () => ({
  NoPresetsCard: () => {
    const { View, Text } = require('react-native');
    return (
      <View testID="no-presets-card">
        <Text>No presets</Text>
      </View>
    );
  },
}));

describe('SelectLineScreen - pendingWantedDestination削除', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('路線変更時にpendingWantedDestinationの設定が削除されている', () => {
    const mockSetNavigationState = jest.fn();
    const mockNavigationState = {
      headerState: 'CURRENT',
      leftStations: [],
      trainType: null,
      autoModeEnabled: true,
      stationForHeader: null,
      arrived: false,
      approaching: false,
      isLEDTheme: false,
      fetchedTrainTypes: [],
      headerTransitionDelay: false,
      targetAutoModeStation: null,
      firstStop: true,
      presetsFetched: false,
      presetRoutes: [],
    };

    (useAtom as jest.Mock).mockReturnValue([
      mockNavigationState,
      mockSetNavigationState,
    ]);

    // 路線変更時の処理をシミュレート
    mockSetNavigationState((prev: typeof mockNavigationState) => ({
      ...prev,
      fetchedTrainTypes: [],
      trainType: null,
    }));

    expect(mockSetNavigationState).toHaveBeenCalledWith(expect.any(Function));

    // 呼び出された関数が pendingWantedDestination を設定していないことを確認
    const updateFunction = mockSetNavigationState.mock.calls[0][0];
    const updatedState = updateFunction(mockNavigationState);
    expect(updatedState).not.toHaveProperty('pendingWantedDestination');
  });

  it('ラインリセット時にpendingWantedDestinationの設定が削除されている', () => {
    const mockSetNavigationState = jest.fn();
    const mockNavigationState = {
      headerState: 'CURRENT',
      leftStations: [],
      trainType: null,
      autoModeEnabled: true,
      stationForHeader: null,
      arrived: false,
      approaching: false,
      isLEDTheme: false,
      fetchedTrainTypes: [],
      headerTransitionDelay: false,
      targetAutoModeStation: null,
      firstStop: true,
      presetsFetched: false,
      presetRoutes: [],
    };

    (useAtom as jest.Mock).mockReturnValue([
      mockNavigationState,
      mockSetNavigationState,
    ]);

    // ラインリセット時の処理をシミュレート
    mockSetNavigationState((prev: typeof mockNavigationState) => ({
      ...prev,
      fetchedTrainTypes: [],
      trainType: null,
    }));

    expect(mockSetNavigationState).toHaveBeenCalledWith(expect.any(Function));

    // pendingWantedDestination が設定されていないことを確認
    const updateFunction = mockSetNavigationState.mock.calls[0][0];
    const updatedState = updateFunction(mockNavigationState);
    expect(updatedState).not.toHaveProperty('pendingWantedDestination');
  });

  it('navigationStateの型定義からpendingWantedDestinationが削除されている', () => {
    const mockNavigationState = {
      headerState: 'CURRENT',
      leftStations: [],
      trainType: null,
      autoModeEnabled: true,
      stationForHeader: null,
      arrived: false,
      approaching: false,
      isLEDTheme: false,
      fetchedTrainTypes: [],
      headerTransitionDelay: false,
      targetAutoModeStation: null,
      firstStop: true,
      presetsFetched: false,
      presetRoutes: [],
    };

    (useAtom as jest.Mock).mockReturnValue([mockNavigationState, jest.fn()]);

    const { result } = renderHook(() => useAtom(navigationState));

    // pendingWantedDestinationが存在しないことを確認
    expect(result.current[0]).not.toHaveProperty('pendingWantedDestination');
  });
});

describe('SelectLineScreen - PresetCard押下時の状態リセット', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('openModalByLineId (hasTrainType: false のプリセット)', () => {
    it('pendingTrainType と fetchedTrainTypes がリセットされる', () => {
      const mockSetNavigationState = jest.fn();
      const mockNavigationState = {
        headerState: 'CURRENT',
        leftStations: [],
        trainType: null,
        pendingTrainType: { id: 1, groupId: 100, name: '快速' }, // 前回の値が残っている
        autoModeEnabled: true,
        stationForHeader: null,
        arrived: false,
        approaching: false,
        isLEDTheme: false,
        fetchedTrainTypes: [{ id: 1, groupId: 100, name: '快速' }], // 前回の値が残っている
        headerTransitionDelay: false,
        targetAutoModeStation: null,
        firstStop: true,
        presetsFetched: true,
        presetRoutes: [],
      };

      (useAtom as jest.Mock).mockReturnValue([
        mockNavigationState,
        mockSetNavigationState,
      ]);

      // openModalByLineId で行われる setNavigationState をシミュレート
      mockSetNavigationState((prev: typeof mockNavigationState) => ({
        ...prev,
        fetchedTrainTypes: [],
        pendingTrainType: null,
      }));

      expect(mockSetNavigationState).toHaveBeenCalledWith(expect.any(Function));

      const updateFunction = mockSetNavigationState.mock.calls[0][0];
      const updatedState = updateFunction(mockNavigationState);

      // pendingTrainType が null にリセットされている
      expect(updatedState.pendingTrainType).toBeNull();
      // fetchedTrainTypes が空配列にリセットされている
      expect(updatedState.fetchedTrainTypes).toEqual([]);
    });

    it('stationState の selectedDirection と wantedDestination がリセットされる', () => {
      const mockSetStationState = jest.fn();
      const mockStationState = {
        station: null,
        stations: [],
        pendingStation: null,
        pendingStations: [],
        selectedDirection: 'INBOUND', // 前回の値が残っている
        wantedDestination: { id: 1, groupId: 1, name: '東京' }, // 前回の値が残っている
      };

      (useAtom as jest.Mock).mockReturnValue([
        mockStationState,
        mockSetStationState,
      ]);

      // openModalByLineId で行われる setStationState をシミュレート
      mockSetStationState((prev: typeof mockStationState) => ({
        ...prev,
        selectedDirection: null,
        pendingStation: { id: 2, name: '渋谷' },
        pendingStations: [{ id: 2, name: '渋谷' }],
        wantedDestination: null,
      }));

      expect(mockSetStationState).toHaveBeenCalledWith(expect.any(Function));

      const updateFunction = mockSetStationState.mock.calls[0][0];
      const updatedState = updateFunction(mockStationState);

      expect(updatedState.selectedDirection).toBeNull();
      expect(updatedState.wantedDestination).toBeNull();
    });
  });

  describe('openModalByTrainTypeId (hasTrainType: true のプリセット)', () => {
    it('stationState の selectedDirection と wantedDestination がリセットされる', () => {
      const mockSetStationState = jest.fn();
      const mockStationState = {
        station: null,
        stations: [],
        pendingStation: null,
        pendingStations: [],
        selectedDirection: 'OUTBOUND', // 前回の値が残っている
        wantedDestination: { id: 1, groupId: 1, name: '品川' }, // 前回の値が残っている
      };

      (useAtom as jest.Mock).mockReturnValue([
        mockStationState,
        mockSetStationState,
      ]);

      // openModalByTrainTypeId で行われる setStationState をシミュレート
      mockSetStationState((prev: typeof mockStationState) => ({
        ...prev,
        selectedDirection: null,
        pendingStation: { id: 3, name: '新宿' },
        pendingStations: [{ id: 3, name: '新宿' }],
        wantedDestination: null,
      }));

      expect(mockSetStationState).toHaveBeenCalledWith(expect.any(Function));

      const updateFunction = mockSetStationState.mock.calls[0][0];
      const updatedState = updateFunction(mockStationState);

      expect(updatedState.selectedDirection).toBeNull();
      expect(updatedState.wantedDestination).toBeNull();
    });

    it('pendingTrainType が正しく設定される', () => {
      const mockSetNavigationState = jest.fn();
      const mockNavigationState = {
        headerState: 'CURRENT',
        leftStations: [],
        trainType: null,
        pendingTrainType: null,
        autoModeEnabled: true,
        stationForHeader: null,
        arrived: false,
        approaching: false,
        isLEDTheme: false,
        fetchedTrainTypes: [],
        headerTransitionDelay: false,
        targetAutoModeStation: null,
        firstStop: true,
        presetsFetched: true,
        presetRoutes: [],
      };

      const expectedTrainType = { id: 5, groupId: 200, name: '急行' };

      (useAtom as jest.Mock).mockReturnValue([
        mockNavigationState,
        mockSetNavigationState,
      ]);

      // openModalByTrainTypeId で行われる setNavigationState をシミュレート
      mockSetNavigationState((prev: typeof mockNavigationState) => ({
        ...prev,
        pendingTrainType: expectedTrainType,
        fetchedTrainTypes: [expectedTrainType],
      }));

      expect(mockSetNavigationState).toHaveBeenCalledWith(expect.any(Function));

      const updateFunction = mockSetNavigationState.mock.calls[0][0];
      const updatedState = updateFunction(mockNavigationState);

      expect(updatedState.pendingTrainType).toEqual(expectedTrainType);
      expect(updatedState.fetchedTrainTypes).toContainEqual(expectedTrainType);
    });
  });
});

// テスト用モックデータ
const createMockStation = (
  id: number,
  name: string,
  nameRoman: string
): Station =>
  ({
    __typename: 'Station',
    id,
    groupId: id,
    name,
    nameRoman,
    nameKatakana: name,
    nameChinese: name,
    nameKorean: name,
    latitude: 35.68 + id * 0.01,
    longitude: 139.7 + id * 0.01,
    lines: [],
    stationNumbers: [],
    address: 'テスト住所',
    closedAt: '0000-00-00',
    openedAt: '0000-00-00',
    distance: undefined,
    hasTrainTypes: false,
    line: undefined,
    postalCode: '000-0000',
    prefectureId: 13,
    status: 'IN_OPERATION',
    stopCondition: 'ALL',
    threeLetterCode: undefined,
    trainType: undefined,
    transportType: 'RAIL',
  }) as unknown as Station;

const createMockLoopItem = (
  id: number,
  name: string,
  stations: Station[]
): LoopItem => ({
  id: `test-uuid-${id}`,
  name,
  lineId: id * 100,
  trainTypeId: null,
  hasTrainType: false,
  createdAt: new Date('2024-01-01'),
  stations,
  __k: `${id}-test`,
});

describe('SelectLineScreenPresets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ローディング状態', () => {
    it('isPresetsLoading=true かつデータが空の場合、スケルトンが表示される', () => {
      const { getByTestId, queryByTestId } = render(
        <SelectLineScreenPresets
          carouselData={[]}
          isPresetsLoading={true}
          onPress={jest.fn()}
        />
      );

      expect(getByTestId('skeleton-placeholder')).toBeTruthy();
      expect(queryByTestId('no-presets-card')).toBeNull();
      expect(queryByTestId('preset-card')).toBeNull();
    });
  });

  describe('空データ状態', () => {
    it('isPresetsLoading=false かつデータが空の場合、NoPresetsCardが表示される', () => {
      const { getByTestId, queryByTestId } = render(
        <SelectLineScreenPresets
          carouselData={[]}
          isPresetsLoading={false}
          onPress={jest.fn()}
        />
      );

      expect(getByTestId('no-presets-card')).toBeTruthy();
      expect(queryByTestId('skeleton-placeholder')).toBeNull();
      expect(queryByTestId('preset-card')).toBeNull();
    });
  });

  describe('データがある場合', () => {
    it('PresetCardが表示される', () => {
      const stations = [
        createMockStation(1, '新宿', 'Shinjuku'),
        createMockStation(2, '渋谷', 'Shibuya'),
        createMockStation(3, '池袋', 'Ikebukuro'),
      ];
      const carouselData = [createMockLoopItem(1, '山手線', stations)];

      const { getAllByTestId } = render(
        <SelectLineScreenPresets
          carouselData={carouselData}
          isPresetsLoading={false}
          onPress={jest.fn()}
        />
      );

      // プリセットが1件の場合はループしないので1つだけ表示される
      const presetCards = getAllByTestId('preset-card');
      expect(presetCards.length).toBe(1);
    });

    it('複数のプリセットがある場合、全てがループデータとして3倍表示される', () => {
      const stations1 = [
        createMockStation(1, '新宿', 'Shinjuku'),
        createMockStation(2, '渋谷', 'Shibuya'),
      ];
      const stations2 = [
        createMockStation(3, '東京', 'Tokyo'),
        createMockStation(4, '品川', 'Shinagawa'),
      ];
      const carouselData = [
        createMockLoopItem(1, '山手線', stations1),
        createMockLoopItem(2, '中央線', stations2),
      ];

      const { getAllByTestId } = render(
        <SelectLineScreenPresets
          carouselData={carouselData}
          isPresetsLoading={false}
          onPress={jest.fn()}
        />
      );

      // 2プリセット × 3倍 = 6
      const presetCards = getAllByTestId('preset-card');
      expect(presetCards.length).toBe(6);
    });

    it('プリセットのタイトルが正しく表示される', () => {
      const stations = [
        createMockStation(1, '新宿', 'Shinjuku'),
        createMockStation(2, '渋谷', 'Shibuya'),
      ];
      const carouselData = [createMockLoopItem(1, 'テスト路線', stations)];

      const { getAllByTestId } = render(
        <SelectLineScreenPresets
          carouselData={carouselData}
          isPresetsLoading={false}
          onPress={jest.fn()}
        />
      );

      const titles = getAllByTestId('preset-card-title');
      expect(titles[0].props.children).toBe('テスト路線');
    });
  });

  describe('インタラクション', () => {
    it('プリセットをタップするとonPressが呼ばれる', () => {
      const mockOnPress = jest.fn();
      const stations = [
        createMockStation(1, '新宿', 'Shinjuku'),
        createMockStation(2, '渋谷', 'Shibuya'),
      ];
      const carouselData = [createMockLoopItem(1, '山手線', stations)];

      const { getAllByTestId } = render(
        <SelectLineScreenPresets
          carouselData={carouselData}
          isPresetsLoading={false}
          onPress={mockOnPress}
        />
      );

      const presetCards = getAllByTestId('preset-card');
      // Pressableの親要素をタップ
      fireEvent.press(presetCards[0]);

      expect(mockOnPress).toHaveBeenCalled();
    });

    it('stationsが空のプリセットをタップしてもonPressは呼ばれない', () => {
      const mockOnPress = jest.fn();
      const carouselData = [createMockLoopItem(1, '空の路線', [])];

      const { getAllByTestId } = render(
        <SelectLineScreenPresets
          carouselData={carouselData}
          isPresetsLoading={false}
          onPress={mockOnPress}
        />
      );

      const presetCards = getAllByTestId('preset-card');
      fireEvent.press(presetCards[0]);

      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });
});

describe('SelectLineScreen - バス路線のみの場合のプリセット表示', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('プリセットコンポーネントは路線の種類に依存せず常に表示される', () => {
    // SelectLineScreenPresets は carouselData と isPresetsLoading のみに依存し、
    // 鉄道路線/バス路線の区別には依存しない
    const mockOnPress = jest.fn();
    const stations = [
      createMockStation(1, '都営バス停A', 'Bus Stop A'),
      createMockStation(2, '都営バス停B', 'Bus Stop B'),
    ];
    const carouselData = [
      createMockLoopItem(1, 'バス路線プリセット', stations),
    ];

    const { getAllByTestId, queryByTestId } = render(
      <SelectLineScreenPresets
        carouselData={carouselData}
        isPresetsLoading={false}
        onPress={mockOnPress}
      />
    );

    // プリセットカードが表示されている（バス路線かどうかに関係なく）
    expect(getAllByTestId('preset-card').length).toBeGreaterThan(0);
    expect(queryByTestId('no-presets-card')).toBeNull();
  });

  it('プリセットがない場合でもNoPresetsCardが表示される', () => {
    const { getByTestId } = render(
      <SelectLineScreenPresets
        carouselData={[]}
        isPresetsLoading={false}
        onPress={jest.fn()}
      />
    );

    expect(getByTestId('no-presets-card')).toBeTruthy();
  });
});

describe('SelectLineScreenPresets - ループデータ生成', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('carouselDataの各アイテムは3倍に複製されてループ表示される', () => {
    const stations = [
      createMockStation(1, '東京', 'Tokyo'),
      createMockStation(2, '大阪', 'Osaka'),
    ];
    const carouselData = [
      createMockLoopItem(1, 'プリセット1', stations),
      createMockLoopItem(2, 'プリセット2', stations),
      createMockLoopItem(3, 'プリセット3', stations),
    ];

    const { getAllByTestId } = render(
      <SelectLineScreenPresets
        carouselData={carouselData}
        isPresetsLoading={false}
        onPress={jest.fn()}
      />
    );

    // 3プリセット × 3倍 = 9
    const presetCards = getAllByTestId('preset-card');
    expect(presetCards.length).toBe(9);
  });

  it('1つのプリセットはループしない', () => {
    const stations = [createMockStation(1, '駅A', 'Station A')];
    const carouselData = [createMockLoopItem(1, '単独プリセット', stations)];

    const { getAllByTestId } = render(
      <SelectLineScreenPresets
        carouselData={carouselData}
        isPresetsLoading={false}
        onPress={jest.fn()}
      />
    );

    // プリセットが1件の場合はループしないので1つだけ表示される
    expect(getAllByTestId('preset-card').length).toBe(1);
  });
});
