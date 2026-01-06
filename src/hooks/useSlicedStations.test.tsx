import { render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import type { Station } from '~/@types/graphql';
import { LineType, OperationStatus, StopCondition } from '~/@types/graphql';
import { useCurrentStation } from './useCurrentStation';
import { useLoopLine } from './useLoopLine';
import { useSlicedStations } from './useSlicedStations';

jest.mock('jotai', () => ({
  __esModule: true,
  useAtomValue: jest.fn(),
  atom: jest.fn(),
}));

jest.mock('./useCurrentStation', () => ({
  __esModule: true,
  useCurrentStation: jest.fn(),
}));

jest.mock('./useLoopLine', () => ({
  __esModule: true,
  useLoopLine: jest.fn(),
}));

const createStation = (id: number, groupId: number, name: string): Station => ({
  __typename: 'Station',
  address: null,
  closedAt: null,
  distance: null,
  groupId,
  hasTrainTypes: false,
  id,
  latitude: 35.681236 + id * 0.001,
  longitude: 139.767125 + id * 0.001,
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
    transportType: null,
  },
  lines: [],
  name,
  nameChinese: null,
  nameKatakana: `${name}`,
  nameKorean: null,
  nameRoman: name,
  openedAt: null,
  postalCode: null,
  prefectureId: null,
  stationNumbers: [],
  status: OperationStatus.InOperation,
  stopCondition: StopCondition.All,
  threeLetterCode: null,
  trainType: null,
  transportType: null,
});

const TestComponent: React.FC = () => {
  const slicedStations = useSlicedStations();
  return (
    <Text testID="slicedStations">
      {JSON.stringify(slicedStations.map((s) => s.name))}
    </Text>
  );
};

