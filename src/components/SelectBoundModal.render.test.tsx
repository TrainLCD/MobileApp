import {
  fireEvent,
  render,
  waitFor,
  within,
} from '@testing-library/react-native';
import { useAtom, useAtomValue } from 'jotai';
import type React from 'react';
import { pendingLineAtom, selectedLineAtom } from '../store/atoms/line';
import {
  autoModeEnabledAtom,
  fetchedTrainTypesAtom,
  pendingTrainTypeAtom,
} from '../store/atoms/navigation';
import notifyState from '../store/atoms/notify';
import {
  pendingStationAtom,
  pendingStationsAtom,
  stationAtom,
  wantedDestinationAtom,
} from '../store/atoms/station';
import { isLEDThemeAtom } from '../store/atoms/theme';
import { SelectBoundModal } from './SelectBoundModal';

const mockRouteInfoModal = jest.fn();
const mockSavePresetNameModal = jest.fn();
const mockSaveRoute = jest.fn();

jest.mock('@react-navigation/native', () => ({
  CommonActions: { navigate: jest.fn() },
  useNavigation: jest.fn(() => ({ navigate: jest.fn() })),
}));

jest.mock('jotai', () => ({
  ...jest.requireActual('jotai'),
  useAtom: jest.fn(),
  useAtomValue: jest.fn(),
  useSetAtom: jest.fn(() => jest.fn()),
}));

jest.mock('~/hooks', () => ({
  useLandscapeWindowDimensions: jest.fn(() => ({ width: 812, height: 375 })),
  useBounds: jest.fn(() => ({
    bounds: [[{ id: 1, groupId: 1 }], [{ id: 2, groupId: 2 }]],
  })),
  useGetStationsWithTermination: jest.fn(() => jest.fn()),
  useLoopLine: jest.fn(() => ({ isLoopLine: false })),
  useSavedRoutes: jest.fn(() => ({
    isInitialized: true,
    find: jest.fn(() => null),
    save: mockSaveRoute,
    remove: jest.fn(),
  })),
  usePresetStops: jest.fn(() => ({
    presetOrigin: null,
    presetStops: undefined,
    nearestPresetStation: undefined,
    resolvePresetDirection: jest.fn(() => 'INBOUND'),
  })),
}));

jest.mock('~/translation', () => ({
  isJapanese: true,
  translate: jest.fn((key: string) => key),
}));

jest.mock('~/utils/isTablet', () => false);
jest.mock('~/utils/line', () => ({
  getLocalizedLineName: jest.fn(() => 'Yamanote Line'),
  isBusLine: jest.fn(() => false),
}));
jest.mock('~/utils/toast', () => ({
  showToast: jest.fn(),
}));
jest.mock('~/utils/isPass', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

jest.mock('./Button', () => {
  const { Pressable, Text: NativeText } = require('react-native');
  return ({
    children,
    onPress,
    disabled,
  }: {
    children: React.ReactNode;
    onPress?: () => void;
    disabled?: boolean;
  }) => (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}>
      <NativeText>{children}</NativeText>
    </Pressable>
  );
});

