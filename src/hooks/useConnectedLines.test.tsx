import { render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import type { Line, Station } from '~/@types/graphql';
import { LineType, OperationStatus, StopCondition } from '~/@types/graphql';
import stationState from '../store/atoms/station';
import { useConnectedLines } from './useConnectedLines';
import { useCurrentLine } from './useCurrentLine';

jest.mock('jotai', () => ({
  __esModule: true,
  useAtomValue: jest.fn(),
  atom: jest.fn(),
}));
jest.mock('./useCurrentLine', () => ({
  useCurrentLine: jest.fn(),
}));

const TestComponent: React.FC<{ excludePassed?: boolean }> = ({
  excludePassed,
}) => {
  const lines = useConnectedLines(excludePassed);
  return <Text testID="lines">{JSON.stringify(lines)}</Text>;
};

const createLine = (
  overrides: Partial<Line> = {},
  typename: Line['__typename'] = 'Line'
): Line => ({
  __typename: typename,
  averageDistance: null,
  color: '#123456',
  company: null,
  id: 1,
  lineSymbols: [],
  lineType: LineType.Normal,
  nameChinese: null,
  nameFull: 'Main Line',
  nameKatakana: 'メインライン',
  nameKorean: 'メインライン',
  nameRoman: 'Main Line',
  nameShort: 'Main',
  station: null,
  status: OperationStatus.InOperation,
  trainType: null,
  transportType: null,
  ...overrides,
});

const createStation = (id: number, line: Line): Station => ({
  __typename: 'Station',
  address: null,
  closedAt: null,
  distance: null,
  groupId: id,
  hasTrainTypes: false,
  id,
  latitude: null,
  line: { ...line, __typename: 'LineNested' },
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
});

describe('useConnectedLines', () => {
  const mockUseAtomValue = useAtomValue as jest.MockedFunction<
    typeof useAtomValue
  >;
  const mockUseCurrentLine = useCurrentLine as jest.MockedFunction<
    typeof useCurrentLine
  >;

  let stationAtomValue: {
    selectedBound: Station | null;
    selectedDirection: 'INBOUND' | 'OUTBOUND' | null;
    stations: Station[];
  };
  let currentLineValue: Line | null;

  beforeEach(() => {
    stationAtomValue = {
      selectedBound: null,
      selectedDirection: 'INBOUND',
      stations: [],
    };
    currentLineValue = createLine();
    mockUseAtomValue.mockImplementation((atom) => {
      if (atom === stationState) {
        return stationAtomValue;
      }
      throw new Error('unknown atom');
    });
    mockUseCurrentLine.mockImplementation(() => currentLineValue);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('selectedBound が無い場合は空配列を返す', () => {
    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('lines').props.children).toBe('[]');
  });

  it('INBOUND 方向で現在路線より先の直通路線を返す', () => {
    const lineA = createLine({ id: 1, nameShort: '本線' });
    const lineB = createLine({ id: 2, nameShort: 'A線' });
    const lineBBranch = createLine({
      id: 3,
      nameShort: 'A線(支線)',
    });
    const lineC = createLine({ id: 4, nameShort: 'C線' });

    stationAtomValue = {
      selectedBound: createStation(7, lineC),
      selectedDirection: 'INBOUND',
      stations: [
        createStation(1, lineA),
        createStation(2, lineA),
        createStation(3, lineB),
        createStation(4, lineB),
        createStation(5, lineBBranch),
        createStation(6, lineC),
        createStation(7, lineC),
      ],
    };
    currentLineValue = lineA;

    const { getByTestId } = render(<TestComponent />);
    const lines = JSON.parse(getByTestId('lines').props.children as string);

    expect(lines.map((l: Line) => l.id)).toEqual([2, 4]);
  });

  it('excludePassed=false で全ての直通候補を返しつつ現在路線は除外する', () => {
    const lineA = createLine({ id: 10, nameShort: 'M線' });
    const lineB = createLine({ id: 11, nameShort: 'N線' });
    const lineBAlt = createLine({ id: 12, nameShort: 'N線(快速)' });
    const lineC = createLine({ id: 13, nameShort: 'C線' });

    stationAtomValue = {
      selectedBound: createStation(7, lineC),
      selectedDirection: 'OUTBOUND',
      stations: [
        createStation(1, lineC),
        createStation(2, lineC),
        createStation(3, lineBAlt),
        createStation(4, lineB),
        createStation(5, lineA),
        createStation(6, lineA),
      ],
    };
    currentLineValue = lineA;

    const { getByTestId } = render(<TestComponent excludePassed={false} />);
    const lines = JSON.parse(getByTestId('lines').props.children as string);

    expect(lines.map((l: Line) => l.id)).toEqual([13, 12, 11]);
    expect(lines.find((l: Line) => l.id === 10)).toBeUndefined();
  });
});
