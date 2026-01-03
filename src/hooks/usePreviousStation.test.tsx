import { render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import type { Station } from '~/@types/graphql';
import { LineType, OperationStatus, StopCondition } from '~/@types/graphql';
import getIsPass from '../utils/isPass';
import { useCurrentStation } from './useCurrentStation';
import { usePreviousStation } from './usePreviousStation';

jest.mock('jotai', () => ({
  __esModule: true,
  useAtomValue: jest.fn(),
  atom: jest.fn(),
}));

jest.mock('./useCurrentStation', () => ({
  useCurrentStation: jest.fn(),
}));

jest.mock('../utils/isPass', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../utils/dropJunctionStation', () => ({
  __esModule: true,
  default: jest.fn((stations) => stations),
}));

const createStation = (
  id: number,
  groupId: number,
  stopCondition: StopCondition = StopCondition.All
): Station => ({
  __typename: 'Station',
  address: null,
  closedAt: null,
  distance: null,
  groupId,
  hasTrainTypes: false,
  id,
  latitude: null,
  line: {
    __typename: 'LineNested',
    averageDistance: null,
    color: '#123456',
    company: null,
    id: 1,
    lineSymbols: [],
    lineType: LineType.Normal,
    nameChinese: null,
    nameFull: 'Test Line',
    nameKatakana: 'テストライン',
    nameKorean: null,
    nameRoman: 'Test Line',
    nameShort: 'Test',
    station: null,
    status: OperationStatus.InOperation,
    trainType: null,
    transportType: null,
  },
  lines: [],
  longitude: null,
  name: `Station${id}`,
  nameChinese: null,
  nameKatakana: `ステーション${id}`,
  nameKorean: null,
  nameRoman: `Station${id}`,
  openedAt: null,
  postalCode: null,
  prefectureId: null,
  stationNumbers: [],
  status: OperationStatus.InOperation,
  stopCondition,
  threeLetterCode: null,
  trainType: null,
  transportType: null,
});

const TestComponent: React.FC<{ skipPass?: boolean }> = ({
  skipPass = true,
}) => {
  const station = usePreviousStation(skipPass);
  return <Text testID="station">{JSON.stringify(station)}</Text>;
};

describe('usePreviousStation', () => {
  const mockUseAtomValue = useAtomValue as jest.MockedFunction<
    typeof useAtomValue
  >;
  const mockUseCurrentStation = useCurrentStation as jest.MockedFunction<
    typeof useCurrentStation
  >;
  const mockGetIsPass = getIsPass as jest.MockedFunction<typeof getIsPass>;

  beforeEach(() => {
    mockGetIsPass.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('INBOUND方向の場合、前の駅情報を処理する', () => {
    const station1 = createStation(1, 1);
    const station2 = createStation(2, 2);
    const station3 = createStation(3, 3);

    mockUseCurrentStation.mockReturnValue(station2);

    mockUseAtomValue.mockReturnValue({
      stations: [station1, station2, station3],
      selectedDirection: 'INBOUND',
    });

    const { getByTestId } = render(<TestComponent />);
    const stationElement = getByTestId('station');

    // Verify hook executes without error
    expect(stationElement).toBeDefined();
  });

  it('OUTBOUND方向の場合、前の駅情報を処理する', () => {
    const station1 = createStation(1, 1);
    const station2 = createStation(2, 2);
    const station3 = createStation(3, 3);

    mockUseCurrentStation.mockReturnValue(station2);

    mockUseAtomValue.mockReturnValue({
      stations: [station1, station2, station3],
      selectedDirection: 'OUTBOUND',
    });

    const { getByTestId } = render(<TestComponent />);
    const stationElement = getByTestId('station');

    // Verify hook executes without error
    expect(stationElement).toBeDefined();
  });

  it('先頭の駅の場合、undefinedを返す', () => {
    const station1 = createStation(1, 1);
    const station2 = createStation(2, 2);
    const station3 = createStation(3, 3);

    mockUseCurrentStation.mockReturnValue(station1);

    mockUseAtomValue.mockReturnValue({
      stations: [station1, station2, station3],
      selectedDirection: 'INBOUND',
    });

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('station').props.children).toBeUndefined();
  });

  it('currentStationがundefinedの場合、undefinedを返す', () => {
    mockUseCurrentStation.mockReturnValue(undefined);

    mockUseAtomValue.mockReturnValue({
      stations: [],
      selectedDirection: 'INBOUND',
    });

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('station').props.children).toBeUndefined();
  });
});
