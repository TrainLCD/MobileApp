import { render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import { StopCondition } from '~/@types/graphql';
import { createStation } from '~/utils/test/factories';
import getIsPass from '../utils/isPass';
import { useApproachingStation } from './useApproachingStation';
import { useCurrentStation } from './useCurrentStation';
import { useDisplayCurrentStation } from './useDisplayCurrentStation';
import { useLoopLine } from './useLoopLine';

jest.mock('jotai', () => ({
  __esModule: true,
  useAtomValue: jest.fn(),
  atom: jest.fn(),
}));

jest.mock('../store/atoms/station', () => ({
  __esModule: true,
  approachingAtom: 'APPROACHING_ATOM',
  stationsAtom: 'STATIONS_ATOM',
  selectedDirectionAtom: 'SELECTED_DIRECTION_ATOM',
}));

jest.mock('../utils/dropJunctionStation', () => ({
  __esModule: true,
  // ジャンクション除去はここでは検証対象外なので素通しする
  default: (stations: unknown) => stations,
}));

jest.mock('../utils/isPass', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('./useApproachingStation', () => ({
  __esModule: true,
  useApproachingStation: jest.fn(),
}));

jest.mock('./useCurrentStation', () => ({
  __esModule: true,
  useCurrentStation: jest.fn(),
}));

jest.mock('./useLoopLine', () => ({
  __esModule: true,
  useLoopLine: jest.fn(),
}));

const TestComponent: React.FC = () => {
  const station = useDisplayCurrentStation();
  return <Text testID="station">{JSON.stringify(station)}</Text>;
};

describe('useDisplayCurrentStation', () => {
  const mockUseAtomValue = useAtomValue as jest.MockedFunction<
    typeof useAtomValue
  >;
  const mockUseApproachingStation =
    useApproachingStation as jest.MockedFunction<typeof useApproachingStation>;
  const mockUseCurrentStation = useCurrentStation as jest.MockedFunction<
    typeof useCurrentStation
  >;
  const mockUseLoopLine = useLoopLine as jest.MockedFunction<
    typeof useLoopLine
  >;
  const mockGetIsPass = getIsPass as jest.MockedFunction<typeof getIsPass>;

  const setStationState = (state: {
    approaching: boolean;
    stations: ReturnType<typeof createStation>[];
    selectedDirection?: 'INBOUND' | 'OUTBOUND';
  }) => {
    const { approaching, stations, selectedDirection = 'INBOUND' } = state;
    mockUseAtomValue.mockImplementation((atom: unknown) => {
      if (atom === 'APPROACHING_ATOM') {
        return approaching;
      }
      if (atom === 'STATIONS_ATOM') {
        return stations;
      }
      if (atom === 'SELECTED_DIRECTION_ATOM') {
        return selectedDirection;
      }
      return undefined;
    });
  };

  beforeEach(() => {
    mockGetIsPass.mockReturnValue(false);
    mockUseLoopLine.mockReturnValue({ isLoopLine: false } as ReturnType<
      typeof useLoopLine
    >);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('非接近時は useCurrentStation をそのまま返す', () => {
    const a = createStation(1);
    const b = createStation(2);
    setStationState({ approaching: false, stations: [a, b] });
    mockUseCurrentStation.mockReturnValue(a);
    mockUseApproachingStation.mockReturnValue(b);

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('station').props.children as string);
    expect(result.id).toBe(1);
  });

  it('通常運行(接近駅の1つ手前が現在駅)では前方補正せず現在駅を返す', () => {
    const a = createStation(1);
    const b = createStation(2);
    const c = createStation(3);
    setStationState({ approaching: true, stations: [a, b, c] });
    // 現在駅A・接近駅B(=次の停車駅)。Bの手前はAで現在駅と一致するため補正不要
    mockUseCurrentStation.mockReturnValue(a);
    mockUseApproachingStation.mockReturnValue(b);

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('station').props.children as string);
    expect(result.id).toBe(1);
  });

  it('到着取りこぼしで現在駅が古いときは接近駅の1つ手前の停車駅へ前方補正する', () => {
    const a = createStation(1);
    const b = createStation(2);
    const c = createStation(3);
    setStationState({ approaching: true, stations: [a, b, c] });
    // 記録上の現在駅はA(古い)だが、GPSの接近駅はC。Cの手前の停車駅Bへ補正する
    mockUseCurrentStation.mockReturnValue(a);
    mockUseApproachingStation.mockReturnValue(c);

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('station').props.children as string);
    expect(result.id).toBe(2);
  });

  it('前方補正時は通過駅をスキップして手前の停車駅を返す', () => {
    const a = createStation(1, { stopCondition: StopCondition.All });
    const b = createStation(2, { stopCondition: StopCondition.All });
    const pass = createStation(3, { stopCondition: StopCondition.Not });
    const d = createStation(4, { stopCondition: StopCondition.All });
    setStationState({ approaching: true, stations: [a, b, pass, d] });
    mockGetIsPass.mockImplementation(
      (s) => s?.stopCondition === StopCondition.Not
    );
    // 現在駅A(古い)・接近駅D。Dの手前は通過駅passだがスキップして停車駅Bを返す
    mockUseCurrentStation.mockReturnValue(a);
    mockUseApproachingStation.mockReturnValue(d);

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('station').props.children as string);
    expect(result.id).toBe(2);
  });

  it('ループ線では補正せず useCurrentStation を返す', () => {
    const a = createStation(1);
    const b = createStation(2);
    const c = createStation(3);
    setStationState({ approaching: true, stations: [a, b, c] });
    mockUseLoopLine.mockReturnValue({ isLoopLine: true } as ReturnType<
      typeof useLoopLine
    >);
    mockUseCurrentStation.mockReturnValue(a);
    mockUseApproachingStation.mockReturnValue(c);

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('station').props.children as string);
    // 補正されず現在駅Aのまま
    expect(result.id).toBe(1);
  });

  it('OUTBOUND でも取りこぼし時に接近駅の1つ手前の停車駅へ補正する', () => {
    const a = createStation(1);
    const b = createStation(2);
    const c = createStation(3);
    const d = createStation(4);
    // 配列は [A,B,C,D]、OUTBOUND は逆順 [D,C,B,A] で進む
    setStationState({
      approaching: true,
      stations: [a, b, c, d],
      selectedDirection: 'OUTBOUND',
    });
    // 記録上の現在駅はD(古い)、接近駅はB。Bの手前(進行方向)はCへ補正する
    mockUseCurrentStation.mockReturnValue(d);
    mockUseApproachingStation.mockReturnValue(b);

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('station').props.children as string);
    expect(result.id).toBe(3);
  });
});
