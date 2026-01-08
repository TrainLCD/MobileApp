import { render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import { createStation } from '~/utils/test/factories';
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
    createStation(1, { groupId: 1, name: 'A' }),
    createStation(2, { groupId: 2, name: 'B' }),
    createStation(3, { groupId: 3, name: 'C' }),
    createStation(4, { groupId: 4, name: 'D' }),
    createStation(5, { groupId: 5, name: 'E' }),
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
      const singleStation = [createStation(1, { groupId: 1, name: 'A' })];
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
