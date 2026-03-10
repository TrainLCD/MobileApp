import { fireEvent, render, within } from '@testing-library/react-native';
import { useAtom, useAtomValue } from 'jotai';
import type React from 'react';
import { SelectBoundModal } from './SelectBoundModal';

jest.mock('@react-navigation/native', () => ({
  CommonActions: { navigate: jest.fn() },
  useNavigation: jest.fn(() => ({ navigate: jest.fn() })),
}));

jest.mock('jotai', () => ({
  useAtom: jest.fn(),
  useAtomValue: jest.fn(),
  atom: jest.fn((initialValue) => initialValue),
}));

jest.mock('~/hooks', () => ({
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
  RouteInfoModal: () => null,
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

jest.mock('../store/atoms/station', () => 'stationState');
jest.mock('../store/atoms/navigation', () => 'navigationState');
jest.mock('../store/atoms/line', () => 'lineState');
jest.mock('../store/atoms/notify', () => 'notifyState');
jest.mock('../store/atoms/theme', () => ({
  isLEDThemeAtom: 'isLEDThemeAtom',
}));

describe('SelectBoundModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAtomValue as jest.Mock).mockReturnValue(false);
    (useAtom as jest.Mock).mockImplementation((atom: string) => {
      if (atom === 'stationState') {
        return [
          {
            pendingStation: { id: 1, groupId: 1, lines: [{ id: 10 }] },
            pendingStations: [
              { id: 1, groupId: 1, line: { id: 10 }, lines: [{ id: 10 }] },
              { id: 2, groupId: 2, line: { id: 10 }, lines: [{ id: 10 }] },
            ],
            wantedDestination: null,
          },
          jest.fn(),
        ];
      }
      if (atom === 'navigationState') {
        return [
          {
            autoModeEnabled: false,
            fetchedTrainTypes: [
              { groupId: 100, name: 'Rapid', nameRoman: 'Rapid' },
            ],
            pendingTrainType: null,
          },
          jest.fn(),
        ];
      }
      if (atom === 'lineState') {
        return [
          {
            pendingLine: { id: 10, name: '山手線', nameRoman: 'Yamanote Line' },
            selectedLine: {
              id: 10,
              name: '山手線',
              nameRoman: 'Yamanote Line',
            },
          },
          jest.fn(),
        ];
      }
      if (atom === 'notifyState') {
        return [{ targetStationIds: [] }, jest.fn()];
      }
      return [{}, jest.fn()];
    });
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
});
