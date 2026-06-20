import { fireEvent, render, within } from '@testing-library/react-native';
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
    save: jest.fn(),
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
  SavePresetNameModal: ({ visible }: { visible: boolean }) =>
    visible
      ? (() => {
          const { View } = require('react-native');
          return <View testID="save-preset-modal" />;
        })()
      : null,
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
});
