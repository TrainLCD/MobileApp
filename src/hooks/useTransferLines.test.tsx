import { render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import type { Station } from '~/@types/graphql';
import { createLine, createStation } from '~/utils/test/factories';
import stationState from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import { useCurrentStation } from './useCurrentStation';
import { useDisplayNextStation } from './useDisplayNextStation';
import { useTransferLines } from './useTransferLines';
import { useTransferLinesFromStation } from './useTransferLinesFromStation';

jest.mock('jotai', () => ({
  __esModule: true,
  useAtomValue: jest.fn(),
  atom: jest.fn(),
}));
jest.mock('./useCurrentStation', () => ({
  useCurrentStation: jest.fn(),
}));
jest.mock('./useDisplayNextStation', () => ({
  useDisplayNextStation: jest.fn(),
}));
jest.mock('./useTransferLinesFromStation', () => ({
  useTransferLinesFromStation: jest.fn(),
}));
jest.mock('../utils/isPass', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const TestComponent: React.FC<{
  options?: { omitJR?: boolean };
}> = ({ options }) => {
  const lines = useTransferLines(options);
  return <Text testID="transferLines">{JSON.stringify(lines)}</Text>;
};

describe('useTransferLines', () => {
  const mockUseAtomValue = useAtomValue as jest.MockedFunction<
    typeof useAtomValue
  >;
  const mockUseCurrentStation = useCurrentStation as jest.MockedFunction<
    typeof useCurrentStation
  >;
  const mockUseDisplayNextStation =
    useDisplayNextStation as jest.MockedFunction<typeof useDisplayNextStation>;
  const mockUseTransferLinesFromStation =
    useTransferLinesFromStation as jest.MockedFunction<
      typeof useTransferLinesFromStation
    >;
  const mockGetIsPass = getIsPass as jest.MockedFunction<typeof getIsPass>;

  let stationAtomValue: { arrived: boolean };
  let currentStationValue: Station | undefined;
  let nextStationValue: Station | null;

  beforeEach(() => {
    stationAtomValue = { arrived: false };
    currentStationValue = undefined;
    nextStationValue = null;
    mockUseAtomValue.mockImplementation((atom) => {
      if (atom === stationState) {
        return stationAtomValue;
      }
      throw new Error('unknown atom');
    });
    mockUseCurrentStation.mockImplementation(() => currentStationValue);
    mockUseDisplayNextStation.mockImplementation(
      () => nextStationValue ?? undefined
    );
    mockUseTransferLinesFromStation.mockReturnValue([]);
    mockGetIsPass.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('到着済みかつ停車駅なら現在駅の乗換情報を返す', () => {
    const currentStation = createStation(1);
    const transferLines = [
      createLine(100, { nameShort: 'metro' }),
      createLine(101, { nameShort: 'jr' }),
    ];
    stationAtomValue.arrived = true;
    currentStationValue = currentStation;
    nextStationValue = createStation(2);
    mockUseTransferLinesFromStation.mockReturnValue(transferLines);

    const { getByTestId } = render(<TestComponent />);

    expect(mockUseTransferLinesFromStation).toHaveBeenCalledWith(
      currentStation,
      {
        omitRepeatingLine: false,
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

  it('未到着時は表示用の次駅 (接近中はGPS基準の接近駅) を対象にする', () => {
    // useDisplayNextStation は接近中に路線順の次駅ではなく実際に接近している駅を
    // 返すことがある。乗換案内はヘッダー・TTS の「まもなく」駅名と同じ駅を
    // 対象にしなければならない。
    const displayNextStation = createStation(20);
    stationAtomValue.arrived = false;
    nextStationValue = displayNextStation;

    render(<TestComponent />);

    expect(mockUseTransferLinesFromStation).toHaveBeenCalledWith(
      displayNextStation,
      {
        omitRepeatingLine: false,
        omitJR: false,
      }
    );
  });
});
