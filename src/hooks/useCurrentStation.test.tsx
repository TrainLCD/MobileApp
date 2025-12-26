import { render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import type { Station } from '~/@types/graphql';
import { LineType, OperationStatus, StopCondition } from '~/@types/graphql';
import getIsPass from '../utils/isPass';
import { useCurrentStation } from './useCurrentStation';

jest.mock('jotai', () => ({
  __esModule: true,
  useAtomValue: jest.fn(),
  atom: jest.fn(),
}));

jest.mock('../utils/isPass', () => ({
  __esModule: true,
  default: jest.fn(),
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
});

const TestComponent: React.FC<{
  skipPassStation?: boolean;
  withTrainTypes?: boolean;
}> = ({ skipPassStation = false, withTrainTypes = false }) => {
  const station = useCurrentStation(skipPassStation, withTrainTypes);
  return <Text testID="station">{JSON.stringify(station)}</Text>;
};

describe('useCurrentStation', () => {
  const mockUseAtomValue = useAtomValue as jest.MockedFunction<
    typeof useAtomValue
  >;
  const mockGetIsPass = getIsPass as jest.MockedFunction<typeof getIsPass>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetIsPass.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('stationFromStateと一致するstationを返す', () => {
    const station1 = createStation(1, 1);
    const station2 = createStation(2, 2);
    const station3 = createStation(3, 3);

    mockUseAtomValue.mockReturnValue({
      stations: [station1, station2, station3],
      station: station2,
      selectedDirection: 'INBOUND',
    });

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('station').props.children as string);

    expect(result.id).toBe(2);
  });

  it('idが一致しない場合、groupIdで検索する', () => {
    const station1 = createStation(1, 1);
    const station2 = createStation(2, 2);
    const station3 = createStation(3, 2); // same groupId as station2

    mockUseAtomValue.mockReturnValue({
      stations: [station1, station3],
      station: station2, // has id:2, but not in stations list
      selectedDirection: 'INBOUND',
    });

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('station').props.children as string);

    expect(result.id).toBe(3);
    expect(result.groupId).toBe(2);
  });

  it('stationがnullの場合、undefinedを返す', () => {
    mockUseAtomValue.mockReturnValue({
      stations: [],
      station: null,
      selectedDirection: 'INBOUND',
    });

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('station').props.children).toBeUndefined();
  });

  it('skipPassStation=trueの場合、通過駅を除外する', () => {
    const station1 = createStation(1, 1, StopCondition.All);
    const station2 = createStation(2, 2, StopCondition.Not); // pass station
    const station3 = createStation(3, 3, StopCondition.All);

    mockGetIsPass.mockImplementation(
      (s) => s?.stopCondition === StopCondition.Not
    );

    mockUseAtomValue.mockReturnValue({
      stations: [station1, station2, station3],
      station: station2,
      selectedDirection: 'INBOUND',
    });

    const { getByTestId } = render(<TestComponent skipPassStation={true} />);
    const result = JSON.parse(getByTestId('station').props.children as string);

    // station2 is pass station, so should return station1
    expect(result.id).toBe(1);
  });

  it('withTrainTypes=trueの場合、列車種別を考慮した駅を返す', () => {
    const station1 = createStation(1, 1);
    const station2 = createStation(2, 2);
    const station3 = createStation(3, 3);

    mockUseAtomValue.mockReturnValue({
      stations: [station1, station2, station3],
      station: station2,
      selectedDirection: 'INBOUND',
    });

    const { getByTestId } = render(<TestComponent withTrainTypes={true} />);
    const result = JSON.parse(getByTestId('station').props.children as string);

    expect(result.id).toBe(2);
  });

  it('OUTBOUND方向の場合、逆順で検索する', () => {
    const station1 = createStation(1, 1, StopCondition.All);
    const station2 = createStation(2, 2, StopCondition.Not); // pass station
    const station3 = createStation(3, 3, StopCondition.All);

    mockGetIsPass.mockImplementation(
      (s) => s?.stopCondition === StopCondition.Not
    );

    mockUseAtomValue.mockReturnValue({
      stations: [station1, station2, station3],
      station: station2,
      selectedDirection: 'OUTBOUND',
    });

    const { getByTestId } = render(<TestComponent skipPassStation={true} />);
    const result = JSON.parse(getByTestId('station').props.children as string);

    // OUTBOUND direction, station2 is pass station, should return station3
    expect(result.id).toBe(3);
  });
});
