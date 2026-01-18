import { render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import type { Station } from '~/@types/graphql';
import { StopCondition } from '~/@types/graphql';
import { createStation } from '~/utils/test/factories';
import getIsPass from '../utils/isPass';
import { useCurrentStation } from './useCurrentStation';
import { useLoopLine } from './useLoopLine';
import { useNextStation } from './useNextStation';

jest.mock('jotai', () => ({
  __esModule: true,
  useAtomValue: jest.fn(),
  atom: jest.fn(),
}));

jest.mock('./useCurrentStation', () => ({
  useCurrentStation: jest.fn(),
}));

jest.mock('./useLoopLine', () => ({
  useLoopLine: jest.fn(),
}));

jest.mock('../utils/isPass', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('~/utils/dropJunctionStation', () => ({
  __esModule: true,
  default: jest.fn((stations) => stations),
}));

const TestComponent: React.FC<{
  ignorePass?: boolean;
  originStation?: Station;
}> = ({ ignorePass = true, originStation }) => {
  const station = useNextStation(ignorePass, originStation);
  return <Text testID="station">{JSON.stringify(station)}</Text>;
};

describe('useNextStation', () => {
  const mockUseAtomValue = useAtomValue as jest.MockedFunction<
    typeof useAtomValue
  >;
  const mockUseCurrentStation = useCurrentStation as jest.MockedFunction<
    typeof useCurrentStation
  >;
  const mockUseLoopLine = useLoopLine as jest.MockedFunction<
    typeof useLoopLine
  >;
  const mockGetIsPass = getIsPass as jest.MockedFunction<typeof getIsPass>;

  beforeEach(() => {
    mockGetIsPass.mockReturnValue(false);
    mockUseLoopLine.mockReturnValue({
      isYamanoteLine: false,
      isOsakaLoopLine: false,
      isMeijoLine: false,
      isOedoLine: false,
      isLoopLine: false,
      isPartiallyLoopLine: false,
      inboundStationsForLoopLine: [],
      outboundStationsForLoopLine: [],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('INBOUND方向で次の駅を返す', () => {
    const station1 = createStation(1, { groupId: 1 });
    const station2 = createStation(2, { groupId: 2 });
    const station3 = createStation(3, { groupId: 3 });

    mockUseCurrentStation.mockReturnValue(station1);

    mockUseAtomValue.mockReturnValue({
      stations: [station1, station2, station3],
      selectedDirection: 'INBOUND',
    });

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('station').props.children as string);

    expect(result.id).toBe(2);
  });

  it('OUTBOUND方向で次の駅を返す', () => {
    const station1 = createStation(1, { groupId: 1 });
    const station2 = createStation(2, { groupId: 2 });
    const station3 = createStation(3, { groupId: 3 });

    mockUseCurrentStation.mockReturnValue(station2);

    mockUseAtomValue.mockReturnValue({
      stations: [station1, station2, station3],
      selectedDirection: 'OUTBOUND',
    });

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('station').props.children as string);

    expect(result.id).toBe(1);
  });

  it('通過駅をスキップする（ignorePass=true）', () => {
    const station1 = createStation(1, {
      groupId: 1,
      stopCondition: StopCondition.All,
    });
    // pass station
    const station2 = createStation(2, {
      groupId: 2,
      stopCondition: StopCondition.Not,
    });
    const station3 = createStation(3, {
      groupId: 3,
      stopCondition: StopCondition.All,
    });

    mockGetIsPass.mockImplementation(
      (s) => s?.stopCondition === StopCondition.Not
    );

    mockUseCurrentStation.mockReturnValue(station1);

    mockUseAtomValue.mockReturnValue({
      stations: [station1, station2, station3],
      selectedDirection: 'INBOUND',
    });

    const { getByTestId } = render(<TestComponent ignorePass={true} />);
    const result = JSON.parse(getByTestId('station').props.children as string);

    // Should skip station2 and return station3
    expect(result.id).toBe(3);
  });

  it('通過駅を含める（ignorePass=false）', () => {
    const station1 = createStation(1, {
      groupId: 1,
      stopCondition: StopCondition.All,
    });
    // pass station
    const station2 = createStation(2, {
      groupId: 2,
      stopCondition: StopCondition.Not,
    });
    const station3 = createStation(3, {
      groupId: 3,
      stopCondition: StopCondition.All,
    });

    mockGetIsPass.mockImplementation(
      (s) => s?.stopCondition === StopCondition.Not
    );

    mockUseCurrentStation.mockReturnValue(station1);

    mockUseAtomValue.mockReturnValue({
      stations: [station1, station2, station3],
      selectedDirection: 'INBOUND',
    });

    const { getByTestId } = render(<TestComponent ignorePass={false} />);
    const result = JSON.parse(getByTestId('station').props.children as string);

    // Should return station2 even if it's a pass station
    expect(result.id).toBe(2);
  });

  it('環状線の場合、次の駅を返す（INBOUND）', () => {
    const station1 = createStation(1, { groupId: 1 });
    const station2 = createStation(2, { groupId: 2 });
    const station3 = createStation(3, { groupId: 3 });

    mockUseLoopLine.mockReturnValue({
      isYamanoteLine: false,
      isOsakaLoopLine: false,
      isMeijoLine: false,
      isOedoLine: false,
      isLoopLine: true,
      isPartiallyLoopLine: false,
      inboundStationsForLoopLine: [station1, station2, station3],
      outboundStationsForLoopLine: [],
    });

    mockUseCurrentStation.mockReturnValue(station2);

    mockUseAtomValue.mockReturnValue({
      stations: [station1, station2, station3],
      selectedDirection: 'INBOUND',
    });

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('station').props.children as string);

    // Loop line should return a valid station
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });

  it('環状線の場合、次の駅を返す（OUTBOUND）', () => {
    const station1 = createStation(1, { groupId: 1 });
    const station2 = createStation(2, { groupId: 2 });
    const station3 = createStation(3, { groupId: 3 });

    mockUseLoopLine.mockReturnValue({
      isYamanoteLine: false,
      isOsakaLoopLine: false,
      isMeijoLine: false,
      isOedoLine: false,
      isLoopLine: true,
      isPartiallyLoopLine: false,
      inboundStationsForLoopLine: [],
      outboundStationsForLoopLine: [station1, station2, station3],
    });

    mockUseCurrentStation.mockReturnValue(station2);

    mockUseAtomValue.mockReturnValue({
      stations: [station1, station2, station3],
      selectedDirection: 'OUTBOUND',
    });

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('station').props.children as string);

    // Loop line should return a valid station
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });

  it('originStationが指定された場合、それを基準にする', () => {
    const station1 = createStation(1, { groupId: 1 });
    const station2 = createStation(2, { groupId: 2 });
    const station3 = createStation(3, { groupId: 3 });

    mockUseCurrentStation.mockReturnValue(station1);

    mockUseAtomValue.mockReturnValue({
      stations: [station1, station2, station3],
      selectedDirection: 'INBOUND',
    });

    const { getByTestId } = render(<TestComponent originStation={station2} />);
    const result = JSON.parse(getByTestId('station').props.children as string);

    // Should use originStation (station2) instead of currentStation
    expect(result.id).toBe(3);
  });

  it('末尾の駅の場合、undefinedを返す（非環状線、INBOUND）', () => {
    const station1 = createStation(1, { groupId: 1 });
    const station2 = createStation(2, { groupId: 2 });
    const station3 = createStation(3, { groupId: 3 });

    mockUseCurrentStation.mockReturnValue(station3);

    mockUseAtomValue.mockReturnValue({
      stations: [station1, station2, station3],
      selectedDirection: 'INBOUND',
    });

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('station').props.children).toBeUndefined();
  });

  it('先頭の駅の場合、undefinedを返す（非環状線、OUTBOUND）', () => {
    const station1 = createStation(1, { groupId: 1 });
    const station2 = createStation(2, { groupId: 2 });
    const station3 = createStation(3, { groupId: 3 });

    mockUseCurrentStation.mockReturnValue(station1);

    mockUseAtomValue.mockReturnValue({
      stations: [station1, station2, station3],
      selectedDirection: 'OUTBOUND',
    });

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('station').props.children).toBeUndefined();
  });
});
