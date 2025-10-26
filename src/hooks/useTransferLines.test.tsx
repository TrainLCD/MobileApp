import { render } from '@testing-library/react-native';
import type { Line, Station } from '~/@types/graphql';
import { Text } from 'react-native';
import React from 'react';
import { useAtomValue } from 'jotai';
import { useTransferLines } from './useTransferLines';
import stationState from '../store/atoms/station';
import { useCurrentStation } from './useCurrentStation';
import { useNextStation } from './useNextStation';
import { useTransferLinesFromStation } from './useTransferLinesFromStation';
import getIsPass from '../utils/isPass';

jest.mock('jotai', () => ({
  __esModule: true,
  useAtomValue: jest.fn(),
  atom: jest.fn(),
}));
jest.mock('./useCurrentStation', () => ({
  useCurrentStation: jest.fn(),
}));
jest.mock('./useNextStation', () => ({
  useNextStation: jest.fn(),
}));
jest.mock('./useTransferLinesFromStation', () => ({
  useTransferLinesFromStation: jest.fn(),
}));
jest.mock('../utils/isPass', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const TestComponent: React.FC<{ options?: { omitJR?: boolean } }> = ({
  options,
}) => {
  const lines = useTransferLines(options);
  return <Text testID="transferLines">{JSON.stringify(lines)}</Text>;
};

const createLine = (id: string): Line =>
  ({
    id,
    nameShort: id,
    name: id,
  }) as Line;

const createStation = (id: number): Station =>
  ({
    __typename: 'Station',
    id,
    groupId: id,
    name: `Station${id}`,
    nameRoman: `Station${id}`,
  }) as Station;

describe('useTransferLines', () => {
  const mockUseAtomValue = useAtomValue as jest.MockedFunction<
    typeof useAtomValue
  >;
  const mockUseCurrentStation = useCurrentStation as jest.MockedFunction<
    typeof useCurrentStation
  >;
  const mockUseNextStation = useNextStation as jest.MockedFunction<
    typeof useNextStation
  >;
  const mockUseTransferLinesFromStation =
    useTransferLinesFromStation as jest.MockedFunction<
      typeof useTransferLinesFromStation
    >;
  const mockGetIsPass = getIsPass as jest.MockedFunction<typeof getIsPass>;

  let stationAtomValue: { arrived: boolean };
  let currentStationValue: Station | null;
  let nextStationValue: Station | null;

  beforeEach(() => {
    jest.clearAllMocks();
    stationAtomValue = { arrived: false };
    currentStationValue = null;
    nextStationValue = null;
    mockUseAtomValue.mockImplementation((atom) => {
      if (atom === stationState) {
        return stationAtomValue;
      }
      throw new Error('unknown atom');
    });
    mockUseCurrentStation.mockImplementation(() => currentStationValue);
    mockUseNextStation.mockImplementation(() => nextStationValue ?? undefined);
    mockUseTransferLinesFromStation.mockReturnValue([]);
    mockGetIsPass.mockReturnValue(false);
  });

  it('到着済みかつ停車駅なら現在駅の乗換情報を返す', () => {
    const currentStation = createStation(1);
    const transferLines = [createLine('metro'), createLine('jr')];
    stationAtomValue.arrived = true;
    currentStationValue = currentStation;
    nextStationValue = createStation(2);
    mockUseTransferLinesFromStation.mockReturnValue(transferLines);

    const { getByTestId } = render(<TestComponent />);

    expect(mockUseTransferLinesFromStation).toHaveBeenCalledWith(
      currentStation,
      {
        omitRepeatingLine: undefined,
        omitJR: false,
      }
    );
    expect(getByTestId('transferLines').props.children).toContain('metro');
  });

  it('通過駅では次駅を対象にする', () => {
    const currentStation = createStation(10);
    const followingStation = createStation(11);
    stationAtomValue.arrived = true;
    currentStationValue = currentStation;
    nextStationValue = followingStation;
    mockGetIsPass.mockReturnValue(true);

    render(<TestComponent options={{ omitJR: true }} />);

    expect(mockUseTransferLinesFromStation).toHaveBeenCalledWith(
      followingStation,
      {
        omitRepeatingLine: undefined,
        omitJR: true,
      }
    );
  });

  it('未到着時も次駅を対象にする', () => {
    const nextStation = createStation(20);
    stationAtomValue.arrived = false;
    nextStationValue = nextStation;

    render(<TestComponent />);

    expect(mockUseTransferLinesFromStation).toHaveBeenCalledWith(nextStation, {
      omitRepeatingLine: undefined,
      omitJR: false,
    });
  });
});
