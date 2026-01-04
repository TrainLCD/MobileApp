import { render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import type { Line, Station } from '~/@types/graphql';
import type { LineNested } from '~/@types/graphql.d';
import {
  LineType,
  OperationStatus,
  StopCondition,
  TransportType,
} from '~/@types/graphql';
import stationState from '../store/atoms/station';
import { useTransferLinesFromStation } from './useTransferLinesFromStation';

jest.mock('jotai', () => ({
  __esModule: true,
  useAtomValue: jest.fn(),
  atom: jest.fn(),
}));

type TestComponentProps = {
  station: Station | undefined;
  options?: {
    omitRepeatingLine?: boolean;
    omitJR?: boolean;
    hideBuses?: boolean;
  };
};

const TestComponent: React.FC<TestComponentProps> = ({ station, options }) => {
  const lines = useTransferLinesFromStation(station, options);
  return <Text testID="transferLines">{JSON.stringify(lines)}</Text>;
};

const createLineNested = (
  overrides: Partial<LineNested> = {}
): LineNested => ({
  __typename: 'LineNested',
  averageDistance: null,
  color: '#123456',
  company: null,
  id: 1,
  lineSymbols: [],
  lineType: LineType.Normal,
  nameChinese: null,
  nameFull: 'Line',
  nameKatakana: 'ライン',
  nameKorean: '라인',
  nameRoman: 'Line',
  nameShort: 'Line',
  station: null,
  status: OperationStatus.InOperation,
  trainType: null,
  transportType: TransportType.Rail,
  ...overrides,
});

const createStation = (
  id: number,
  overrides: Partial<Station> = {}
): Station => ({
  __typename: 'Station',
  address: null,
  closedAt: null,
  distance: null,
  groupId: id,
  hasTrainTypes: false,
  id,
  latitude: null,
  line: null,
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
  transportType: null,
  ...overrides,
});

describe('useTransferLinesFromStation', () => {
  const mockUseAtomValue = useAtomValue as jest.MockedFunction<
    typeof useAtomValue
  >;

  let stationAtomValue: { stations: Station[] };

  beforeEach(() => {
    stationAtomValue = { stations: [] };
    mockUseAtomValue.mockImplementation((atom) => {
      if (atom === stationState) {
        return stationAtomValue;
      }
      throw new Error('unknown atom');
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('station が undefined の場合は空配列を返す', () => {
    const { getByTestId } = render(
      <TestComponent station={undefined} options={{ hideBuses: true }} />
    );
    expect(getByTestId('transferLines').props.children).toBe('[]');
  });

  it('デフォルトでバス路線を除外する', () => {
    const currentLine = createLineNested({ id: 1, nameShort: '中央線' });
    const railLine = createLineNested({
      id: 2,
      nameShort: '山手線',
      transportType: TransportType.Rail,
    });
    const busLine = createLineNested({
      id: 3,
      nameShort: 'バス',
      transportType: TransportType.Bus,
    });
    const station = createStation(100, {
      line: currentLine,
      lines: [currentLine, railLine, busLine],
    });
    stationAtomValue.stations = [station];

    const { getByTestId } = render(<TestComponent station={station} />);
    const lines = JSON.parse(
      getByTestId('transferLines').props.children as string
    );

    expect(lines.map((l: Line) => l.id)).toEqual([2]);
    expect(lines.find((l: Line) => l.id === 3)).toBeUndefined();
  });

  it('hideBuses: false を指定するとバス路線も含める', () => {
    const currentLine = createLineNested({ id: 1, nameShort: '中央線' });
    const railLine = createLineNested({
      id: 2,
      nameShort: '山手線',
      transportType: TransportType.Rail,
    });
    const busLine = createLineNested({
      id: 3,
      nameShort: 'バス',
      transportType: TransportType.Bus,
    });
    const station = createStation(100, {
      line: currentLine,
      lines: [currentLine, railLine, busLine],
    });
    stationAtomValue.stations = [station];

    const { getByTestId } = render(
      <TestComponent station={station} options={{ hideBuses: false }} />
    );
    const lines = JSON.parse(
      getByTestId('transferLines').props.children as string
    );

    expect(lines.map((l: Line) => l.id)).toEqual([2, 3]);
  });

  it('hideBuses: true を明示的に指定してもバス路線を除外する', () => {
    const currentLine = createLineNested({ id: 1, nameShort: '中央線' });
    const railLine = createLineNested({
      id: 2,
      nameShort: '山手線',
      transportType: TransportType.Rail,
    });
    const busLine = createLineNested({
      id: 3,
      nameShort: 'バス',
      transportType: TransportType.Bus,
    });
    const station = createStation(100, {
      line: currentLine,
      lines: [currentLine, railLine, busLine],
    });
    stationAtomValue.stations = [station];

    const { getByTestId } = render(
      <TestComponent station={station} options={{ hideBuses: true }} />
    );
    const lines = JSON.parse(
      getByTestId('transferLines').props.children as string
    );

    expect(lines.map((l: Line) => l.id)).toEqual([2]);
    expect(lines.find((l: Line) => l.id === 3)).toBeUndefined();
  });

  it('現在路線は除外する', () => {
    const currentLine = createLineNested({ id: 1, nameShort: '中央線' });
    const otherLine = createLineNested({ id: 2, nameShort: '山手線' });
    const station = createStation(100, {
      line: currentLine,
      lines: [currentLine, otherLine],
    });
    stationAtomValue.stations = [station];

    const { getByTestId } = render(
      <TestComponent station={station} options={{ hideBuses: true }} />
    );
    const lines = JSON.parse(
      getByTestId('transferLines').props.children as string
    );

    expect(lines.map((l: Line) => l.id)).toEqual([2]);
    expect(lines.find((l: Line) => l.id === 1)).toBeUndefined();
  });

  it('カッコを除いて同名の路線は除外する', () => {
    const currentLine = createLineNested({
      id: 1,
      nameShort: 'JR神戸線(大阪～神戸)',
    });
    const sameLine = createLineNested({
      id: 2,
      nameShort: 'JR神戸線(神戸～姫路)',
    });
    const otherLine = createLineNested({ id: 3, nameShort: '山手線' });
    const station = createStation(100, {
      line: currentLine,
      lines: [currentLine, sameLine, otherLine],
    });
    stationAtomValue.stations = [station];

    const { getByTestId } = render(
      <TestComponent station={station} options={{ hideBuses: true }} />
    );
    const lines = JSON.parse(
      getByTestId('transferLines').props.children as string
    );

    expect(lines.map((l: Line) => l.id)).toEqual([3]);
    expect(lines.find((l: Line) => l.id === 2)).toBeUndefined();
  });
});
