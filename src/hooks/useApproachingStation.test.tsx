import { render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import { StopCondition } from '~/@types/graphql';
import { createStation } from '~/utils/test/factories';
import getIsPass from '../utils/isPass';
import { useApproachingStation } from './useApproachingStation';
import { useNextStation } from './useNextStation';

jest.mock('jotai', () => ({
  __esModule: true,
  useAtomValue: jest.fn(),
  atom: jest.fn(),
}));

jest.mock('~/store/atoms/location', () => ({
  __esModule: true,
  locationAtom: 'LOCATION_ATOM',
}));

jest.mock('../store/atoms/station', () => ({
  __esModule: true,
  default: 'STATION_ATOM',
}));

jest.mock('./useNextStation', () => ({
  __esModule: true,
  useNextStation: jest.fn(),
}));

jest.mock('../utils/isPass', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const TestComponent: React.FC = () => {
  const station = useApproachingStation();
  return <Text testID="station">{JSON.stringify(station)}</Text>;
};

describe('useApproachingStation', () => {
  const mockUseAtomValue = useAtomValue as jest.MockedFunction<
    typeof useAtomValue
  >;
  const mockUseNextStation = useNextStation as jest.MockedFunction<
    typeof useNextStation
  >;
  const mockGetIsPass = getIsPass as jest.MockedFunction<typeof getIsPass>;

  const setLocation = (
    coords: { latitude: number; longitude: number } | null,
    currentStation?: ReturnType<typeof createStation>
  ) => {
    mockUseAtomValue.mockImplementation((atom: unknown) => {
      if (atom === 'LOCATION_ATOM') {
        return coords ? { coords } : null;
      }
      return { stations, station: currentStation };
    });
  };

  let stations: ReturnType<typeof createStation>[];

  beforeEach(() => {
    mockGetIsPass.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('現在地が無い場合はundefinedを返す', () => {
    stations = [
      createStation(1, { latitude: 35.0, longitude: 135.0 }),
      createStation(2, { latitude: 35.2, longitude: 135.0 }),
    ];
    setLocation(null);
    mockUseNextStation.mockReturnValue(undefined);

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('station').props.children).toBeUndefined();
  });

  it('最寄り停車駅より次の停車駅へ近づいている場合は次の停車駅を返す', () => {
    const stationA = createStation(1, { latitude: 35.0, longitude: 135.0 });
    const stationB = createStation(2, { latitude: 35.2, longitude: 135.0 });
    stations = [stationA, stationB];

    // A寄りに位置するため最寄り停車駅はA、その次はB
    setLocation({ latitude: 35.05, longitude: 135.0 });
    mockUseNextStation.mockReturnValue(stationB);

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('station').props.children as string);
    expect(result.id).toBe(2);
  });

  it('最寄り停車駅へ向かっている場合は最寄り停車駅を返す', () => {
    const stationA = createStation(1, { latitude: 35.0, longitude: 135.0 });
    const stationB = createStation(2, { latitude: 35.2, longitude: 135.0 });
    const stationC = createStation(3, { latitude: 35.4, longitude: 135.0 });
    stations = [stationA, stationB, stationC];

    // B寄りに位置するため最寄り停車駅はB。Bへ向かっているのでBを返す
    setLocation({ latitude: 35.15, longitude: 135.0 });
    mockUseNextStation.mockReturnValue(stationC);

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('station').props.children as string);
    expect(result.id).toBe(2);
  });

  it('通過駅は接近判定の対象から除外する', () => {
    const stationA = createStation(1, {
      latitude: 35.0,
      longitude: 135.0,
      stopCondition: StopCondition.All,
    });
    // 通過駅(現在地に最も近いが対象外)
    const stationB = createStation(2, {
      latitude: 35.14,
      longitude: 135.0,
      stopCondition: StopCondition.Not,
    });
    const stationC = createStation(3, {
      latitude: 35.4,
      longitude: 135.0,
      stopCondition: StopCondition.All,
    });
    stations = [stationA, stationB, stationC];

    mockGetIsPass.mockImplementation(
      (s) => s?.stopCondition === StopCondition.Not
    );

    // 通過駅Bの近くにいるが、停車駅としての最寄りはC寄りでなくA。
    // AよりCへ近づいていればCを返す
    setLocation({ latitude: 35.14, longitude: 135.0 });
    mockUseNextStation.mockReturnValue(stationC);

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('station').props.children as string);
    // 通過駅Bは除外され、A→Cの区間でCへ接近しているためC
    expect(result.id).toBe(3);
  });

  it('直近で発車した(到着済みの)駅は接近判定の対象から除外する', () => {
    const stationA = createStation(1, { latitude: 35.0, longitude: 135.0 });
    const stationB = createStation(2, { latitude: 35.2, longitude: 135.0 });
    const stationC = createStation(3, { latitude: 35.4, longitude: 135.0 });
    stations = [stationA, stationB, stationC];

    // 直近の到着駅(=発車駅)はA。Aの直近に留まっていても、Aを除外して
    // 次の停車駅Bを接近駅として返す(「まもなくA」の誤表示を防ぐ)。
    setLocation({ latitude: 35.0, longitude: 135.0 }, stationA);
    // Aを除外した最寄り停車駅はB。Bを起点とした次駅はC。
    mockUseNextStation.mockReturnValue(stationC);

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('station').props.children as string);
    expect(result.id).toBe(2);
  });

  it('次の停車駅が存在しない(終点)場合は最寄り停車駅を返す', () => {
    const stationA = createStation(1, { latitude: 35.0, longitude: 135.0 });
    const stationB = createStation(2, { latitude: 35.2, longitude: 135.0 });
    stations = [stationA, stationB];

    setLocation({ latitude: 35.19, longitude: 135.0 });
    mockUseNextStation.mockReturnValue(undefined);

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('station').props.children as string);
    expect(result.id).toBe(2);
  });
});
