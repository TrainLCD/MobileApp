import { render, waitFor } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import type { Line, Station, TrainType } from '~/@types/graphql';
import { createLine, createStation } from '~/utils/test/factories';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentStation } from './useCurrentStation';
import { useCurrentTrainType } from './useCurrentTrainType';

jest.mock('jotai', () => ({
  __esModule: true,
  useAtomValue: jest.fn(),
  atom: jest.fn(),
}));
jest.mock('../store/atoms/station', () => ({
  __esModule: true,
  default: { __atom: 'station' },
}));
jest.mock('../store/atoms/navigation', () => ({
  __esModule: true,
  default: { __atom: 'navigation' },
}));
jest.mock('./useCurrentStation', () => ({
  useCurrentStation: jest.fn(),
}));
jest.mock('./useCurrentLine', () => ({
  useCurrentLine: jest.fn(),
}));
jest.mock('../utils/isPass', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const TestComponent: React.FC = () => {
  const trainType = useCurrentTrainType();
  return (
    <Text testID="trainType">
      {trainType ? (trainType.typeId ?? '') : 'null'}
    </Text>
  );
};

const TRAIN_TYPE_IDS = {
  LOCAL: 1,
  RAPID: 2,
  EXPRESS: 3,
} as const;

const createTrainType = (
  overrides: Partial<TrainType> = {},
  typename: TrainType['__typename'] = 'TrainType'
): TrainType => ({
  __typename: typename,
  color: '#ffffff',
  direction: null,
  groupId: null,
  id: null,
  kind: null,
  line: null,
  lines: [],
  name: 'Local',
  nameChinese: null,
  nameKatakana: 'ローカル',
  nameKorean: null,
  nameRoman: 'Local',
  typeId: TRAIN_TYPE_IDS.LOCAL,
  ...overrides,
});

describe('useCurrentTrainType', () => {
  const mockUseAtomValue = useAtomValue as jest.MockedFunction<
    typeof useAtomValue
  >;
  const mockUseCurrentStation = useCurrentStation as jest.MockedFunction<
    typeof useCurrentStation
  >;
  const mockUseCurrentLine = useCurrentLine as jest.MockedFunction<
    typeof useCurrentLine
  >;
  const mockGetIsPass = getIsPass as jest.MockedFunction<typeof getIsPass>;

  let stationAtomValue: { stations: Station[] };
  let navigationAtomValue: { trainType: TrainType | null };
  let currentStationValue: Station | undefined;
  let currentLineValue: Line | null;

  beforeEach(() => {
    stationAtomValue = { stations: [] };
    navigationAtomValue = { trainType: null };
    currentStationValue = undefined;
    currentLineValue = createLine(1);
    mockUseAtomValue.mockImplementation((atom) => {
      if (atom === stationState) {
        return stationAtomValue;
      }
      if (atom === navigationState) {
        return navigationAtomValue;
      }
      throw new Error('unknown atom');
    });
    mockUseCurrentStation.mockImplementation(() => currentStationValue);
    mockUseCurrentLine.mockImplementation(() => currentLineValue);
    mockGetIsPass.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('現在駅の種別をそのまま返す', () => {
    const stationTrainType = createTrainType({
      typeId: TRAIN_TYPE_IDS.RAPID,
      name: 'Rapid',
      __typename: 'TrainTypeNested',
    });
    currentStationValue = createStation(1, {
      line: { id: 1 },
      trainType: stationTrainType,
    } as Parameters<typeof createStation>[1]);
    currentLineValue = createLine(1);
    navigationAtomValue.trainType = createTrainType({
      typeId: TRAIN_TYPE_IDS.LOCAL,
      name: 'Local',
    });

    const { getByTestId } = render(<TestComponent />);

    expect(getByTestId('trainType').props.children).toBe(TRAIN_TYPE_IDS.RAPID);
  });

  it('現在の路線が異なるとき stations の種別に同期する', async () => {
    const actualTrainType = createTrainType({
      typeId: TRAIN_TYPE_IDS.EXPRESS,
      name: 'Express',
      __typename: 'TrainTypeNested',
    });
    currentStationValue = createStation(1, {
      line: { id: 1 },
      trainType: createTrainType({
        typeId: TRAIN_TYPE_IDS.RAPID,
        __typename: 'TrainTypeNested',
      }),
    } as Parameters<typeof createStation>[1]);
    const throughStation = createStation(200, {
      line: { id: 2 },
      trainType: actualTrainType,
    } as Parameters<typeof createStation>[1]);
    stationAtomValue = { stations: [throughStation] };
    currentLineValue = createLine(2, {
      station: { id: 200, __typename: 'StationNested' } as Line['station'],
    });

    const { getByTestId } = render(<TestComponent />);

    await waitFor(() =>
      expect(getByTestId('trainType').props.children).toBe(
        TRAIN_TYPE_IDS.EXPRESS
      )
    );
  });

  it('navigationState の trainType が null になるとキャッシュをクリアする', async () => {
    const passStation = createStation(1, {
      line: { id: 1 },
      trainType: null,
    } as Parameters<typeof createStation>[1]);
    currentStationValue = passStation;
    currentLineValue = passStation.line as Line;
    navigationAtomValue.trainType = createTrainType({
      typeId: TRAIN_TYPE_IDS.RAPID,
    });
    mockGetIsPass.mockReturnValue(true);

    const screen = render(<TestComponent />);
    expect(mockUseAtomValue).toHaveBeenCalledWith(navigationState);
    expect(screen.getByTestId('trainType').props.children).toBe(
      TRAIN_TYPE_IDS.RAPID
    );

    navigationAtomValue.trainType = null;
    screen.rerender(<TestComponent />);

    await waitFor(() =>
      expect(screen.getByTestId('trainType').props.children).toBe('null')
    );
  });

  it('通過駅では前回の種別を維持する', () => {
    const baseStation = createStation(1, {
      line: { id: 3 },
      trainType: createTrainType({
        typeId: TRAIN_TYPE_IDS.RAPID,
        __typename: 'TrainTypeNested',
      }),
    } as Parameters<typeof createStation>[1]);
    const passStation = createStation(2, {
      line: { id: 3 },
      trainType: createTrainType({
        typeId: TRAIN_TYPE_IDS.EXPRESS,
        __typename: 'TrainTypeNested',
      }),
    } as Parameters<typeof createStation>[1]);
    currentStationValue = baseStation;
    currentLineValue = baseStation.line as Line;
    navigationAtomValue.trainType = createTrainType({
      typeId: TRAIN_TYPE_IDS.RAPID,
    });
    mockGetIsPass.mockImplementation(
      (station) => station?.id === passStation.id
    );

    const screen = render(<TestComponent />);
    expect(screen.getByTestId('trainType').props.children).toBe(
      TRAIN_TYPE_IDS.RAPID
    );

    currentStationValue = passStation;
    currentLineValue = passStation.line as Line;
    screen.rerender(<TestComponent />);

    expect(screen.getByTestId('trainType').props.children).toBe(
      TRAIN_TYPE_IDS.RAPID
    );
  });
});
