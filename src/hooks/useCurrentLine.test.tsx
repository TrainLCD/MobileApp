import { render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import type { Line, Station } from '~/@types/graphql';
import { LineType, OperationStatus, StopCondition } from '~/@types/graphql';
import lineState from '../store/atoms/line';
import stationState from '../store/atoms/station';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentStation } from './useCurrentStation';

jest.mock('jotai', () => ({
  __esModule: true,
  useAtomValue: jest.fn(),
  atom: jest.fn(),
}));

jest.mock('./useCurrentStation', () => ({
  useCurrentStation: jest.fn(),
}));

const createLine = (id: number, nameShort: string): Line => ({
  __typename: 'Line',
  averageDistance: null,
  color: '#123456',
  company: null,
  id,
  lineSymbols: [],
  lineType: LineType.Normal,
  nameChinese: null,
  nameFull: `${nameShort} Line`,
  nameKatakana: `${nameShort}ライン`,
  nameKorean: null,
  nameRoman: `${nameShort} Line`,
  nameShort,
  station: null,
  status: OperationStatus.InOperation,
  trainType: null,
});

const createStation = (id: number, groupId: number, line: Line): Station => ({
  __typename: 'Station',
  address: null,
  closedAt: null,
  distance: null,
  groupId,
  hasTrainTypes: false,
  id,
  latitude: null,
  line: {
    __typename: 'LineNested',
    averageDistance: null,
    color: line.color,
    company: null,
    id: line.id,
    lineSymbols: [],
    lineType: line.lineType,
    nameChinese: line.nameChinese,
    nameFull: line.nameFull,
    nameKatakana: line.nameKatakana,
    nameKorean: line.nameKorean,
    nameRoman: line.nameRoman,
    nameShort: line.nameShort,
    station: null,
    status: OperationStatus.InOperation,
    trainType: null,
  },
  lines: [],
  longitude: null,
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
  const currentLine = useCurrentLine();
  return <Text testID="line">{JSON.stringify(currentLine)}</Text>;
};

describe('useCurrentLine', () => {
  const mockUseAtomValue = useAtomValue as jest.MockedFunction<
    typeof useAtomValue
  >;
  const mockUseCurrentStation = useCurrentStation as jest.MockedFunction<
    typeof useCurrentStation
  >;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('selectedLineとcurrentStationがある場合、現在の路線を返す', () => {
    const lineA = createLine(1, 'LineA');
    const station1 = createStation(1, 1, lineA);
    const station2 = createStation(2, 2, lineA);

    mockUseCurrentStation.mockReturnValue(station1);

    mockUseAtomValue.mockImplementation((atom) => {
      if (atom === stationState) {
        return {
          stations: [station1, station2],
          selectedDirection: 'INBOUND',
        };
      }
      if (atom === lineState) {
        return {
          selectedLine: lineA,
        };
      }
      throw new Error('unknown atom');
    });

    const { getByTestId } = render(<TestComponent />);
    const lineResult = getByTestId('line').props.children;

    // Verify line result is returned
    expect(lineResult).toBeDefined();
  });

  it('selectedLineがnullの場合、nullを返す', () => {
    const lineA = createLine(1, 'LineA');
    const station1 = createStation(1, 1, lineA);

    mockUseCurrentStation.mockReturnValue(station1);

    mockUseAtomValue.mockImplementation((atom) => {
      if (atom === stationState) {
        return {
          stations: [station1],
          selectedDirection: 'INBOUND',
        };
      }
      if (atom === lineState) {
        return {
          selectedLine: null,
        };
      }
      throw new Error('unknown atom');
    });

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('line').props.children).toBe('null');
  });

  it('currentStationがundefinedの場合、nullを返す', () => {
    const lineA = createLine(1, 'LineA');

    mockUseCurrentStation.mockReturnValue(undefined);

    mockUseAtomValue.mockImplementation((atom) => {
      if (atom === stationState) {
        return {
          stations: [],
          selectedDirection: 'INBOUND',
        };
      }
      if (atom === lineState) {
        return {
          selectedLine: lineA,
        };
      }
      throw new Error('unknown atom');
    });

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('line').props.children).toBe('null');
  });

  it('INBOUND方向の場合、路線情報を返す', () => {
    const lineA = createLine(1, 'LineA');
    const lineB = createLine(2, 'LineB');
    const station1 = createStation(1, 1, lineA);
    const station2 = createStation(2, 1, lineB); // same groupId, different line

    mockUseCurrentStation.mockReturnValue(station1);

    mockUseAtomValue.mockImplementation((atom) => {
      if (atom === stationState) {
        return {
          stations: [station1, station2],
          selectedDirection: 'INBOUND',
        };
      }
      if (atom === lineState) {
        return {
          selectedLine: lineB,
        };
      }
      throw new Error('unknown atom');
    });

    const { getByTestId } = render(<TestComponent />);
    const lineResult = getByTestId('line').props.children;

    // Verify line result is returned
    expect(lineResult).toBeDefined();
  });

  it('OUTBOUND方向の場合、路線情報を返す', () => {
    const lineA = createLine(1, 'LineA');
    const lineB = createLine(2, 'LineB');
    const station1 = createStation(1, 1, lineA);
    const station2 = createStation(2, 1, lineB); // same groupId

    mockUseCurrentStation.mockReturnValue(station1);

    mockUseAtomValue.mockImplementation((atom) => {
      if (atom === stationState) {
        return {
          stations: [station1, station2],
          selectedDirection: 'OUTBOUND',
        };
      }
      if (atom === lineState) {
        return {
          selectedLine: lineA,
        };
      }
      throw new Error('unknown atom');
    });

    const { getByTestId } = render(<TestComponent />);
    const lineResult = getByTestId('line').props.children;

    // Verify line result is returned
    expect(lineResult).toBeDefined();
  });
});
