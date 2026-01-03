import { render, waitFor } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import type { Line, Station, TrainType } from '~/@types/graphql';
import { LineType, OperationStatus, StopCondition } from '~/@types/graphql';
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

type StationNestedType = Extract<Station, { __typename: 'StationNested' }>;
type LineNestedType = Extract<Line, { __typename: 'LineNested' }>;
type TrainTypeNestedType = Extract<
  TrainType,
  { __typename: 'TrainTypeNested' }
>;

type LineOverrides = Partial<Omit<Line, 'station' | 'trainType'>> & {
  station?: Station | null;
  trainType?: TrainType | null;
};

const createLine = (
  overrides: LineOverrides = {},
  typename: Line['__typename'] = 'Line'
): Line => {
  const {
    station: stationOverride,
    trainType: trainTypeOverride,
    ...rest
  } = overrides;
  const stationValue: StationNestedType | null =
    stationOverride !== undefined && stationOverride !== null
      ? ({
          ...stationOverride,
          __typename: 'StationNested',
          line: null,
        } as StationNestedType)
      : null;
  const trainTypeValue: TrainTypeNestedType | null =
    trainTypeOverride !== undefined && trainTypeOverride !== null
      ? ({
          ...trainTypeOverride,
          __typename: 'TrainTypeNested',
        } as TrainTypeNestedType)
      : null;
  return {
    __typename: typename,
    averageDistance: null,
    color: '#123456',
    company: null,
    id: 1,
    lineSymbols: [],
    lineType: LineType.Normal,
    nameChinese: null,
    nameFull: 'Main Line',
    nameKatakana: 'メインライン',
    nameKorean: 'メインライン',
    nameRoman: 'Main Line',
    nameShort: 'Main',
    station: stationValue,
    status: OperationStatus.InOperation,
    trainType: trainTypeValue,
    transportType: null,
    ...rest,
  };
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

type StationOverrides = Partial<Omit<Station, 'line' | 'trainType'>> & {
  line?: Line | null;
  trainType?: TrainType | null;
};

const createStation = (
  overrides: StationOverrides = {},
  typename: Station['__typename'] = 'Station'
): Station => {
  const {
    line: lineOverride,
    trainType: trainTypeOverride,
    id: overrideId,
    groupId: overrideGroupId,
    ...rest
  } = overrides;
  const lineValue: LineNestedType | null =
    lineOverride !== undefined && lineOverride !== null
      ? ({ ...lineOverride, __typename: 'LineNested' } as LineNestedType)
      : null;
  const trainTypeValue: TrainTypeNestedType | null =
    trainTypeOverride !== undefined && trainTypeOverride !== null
      ? ({
          ...trainTypeOverride,
          __typename: 'TrainTypeNested',
        } as TrainTypeNestedType)
      : null;
  const stationId = (overrideId as number | undefined) ?? 1;
  const stationGroupId = (overrideGroupId as number | undefined) ?? stationId;
  return {
    __typename: typename,
    address: null,
    closedAt: null,
    distance: null,
    groupId: stationGroupId,
    hasTrainTypes: true,
    id: stationId,
    latitude: null,
    line: lineValue,
    lines: [],
    longitude: null,
    name: 'Shibuya',
    nameChinese: null,
    nameKatakana: 'シブヤ',
    nameKorean: null,
    nameRoman: 'Shibuya',
    openedAt: null,
    postalCode: null,
    prefectureId: null,
    stationNumbers: [],
    status: OperationStatus.InOperation,
    stopCondition: StopCondition.All,
    threeLetterCode: null,
    trainType: trainTypeValue,
    transportType: null,
    ...rest,
  };
};

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
    currentLineValue = createLine();
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
    });
    currentStationValue = createStation({
      line: createLine({ id: 1 }),
      trainType: stationTrainType,
    });
    currentLineValue = createLine({ id: 1 });
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
    });
    currentStationValue = createStation({
      line: createLine({ id: 1 }),
      trainType: createTrainType({ typeId: TRAIN_TYPE_IDS.RAPID }),
    });
    const throughStation = createStation({
      id: 200,
      line: createLine({ id: 2 }),
      trainType: actualTrainType,
    });
    stationAtomValue = { stations: [throughStation] };
    currentLineValue = createLine({
      id: 2,
      station: createStation({ id: 200, line: undefined }, 'StationNested'),
    });

    const { getByTestId } = render(<TestComponent />);

    await waitFor(() =>
      expect(getByTestId('trainType').props.children).toBe(
        TRAIN_TYPE_IDS.EXPRESS
      )
    );
  });

  it('navigationState の trainType が null になるとキャッシュをクリアする', async () => {
    const passStation = createStation({
      line: createLine({ id: 1 }),
      trainType: null,
    });
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
    const baseStation = createStation({
      line: createLine({ id: 3 }),
      trainType: createTrainType({ typeId: TRAIN_TYPE_IDS.RAPID }),
    });
    const passStation = createStation({
      id: 2,
      line: createLine({ id: 3 }),
      trainType: createTrainType({ typeId: TRAIN_TYPE_IDS.EXPRESS }),
    });
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
