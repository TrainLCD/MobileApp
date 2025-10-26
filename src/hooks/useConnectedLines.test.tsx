import { render } from '@testing-library/react-native';
import type { Line, Station } from '~/@types/graphql';
import { Text } from 'react-native';
import React from 'react';
import { useAtomValue } from 'jotai';
import { useConnectedLines } from './useConnectedLines';
import stationState from '../store/atoms/station';
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

const createLine = (overrides: Partial<Line> = {}): Line =>
  ({
    id: 'line-a',
    nameShort: 'Main',
    name: 'Main',
    company: {
      id: 'comp-1',
      nameShort: 'Metro',
      nameEnglishShort: 'Metro',
    },
    ...overrides,
  }) as Line;

const createStation = (id: number, line: Line): Station =>
  ({
    __typename: 'Station',
    id,
    groupId: id,
    name: `Station${id}`,
    nameRoman: `Station${id}`,
    line,
  }) as Station;

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
    jest.clearAllMocks();
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

  it('selectedBound が無い場合は空配列を返す', () => {
    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('lines').props.children).toBe('[]');
  });

  it('INBOUND 方向で現在路線より先の直通路線を返す', () => {
    const lineA = createLine({ id: 'line-a', nameShort: '本線' });
    const lineB = createLine({ id: 'line-b', nameShort: 'A線' });
    const lineBBranch = createLine({
      id: 'line-b-branch',
      nameShort: 'A線(支線)',
    });
    const lineC = createLine({ id: 'line-c', nameShort: 'C線' });

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

    expect(lines.map((l: Line) => l.id)).toEqual(['line-b', 'line-c']);
  });

  it('excludePassed=false で全ての直通候補を返しつつ現在路線は除外する', () => {
    const lineA = createLine({ id: 'line-a', nameShort: 'M線' });
    const lineB = createLine({ id: 'line-b', nameShort: 'N線' });
    const lineBAlt = createLine({ id: 'line-b-alt', nameShort: 'N線(快速)' });
    const lineC = createLine({ id: 'line-c', nameShort: 'C線' });

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

    expect(lines.map((l: Line) => l.id)).toEqual([
      'line-c',
      'line-b-alt',
      'line-b',
    ]);
    expect(lines.find((l: Line) => l.id === 'line-a')).toBeUndefined();
  });
});