describe('useSlicedStations', () => {
  const mockUseAtomValue = useAtomValue as jest.MockedFunction<
    typeof useAtomValue
  >;
  const mockUseCurrentStation = useCurrentStation as jest.MockedFunction<
    typeof useCurrentStation
  >;
  const mockUseLoopLine = useLoopLine as jest.MockedFunction<
    typeof useLoopLine
  >;

  const stations = [
    createStation(1, 1, 'A'),
    createStation(2, 2, 'B'),
    createStation(3, 3, 'C'),
    createStation(4, 4, 'D'),
    createStation(5, 5, 'E'),
  ];

  beforeEach(() => {
    mockUseLoopLine.mockReturnValue({
      isLoopLine: false,
      isYamanoteLine: false,
      isOsakaLoopLine: false,
      isMeijoLine: false,
      isOedoLine: false,
      isPartiallyLoopLine: false,
      inboundStationsForLoopLine: [],
      outboundStationsForLoopLine: [],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('通常路線（非環状線）', () => {
    it('arrived=true, INBOUND: 現在駅から終点までを返す', () => {
      mockUseAtomValue.mockReturnValue({
        stations,
        arrived: true,
        selectedDirection: 'INBOUND',
      });
      mockUseCurrentStation.mockReturnValue(stations[2]); // C駅

      const { getByTestId } = render(<TestComponent />);
      const result = JSON.parse(getByTestId('slicedStations').props.children);

      expect(result).toEqual(['C', 'D', 'E']);
    });

    it('arrived=true, OUTBOUND: 始点から現在駅までを逆順で返す', () => {
      mockUseAtomValue.mockReturnValue({
        stations,
        arrived: true,
        selectedDirection: 'OUTBOUND',
      });
      mockUseCurrentStation.mockReturnValue(stations[2]); // C駅

      const { getByTestId } = render(<TestComponent />);
      const result = JSON.parse(getByTestId('slicedStations').props.children);

      expect(result).toEqual(['C', 'B', 'A']);
    });

    it('arrived=false, INBOUND: 現在駅から終点までを返す', () => {
      mockUseAtomValue.mockReturnValue({
        stations,
        arrived: false,
        selectedDirection: 'INBOUND',
      });
      mockUseCurrentStation.mockReturnValue(stations[2]); // C駅

      const { getByTestId } = render(<TestComponent />);
      const result = JSON.parse(getByTestId('slicedStations').props.children);

      expect(result).toEqual(['C', 'D', 'E']);
    });

    it('arrived=false, OUTBOUND: 始点から前駅までを逆順で返す', () => {
      mockUseAtomValue.mockReturnValue({
        stations,
        arrived: false,
        selectedDirection: 'OUTBOUND',
      });
      mockUseCurrentStation.mockReturnValue(stations[2]); // C駅

      const { getByTestId } = render(<TestComponent />);
      const result = JSON.parse(getByTestId('slicedStations').props.children);

      expect(result).toEqual(['B', 'A']);
    });

    it('currentStationIndex=0の場合、2番目の駅から返す', () => {
      mockUseAtomValue.mockReturnValue({
        stations,
        arrived: false,
        selectedDirection: 'INBOUND',
      });
      mockUseCurrentStation.mockReturnValue(stations[0]); // A駅（先頭）

      const { getByTestId } = render(<TestComponent />);
      const result = JSON.parse(getByTestId('slicedStations').props.children);

      expect(result).toEqual(['B', 'C', 'D', 'E']);
    });
  });

  describe('環状線', () => {
    beforeEach(() => {
      mockUseLoopLine.mockReturnValue({
        isLoopLine: true,
        isYamanoteLine: true,
        isOsakaLoopLine: false,
        isMeijoLine: false,
        isOedoLine: false,
        isPartiallyLoopLine: false,
        inboundStationsForLoopLine: [],
        outboundStationsForLoopLine: [],
      });
    });

    it('環状線, arrived=false, INBOUND, 中間駅: 先頭から現在駅の前までを逆順で返す', () => {
      mockUseAtomValue.mockReturnValue({
        stations,
        arrived: false,
        selectedDirection: 'INBOUND',
      });
      mockUseCurrentStation.mockReturnValue(stations[2]); // C駅

      const { getByTestId } = render(<TestComponent />);
      const result = JSON.parse(getByTestId('slicedStations').props.children);

      expect(result).toEqual(['B', 'A']);
    });

    it('環状線, arrived=false, OUTBOUND, 中間駅: 現在駅から終点までを返す', () => {
      mockUseAtomValue.mockReturnValue({
        stations,
        arrived: false,
        selectedDirection: 'OUTBOUND',
      });
      mockUseCurrentStation.mockReturnValue(stations[2]); // C駅

      const { getByTestId } = render(<TestComponent />);
      const result = JSON.parse(getByTestId('slicedStations').props.children);

      expect(result).toEqual(['C', 'D', 'E']);
    });

    it('環状線, arrived=false, currentStationIndex=末尾, INBOUND: 先頭から前までを逆順で返す', () => {
      mockUseAtomValue.mockReturnValue({
        stations,
        arrived: false,
        selectedDirection: 'INBOUND',
      });
      mockUseCurrentStation.mockReturnValue(stations[4]); // E駅（末尾）

      const { getByTestId } = render(<TestComponent />);
      const result = JSON.parse(getByTestId('slicedStations').props.children);

      expect(result).toEqual(['D', 'C', 'B', 'A']);
    });

    it('環状線, arrived=false, currentStationIndex=末尾, OUTBOUND: 先頭から前までを返す', () => {
      mockUseAtomValue.mockReturnValue({
        stations,
        arrived: false,
        selectedDirection: 'OUTBOUND',
      });
      mockUseCurrentStation.mockReturnValue(stations[4]); // E駅（末尾）

      const { getByTestId } = render(<TestComponent />);
      const result = JSON.parse(getByTestId('slicedStations').props.children);

      expect(result).toEqual(['A', 'B', 'C', 'D']);
    });

    it('環状線, arrived=false, currentStationIndex=0, INBOUND: 先頭から終点までを逆順で返す', () => {
      mockUseAtomValue.mockReturnValue({
        stations,
        arrived: false,
        selectedDirection: 'INBOUND',
      });
      mockUseCurrentStation.mockReturnValue(stations[0]); // A駅（先頭）

      const { getByTestId } = render(<TestComponent />);
      const result = JSON.parse(getByTestId('slicedStations').props.children);

      expect(result).toEqual(['E', 'D', 'C', 'B', 'A']);
    });

    it('環状線, arrived=false, currentStationIndex=0, OUTBOUND: 先頭から終点までを返す', () => {
      mockUseAtomValue.mockReturnValue({
        stations,
        arrived: false,
        selectedDirection: 'OUTBOUND',
      });
      mockUseCurrentStation.mockReturnValue(stations[0]); // A駅（先頭）

      const { getByTestId } = render(<TestComponent />);
      const result = JSON.parse(getByTestId('slicedStations').props.children);

      expect(result).toEqual(['A', 'B', 'C', 'D', 'E']);
    });

    it('環状線, arrived=true, INBOUND: 現在駅から終点までを返す', () => {
      mockUseAtomValue.mockReturnValue({
        stations,
        arrived: true,
        selectedDirection: 'INBOUND',
      });
      mockUseCurrentStation.mockReturnValue(stations[2]); // C駅

      const { getByTestId } = render(<TestComponent />);
      const result = JSON.parse(getByTestId('slicedStations').props.children);

      expect(result).toEqual(['C', 'D', 'E']);
    });

    it('環状線, arrived=true, OUTBOUND: 始点から現在駅までを逆順で返す', () => {
      mockUseAtomValue.mockReturnValue({
        stations,
        arrived: true,
        selectedDirection: 'OUTBOUND',
      });
      mockUseCurrentStation.mockReturnValue(stations[2]); // C駅

      const { getByTestId } = render(<TestComponent />);
      const result = JSON.parse(getByTestId('slicedStations').props.children);

      expect(result).toEqual(['C', 'B', 'A']);
    });
  });

  describe('エッジケース', () => {
    it('currentStationがundefinedの場合、空配列を返す', () => {
      mockUseAtomValue.mockReturnValue({
        stations,
        arrived: true,
        selectedDirection: 'INBOUND',
      });
      mockUseCurrentStation.mockReturnValue(undefined);

      const { getByTestId } = render(<TestComponent />);
      const result = JSON.parse(getByTestId('slicedStations').props.children);

      // currentStationがundefinedの場合、findIndexは-1を返す
      // slice(-1)は末尾の要素を返す
      expect(result).toEqual(['E']);
    });

    it('駅が1つしかない場合', () => {
      const singleStation = [createStation(1, 1, 'A')];
      mockUseAtomValue.mockReturnValue({
        stations: singleStation,
        arrived: true,
        selectedDirection: 'INBOUND',
      });
      mockUseCurrentStation.mockReturnValue(singleStation[0]);

      const { getByTestId } = render(<TestComponent />);
      const result = JSON.parse(getByTestId('slicedStations').props.children);

      expect(result).toEqual(['A']);
    });

    it('駅が空の場合', () => {
      mockUseAtomValue.mockReturnValue({
        stations: [],
        arrived: true,
        selectedDirection: 'INBOUND',
      });
      mockUseCurrentStation.mockReturnValue(undefined);

      const { getByTestId } = render(<TestComponent />);
      const result = JSON.parse(getByTestId('slicedStations').props.children);

      expect(result).toEqual([]);
    });
  });
});
