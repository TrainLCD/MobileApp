import { render } from '@testing-library/react-native';
import type React from 'react';
import { Text } from 'react-native';
import type { Station as StationType } from '~/@types/graphql';
import { OperationStatus, StopCondition } from '~/@types/graphql';

// useCurrentStation をモック
jest.mock('./useCurrentStation', () => ({ useCurrentStation: jest.fn() }));

import { useCurrentStation } from './useCurrentStation';
import { useGetStationsWithTermination } from './useGetStationsWithTermination';

type Props = {
  destination: StationType | null;
  stations: StationType[];
};

const mkStation = (groupId: number, id: number = groupId): StationType => ({
  __typename: 'Station',
  id,
  groupId,
  name: '',
  nameKatakana: '',
  nameRoman: undefined,
  nameChinese: undefined,
  nameKorean: undefined,
  threeLetterCode: undefined,
  lines: [],
  prefectureId: 0,
  postalCode: '',
  address: '',
  latitude: 0,
  longitude: 0,
  openedAt: '',
  closedAt: '',
  status: OperationStatus.InOperation,
  stationNumbers: [],
  stopCondition: StopCondition.All,
  distance: undefined,
  hasTrainTypes: undefined,
  line: undefined,
  trainType: undefined,
  transportType: undefined,
});

const TestComponent: React.FC<Props> = ({ destination, stations }) => {
  const getStations = useGetStationsWithTermination();
  const result = getStations(destination, stations);
  return (
    <>
      <Text testID="result">
        {JSON.stringify(result.map((s) => s.groupId))}
      </Text>
    </>
  );
};

describe('useGetStationsWithTermination', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('destination または currentStation が無い場合、入力配列をそのまま返す', () => {
    // currentStation を null
    (useCurrentStation as jest.Mock).mockReturnValue(null);

    const stations = [mkStation(1), mkStation(2), mkStation(3)];

    // destination: null → そのまま
    const { rerender, getByTestId } = render(
      <TestComponent destination={null} stations={stations} />
    );
    expect(getByTestId('result').props.children).toBe(
      JSON.stringify([1, 2, 3])
    );

    // currentStation が null のケースでもそのまま
    rerender(<TestComponent destination={mkStation(3)} stations={stations} />);
    expect(getByTestId('result').props.children).toBe(
      JSON.stringify([1, 2, 3])
    );
  });

  it('どちらかが配列内に見つからない場合、入力配列をそのまま返す', () => {
    (useCurrentStation as jest.Mock).mockReturnValue(mkStation(99));

    const stations = [mkStation(1), mkStation(2), mkStation(3)];

    const { getByTestId } = render(
      <TestComponent destination={mkStation(1000)} stations={stations} />
    );
    expect(getByTestId('result').props.children).toBe(
      JSON.stringify([1, 2, 3])
    );
  });

  it('現在駅が目的地より前なら、先頭〜目的地までを返す', () => {
    // 現在駅: B (index 1) / 目的地: C (index 2) → 0..2 を返す
    (useCurrentStation as jest.Mock).mockReturnValue(mkStation(2));

    const stations = [mkStation(1), mkStation(2), mkStation(3), mkStation(4)];

    const getJSON = (arr: StationType[]) =>
      JSON.stringify(arr.map((s) => s.groupId));

    const Asserts: React.FC = () => {
      const getStations = useGetStationsWithTermination();
      const result = getStations(mkStation(3), stations);
      // 2 < 3 のため [1,2,3]
      expect(getJSON(result)).toBe(getJSON(stations.slice(0, 3)));
      return null;
    };

    render(<Asserts />);
  });

  it('現在駅が目的地以降なら、目的地〜末尾までを返す', () => {
    // 現在駅: D (index 3) / 目的地: B (index 1) → 1..end を返す
    (useCurrentStation as jest.Mock).mockReturnValue(mkStation(4));

    const stations = [mkStation(1), mkStation(2), mkStation(3), mkStation(4)];

    const getJSON = (arr: StationType[]) =>
      JSON.stringify(arr.map((s) => s.groupId));

    const Asserts: React.FC = () => {
      const getStations = useGetStationsWithTermination();
      const result = getStations(mkStation(2), stations);
      // 4 >= 2 のため [2,3,4]
      expect(getJSON(result)).toBe(getJSON(stations.slice(1)));
      return null;
    };

    render(<Asserts />);
  });
});