jest.mock('./CommonCard', () => ({
  CommonCard: ({ title }: { title: string }) => {
    const { Text } = require('react-native');
    return <Text>{title}</Text>;
  },
}));
jest.mock('./Heading', () => ({
  Heading: ({ children }: { children: React.ReactNode }) => {
    const { Text } = require('react-native');
    return <Text>{children}</Text>;
  },
}));
jest.mock('./CustomModal', () => ({
  CustomModal: ({
    children,
    visible,
  }: {
    children: React.ReactNode;
    visible: boolean;
  }) => {
    const { View } = require('react-native');
    return visible ? (
      <View testID="select-bound-custom-modal">{children}</View>
    ) : null;
  },
}));
jest.mock('./RouteInfoModal', () => ({
  RouteInfoModal: (props: unknown) => {
    mockRouteInfoModal(props);
    return null;
  },
}));
jest.mock('./SelectBoundSettingListModal', () => ({
  SelectBoundSettingListModal: () => null,
}));
jest.mock('./TrainTypeListModal', () => ({
  TrainTypeListModal: () => null,
}));
jest.mock('./SavePresetNameModal', () => ({
  SavePresetNameModal: ({
    visible,
    onSubmit,
    showKeepEndpointsOption,
  }: {
    visible: boolean;
    onSubmit: (name: string, keepEndpoints: boolean) => void;
    showKeepEndpointsOption?: boolean;
  }) => {
    mockSavePresetNameModal({ visible, showKeepEndpointsOption });
    return visible
      ? (() => {
          const { Pressable, View } = require('react-native');
          return (
            <View testID="save-preset-modal">
              <Pressable
                testID="save-preset-submit"
                onPress={() => onSubmit('テストプリセット', true)}
              />
              <Pressable
                testID="save-preset-submit-without-endpoints"
                onPress={() => onSubmit('テストプリセット', false)}
              />
            </View>
          );
        })()
      : null;
  },
}));

jest.mock('../stacks/rootNavigation', () => ({
  navigationRef: {
    isReady: jest.fn(() => false),
    dispatch: jest.fn(),
  },
}));

// 渡されたatomの同一性で読み出し値を出し分ける
const mockAtomValues = ({
  station = null as unknown,
  pendingStation = null as unknown,
  pendingStations = [] as unknown[],
  wantedDestination = null as unknown,
  fetchedTrainTypes = [] as unknown[],
  pendingTrainType = null as unknown,
  pendingLine = null as unknown,
  selectedLine = null as unknown,
} = {}) => {
  (useAtomValue as jest.Mock).mockImplementation((atom: unknown) => {
    if (atom === stationAtom) return station;
    if (atom === pendingStationAtom) return pendingStation;
    if (atom === pendingStationsAtom) return pendingStations;
    if (atom === wantedDestinationAtom) return wantedDestination;
    if (atom === autoModeEnabledAtom) return false;
    if (atom === fetchedTrainTypesAtom) return fetchedTrainTypes;
    if (atom === pendingTrainTypeAtom) return pendingTrainType;
    if (atom === pendingLineAtom) return pendingLine;
    if (atom === selectedLineAtom) return selectedLine;
    if (atom === isLEDThemeAtom) return false;
    return false;
  });
};

