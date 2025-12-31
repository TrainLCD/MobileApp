import { render } from '@testing-library/react-native';
import findNearest from 'geolib/es/findNearest';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import type { Station } from '~/@types/graphql';
import { LineType, OperationStatus, StopCondition } from '~/@types/graphql';
import { useCurrentStation } from './useCurrentStation';
import { useNearestStation } from './useNearestStation';
import { useNextStation } from './useNextStation';

jest.mock('jotai', () => ({
  __esModule: true,
  useAtomValue: jest.fn(),
  atom: jest.fn((initialValue) => initialValue),
  createStore: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
  })),
}));

jest.mock('./useCurrentStation', () => ({
  useCurrentStation: jest.fn(),
}));

jest.mock('./useNextStation', () => ({
  useNextStation: jest.fn(),
}));

jest.mock('geolib/es/findNearest', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const createStation = (
  id: number,
  groupId: number,
  latitude: number | null,
  longitude: number | null
): Station => ({
  __typename: 'Station',
  address: null,
  closedAt: null,
  distance: null,
  groupId,
  hasTrainTypes: false,
  id,
  latitude,
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
  longitude,
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
  stopCondition: StopCondition.All,
  threeLetterCode: null,
  trainType: null,
});

const TestComponent: React.FC = () => {
  const station = useNearestStation();
  return <Text testID="station">{JSON.stringify(station)}</Text>;
};

describe('useNearestStation', () => {
  const mockUseAtomValue = useAtomValue as jest.MockedFunction<
    typeof useAtomValue
  >;
  const mockUseCurrentStation = useCurrentStation as jest.MockedFunction<
    typeof useCurrentStation
  >;
  const mockUseNextStation = useNextStation as jest.MockedFunction<
    typeof useNextStation
  >;
  const mockFindNearest = findNearest as jest.MockedFunction<
    typeof findNearest
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('現在位置から最寄りの駅を返す', () => {
    const station1 = createStation(1, 1, 35.681236, 139.767125);
    const station2 = createStation(2, 2, 35.690921, 139.700258);
    const station3 = createStation(3, 3, 35.658517, 139.701334);

    // locationAtom, then stationState
    mockUseAtomValue
      .mockReturnValueOnce({
        coords: {
          latitude: 35.690921,
          longitude: 139.700258,
        },
      }) // locationAtom
      .mockReturnValue({
        stations: [station1, station2, station3],
      }); // stationState

    mockUseCurrentStation.mockReturnValue(station1);
    mockUseNextStation.mockReturnValue(station2);

    mockFindNearest.mockReturnValue({
      latitude: 35.690921,
      longitude: 139.700258,
    });

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('station').props.children as string);

    expect(result.id).toBe(2);
  });

  it('緯度経度がnullの場合、undefinedを返す', () => {
    mockUseAtomValue
      .mockReturnValueOnce(null) // locationAtom
      .mockReturnValue({
        stations: [],
      }); // stationState

    mockUseCurrentStation.mockReturnValue(undefined);
    mockUseNextStation.mockReturnValue(undefined);

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('station').props.children).toBeUndefined();
  });

  it('駅リストが空の場合、undefinedを返す', () => {
    mockUseAtomValue
      .mockReturnValueOnce({
        coords: {
          latitude: 35.681236,
          longitude: 139.767125,
        },
      }) // locationAtom
      .mockReturnValue({
        stations: [],
      }); // stationState

    mockUseCurrentStation.mockReturnValue(undefined);
    mockUseNextStation.mockReturnValue(undefined);

    mockFindNearest.mockReturnValue(
      undefined as unknown as ReturnType<typeof findNearest>
    );

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('station').props.children).toBeUndefined();
  });

  it('位置情報が無効な駅を除外する', () => {
    const station1 = createStation(1, 1, null, null); // invalid
    const station2 = createStation(2, 2, 35.690921, 139.700258); // valid
    const station3 = createStation(3, 3, 35.658517, null); // invalid

    mockUseAtomValue
      .mockReturnValueOnce({
        coords: {
          latitude: 35.690921,
          longitude: 139.700258,
        },
      }) // locationAtom
      .mockReturnValue({
        stations: [station1, station2, station3],
      }); // stationState

    mockUseCurrentStation.mockReturnValue(undefined);
    mockUseNextStation.mockReturnValue(undefined);

    mockFindNearest.mockReturnValue({
      latitude: 35.690921,
      longitude: 139.700258,
    });

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('station').props.children as string);

    // Should only consider station2 (valid coordinates)
    expect(result.id).toBe(2);
  });

  it('currentStationまたはnextStationと一致する駅を優先する', () => {
    const station1 = createStation(1, 1, 35.681236, 139.767125);
    const station2 = createStation(2, 2, 35.690921, 139.700258);
    const station3 = createStation(3, 3, 35.690921, 139.700258); // same coords as station2

    mockUseAtomValue
      .mockReturnValueOnce({
        coords: {
          latitude: 35.690921,
          longitude: 139.700258,
        },
      }) // locationAtom
      .mockReturnValue({
        stations: [station1, station2, station3],
      }); // stationState

    mockUseCurrentStation.mockReturnValue(station1);
    mockUseNextStation.mockReturnValue(station3);

    mockFindNearest.mockReturnValue({
      latitude: 35.690921,
      longitude: 139.700258,
    });

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('station').props.children as string);

    // Should prioritize station3 (nextStation)
    expect(result.id).toBe(3);
  });

  it('複数の同じ座標の駅がある場合、最初の駅を返す', () => {
    const station1 = createStation(1, 1, 35.681236, 139.767125);
    const station2 = createStation(2, 2, 35.690921, 139.700258);
    const station3 = createStation(3, 3, 35.690921, 139.700258); // same coords

    mockUseAtomValue
      .mockReturnValueOnce({
        coords: {
          latitude: 35.690921,
          longitude: 139.700258,
        },
      }) // locationAtom
      .mockReturnValue({
        stations: [station1, station2, station3],
      }); // stationState

    mockUseCurrentStation.mockReturnValue(station1);
    mockUseNextStation.mockReturnValue(undefined);

    mockFindNearest.mockReturnValue({
      latitude: 35.690921,
      longitude: 139.700258,
    });

    const { getByTestId } = render(<TestComponent />);
    const result = JSON.parse(getByTestId('station').props.children as string);

    // Should return station2 (first match, not current or next)
    expect(result.id).toBe(2);
  });
});
