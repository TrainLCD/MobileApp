import { render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import { StopCondition } from '~/@types/graphql';
import { createStation } from '~/utils/test/factories';
import {
  selectedDirectionAtom,
  stationAtom,
  stationsAtom,
} from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import { useCurrentStation } from './useCurrentStation';

jest.mock('jotai', () => ({
  __esModule: true,
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(),
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

  // useCurrentStation が useAtomValue で読むフィールドatomを、atomの同一性で出し分ける
  const setAtomValues = ({
    stations,
    station,
    selectedDirection,
  }: {
    stations: ReturnType<typeof createStation>[];
    station: ReturnType<typeof createStation> | null;
    selectedDirection: 'INBOUND' | 'OUTBOUND';
  }) => {
    mockUseAtomValue.mockImplementation((atom: unknown) => {
      if (atom === stationsAtom) return stations;
      if (atom === stationAtom) return station;
      if (atom === selectedDirectionAtom) return selectedDirection;
      return undefined;
    });
  };

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

    setAtomValues({
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

    setAtomValues({
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
    setAtomValues({
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

    setAtomValues({
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

    setAtomValues({
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

    setAtomValues({
      stations: [station1, station2, station3],
      station: station2,
      selectedDirection: 'OUTBOUND',
    });

    const { getByTestId } = render(<TestComponent skipPassStation={true} />);
    const result = JSON.parse(getByTestId('station').props.children as string);

    // OUTBOUND direction, station2 is pass station, should return station3
    expect(result.id).toBe(3);
  });

  describe('接続駅(同じ駅グループが前後の路線の駅として並ぶ駅)', () => {
    // 大江戸線から代々木で山手線へ乗り換える駅リスト。代々木は両方の路線の駅として並ぶ
    const shinjuku = createStation(9930128, { groupId: 1130208 });
    const yoyogiOedo = createStation(9930127, { groupId: 1130207 });
    const yoyogiYamanote = createStation(1130207, { groupId: 1130207 });
    const harajuku = createStation(1130206, { groupId: 1130206 });
    const stations = [shinjuku, yoyogiOedo, yoyogiYamanote, harajuku];

    it('INBOUNDで前の路線の駅に着いたら、次の路線の駅を返す', () => {
      setAtomValues({
        stations,
        station: yoyogiOedo,
        selectedDirection: 'INBOUND',
      });

      const { getByTestId } = render(<TestComponent />);
      const result = JSON.parse(
        getByTestId('station').props.children as string
      );

      expect(result.id).toBe(yoyogiYamanote.id);
    });

    it('INBOUNDで次の路線の駅に着いたら、そのまま返す', () => {
      setAtomValues({
        stations,
        station: yoyogiYamanote,
        selectedDirection: 'INBOUND',
      });

      const { getByTestId } = render(<TestComponent />);
      const result = JSON.parse(
        getByTestId('station').props.children as string
      );

      expect(result.id).toBe(yoyogiYamanote.id);
    });

    it('OUTBOUNDでは配列の前にある駅を次の路線の駅として返す', () => {
      // OUTBOUND は配列の逆順に進むので、原宿→代々木(山手線)→代々木(大江戸線)→新宿の順になる
      setAtomValues({
        stations,
        station: yoyogiYamanote,
        selectedDirection: 'OUTBOUND',
      });

      const { getByTestId } = render(<TestComponent />);
      const result = JSON.parse(
        getByTestId('station').props.children as string
      );

      expect(result.id).toBe(yoyogiOedo.id);
    });

    it('idが駅リストに無くgroupIdで引いたときも、次の路線の駅を返す', () => {
      setAtomValues({
        stations,
        station: createStation(999, { groupId: 1130207 }),
        selectedDirection: 'INBOUND',
      });

      const { getByTestId } = render(<TestComponent />);
      const result = JSON.parse(
        getByTestId('station').props.children as string
      );

      expect(result.id).toBe(yoyogiYamanote.id);
    });

    it('skipPassStation=trueでも次の路線の駅を返す', () => {
      setAtomValues({
        stations,
        station: yoyogiOedo,
        selectedDirection: 'INBOUND',
      });

      const { getByTestId } = render(<TestComponent skipPassStation={true} />);
      const result = JSON.parse(
        getByTestId('station').props.children as string
      );

      expect(result.id).toBe(yoyogiYamanote.id);
    });
  });
});