describe('SelectBoundModal', () => {
  beforeEach(() => {
    mockAtomValues({
      pendingStation: { id: 1, groupId: 1, lines: [{ id: 10 }] },
      pendingStations: [
        { id: 1, groupId: 1, line: { id: 10 }, lines: [{ id: 10 }] },
        { id: 2, groupId: 2, line: { id: 10 }, lines: [{ id: 10 }] },
      ],
      fetchedTrainTypes: [{ groupId: 100, name: 'Rapid', nameRoman: 'Rapid' }],
      pendingLine: { id: 10, name: '山手線', nameRoman: 'Yamanote Line' },
      selectedLine: { id: 10, name: '山手線', nameRoman: 'Yamanote Line' },
    });
    (useAtom as jest.Mock).mockImplementation((atom: unknown) => {
      if (atom === notifyState) {
        return [{ targetStationIds: [] }, jest.fn()];
      }
      return [{}, jest.fn()];
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('プリセット名モーダルは親モーダルの外側に描画される', () => {
    const screen = render(
      <SelectBoundModal
        visible={true}
        onClose={jest.fn()}
        loading={false}
        error={null}
        onTrainTypeSelect={jest.fn()}
        onBoundSelect={jest.fn()}
      />
    );

    fireEvent.press(screen.getByText('saveCurrentRoute'));

    expect(screen.getByTestId('save-preset-modal')).toBeTruthy();
    expect(
      within(screen.getByTestId('select-bound-custom-modal')).queryByTestId(
        'save-preset-modal'
      )
    ).toBeNull();
  });

  it('終着駅設定中でも RouteInfoModal には全駅が渡される', () => {
    mockAtomValues({
      pendingStation: { id: 2, groupId: 2, lines: [{ id: 10 }] },
      pendingStations: [
        { id: 1, groupId: 1, line: { id: 10 }, lines: [{ id: 10 }] },
        { id: 2, groupId: 2, line: { id: 10 }, lines: [{ id: 10 }] },
        { id: 3, groupId: 3, line: { id: 10 }, lines: [{ id: 10 }] },
      ],
      wantedDestination: { id: 3, groupId: 3 },
      pendingLine: { id: 10, name: '山手線', nameRoman: 'Yamanote Line' },
    });

    render(
      <SelectBoundModal
        visible={true}
        onClose={jest.fn()}
        loading={false}
        error={null}
        onTrainTypeSelect={jest.fn()}
        onBoundSelect={jest.fn()}
      />
    );

    const lastCall =
      mockRouteInfoModal.mock.calls[mockRouteInfoModal.mock.calls.length - 1];
    const props = lastCall?.[0] as { stations: Array<{ groupId: number }> };

    expect(props.stations.map((station) => station.groupId)).toEqual([1, 2, 3]);
  });

  // 乗車駅が未設定だと effectiveStation は stations[0] へ倒れるため、
  // そこから向きを決めると常に INBOUND になってしまう
  it('乗車駅が未設定の場合はGPS確定駅の座標から保存する向きを決める', async () => {
    const routeStations = [
      { groupId: 1, latitude: 35.75, longitude: 139.8 },
      { groupId: 2, latitude: 35.74, longitude: 139.79 },
      { groupId: 3, latitude: 35.72, longitude: 139.77 },
      { groupId: 4, latitude: 35.7, longitude: 139.75 },
    ].map(({ groupId, latitude, longitude }) => ({
      id: groupId,
      groupId,
      latitude,
      longitude,
      line: { id: 10 },
      lines: [{ id: 10 }],
    }));

    mockAtomValues({
      // GPS確定駅は駅一覧の末尾側(駅4付近)にあり、行き先(駅2)の反対側になる
      station: { id: 99, groupId: 99, latitude: 35.701, longitude: 139.751 },
      pendingStation: null,
      pendingStations: routeStations,
      wantedDestination: routeStations[1],
      pendingLine: { id: 10, name: '山手線', nameRoman: 'Yamanote Line' },
    });

    const screen = render(
      <SelectBoundModal
        visible={true}
        onClose={jest.fn()}
        loading={false}
        error={null}
        onTrainTypeSelect={jest.fn()}
        onBoundSelect={jest.fn()}
      />
    );

    fireEvent.press(screen.getByText('saveCurrentRoute'));
    fireEvent.press(screen.getByTestId('save-preset-submit'));

    await waitFor(() => expect(mockSaveRoute).toHaveBeenCalled());
    expect(mockSaveRoute.mock.calls[0][0].direction).toBe('OUTBOUND');
  });

  describe('始発・終着を保存するかの選択', () => {
    const routeStations = [1, 2, 3, 4].map((groupId) => ({
      id: groupId,
      groupId,
      latitude: 35.7 + groupId * 0.01,
      longitude: 139.75 + groupId * 0.01,
      line: { id: 10 },
      lines: [{ id: 10 }],
    }));

    const setupWithDestination = (targetStationIds: number[] = []) => {
      mockAtomValues({
        station: routeStations[3],
        pendingStation: routeStations[3],
        pendingStations: routeStations,
        wantedDestination: routeStations[1],
        pendingLine: { id: 10, name: '山手線', nameRoman: 'Yamanote Line' },
      });
      (useAtom as jest.Mock).mockImplementation((atom: unknown) => {
        if (atom === notifyState) {
          return [{ targetStationIds }, jest.fn()];
        }
        return [{}, jest.fn()];
      });

      return render(
        <SelectBoundModal
          visible={true}
          onClose={jest.fn()}
          loading={false}
          error={null}
          onTrainTypeSelect={jest.fn()}
          onBoundSelect={jest.fn()}
        />
      );
    };

    it('行き先が未指定なら選択肢を出さない', () => {
      render(
        <SelectBoundModal
          visible={true}
          onClose={jest.fn()}
          loading={false}
          error={null}
          onTrainTypeSelect={jest.fn()}
          onBoundSelect={jest.fn()}
        />
      );

      const lastCall =
        mockSavePresetNameModal.mock.calls[
          mockSavePresetNameModal.mock.calls.length - 1
        ];
      expect(lastCall?.[0].showKeepEndpointsOption).toBe(false);
    });

    it('行き先を指定している場合は選択肢を出す', () => {
      setupWithDestination();

      const lastCall =
        mockSavePresetNameModal.mock.calls[
          mockSavePresetNameModal.mock.calls.length - 1
        ];
      expect(lastCall?.[0].showKeepEndpointsOption).toBe(true);
    });

    it('オンのままなら行き先・始発駅を含めて保存する', async () => {
      const screen = setupWithDestination();

      fireEvent.press(screen.getByText('saveCurrentRoute'));
      fireEvent.press(screen.getByTestId('save-preset-submit'));

      await waitFor(() => expect(mockSaveRoute).toHaveBeenCalled());
      expect(mockSaveRoute.mock.calls[0][0]).toMatchObject({
        wantedDestinationId: 2,
        originStationId: 4,
        direction: 'OUTBOUND',
      });
    });

    it('オフにすると行き先・始発駅を保存しない', async () => {
      // 保存結果を保存済み表示に反映してしまわないかを検出できるよう、
      // save は必ず経路を返すようにしておく
      mockSaveRoute.mockResolvedValue({
        id: 'saved-route-id',
        name: 'テストプリセット',
      });
      const screen = setupWithDestination();

      fireEvent.press(screen.getByText('saveCurrentRoute'));
      fireEvent.press(
        screen.getByTestId('save-preset-submit-without-endpoints')
      );

      await waitFor(() => expect(mockSaveRoute).toHaveBeenCalled());
      expect(mockSaveRoute.mock.calls[0][0]).toMatchObject({
        wantedDestinationId: null,
        originStationId: null,
        direction: null,
      });

      // 保存したプリセットは現在の選択と別物なので、保存済み表示には切り替えない
      await waitFor(() =>
        expect(screen.queryByTestId('save-preset-modal')).toBeNull()
      );
      expect(screen.getByText('saveCurrentRoute')).toBeTruthy();
      expect(screen.queryByText('removeFromSavedRoutes')).toBeNull();
    });

    // 区間で絞らない以上、絞り込み範囲の外にある通知駅も落としてはいけない
    it('オフにすると全区間の通知駅を保存する', async () => {
      const screen = setupWithDestination([1, 4]);

      fireEvent.press(screen.getByText('saveCurrentRoute'));
      fireEvent.press(
        screen.getByTestId('save-preset-submit-without-endpoints')
      );

      await waitFor(() => expect(mockSaveRoute).toHaveBeenCalled());
      expect(mockSaveRoute.mock.calls[0][0].notifyStationIds).toEqual([1, 4]);
    });

    it('オンのままなら保存区間内の通知駅だけを保存する', async () => {
      const screen = setupWithDestination([1, 4]);

      fireEvent.press(screen.getByText('saveCurrentRoute'));
      fireEvent.press(screen.getByTestId('save-preset-submit'));

      await waitFor(() => expect(mockSaveRoute).toHaveBeenCalled());
      expect(mockSaveRoute.mock.calls[0][0].notifyStationIds).toEqual([4]);
    });
  });
});
