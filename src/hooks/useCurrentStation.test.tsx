import { render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import { StopCondition } from '~/@types/graphql';
import { createStation } from '~/utils/test/factories';
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
    mockGetIsPass.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('stationFromStateと一致するstationを返す', () => {
    const station1 = createStation(1, { groupId: 1 });
    const station2 = createStation(2, { groupId: 2 });
    const station3 = createStation(3, { groupId: 3 });

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
    const station1 = createStation(1, { groupId: 1 });
    const station2 = createStation(2, { groupId: 2 });
    const station3 = createStation(3, { groupId: 2 }); // same groupId as station2

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
    const station1 = createStation(1, {
      groupId: 1,
      stopCondition: StopCondition.All,
    });
    const station2 = createStation(2, {
      groupId: 2,
      stopCondition: StopCondition.Not,
    }); // pass station
    const station3 = createStation(3, {
      groupId: 3,
      stopCondition: StopCondition.All,
    });

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
    const station1 = createStation(1, { groupId: 1 });
    const station2 = createStation(2, { groupId: 2 });
    const station3 = createStation(3, { groupId: 3 });

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
    const station1 = createStation(1, {
      groupId: 1,
      stopCondition: StopCondition.All,
    });
    const station2 = createStation(2, {
      groupId: 2,
      stopCondition: StopCondition.Not,
    }); // pass station
    const station3 = createStation(3, {
      groupId: 3,
      stopCondition: StopCondition.All,
    });

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
