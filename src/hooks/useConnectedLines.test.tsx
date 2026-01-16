import { render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import type { Line, Station } from '~/@types/graphql';
import { createLine, createStation } from '~/utils/test/factories';
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
    currentLineValue = createLine(1);
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
    const lineA = createLine(1, { nameShort: '本線' });
    const lineB = createLine(2, { nameShort: 'A線' });
    const lineBBranch = createLine(3, {
      nameShort: 'A線(支線)',
    });
    const lineC = createLine(4, { nameShort: 'C線' });

    stationAtomValue = {
      selectedBound: createStation(7, {
        line: { id: lineC.id, nameShort: lineC.nameShort },
      }),
      selectedDirection: 'INBOUND',
      stations: [
        createStation(1, {
          line: { id: lineA.id, nameShort: lineA.nameShort },
        }),
        createStation(2, {
          line: { id: lineA.id, nameShort: lineA.nameShort },
        }),
        createStation(3, {
          line: { id: lineB.id, nameShort: lineB.nameShort },
        }),
        createStation(4, {
          line: { id: lineB.id, nameShort: lineB.nameShort },
        }),
        createStation(5, {
          line: { id: lineBBranch.id, nameShort: lineBBranch.nameShort },
        }),
        createStation(6, {
          line: { id: lineC.id, nameShort: lineC.nameShort },
        }),
        createStation(7, {
          line: { id: lineC.id, nameShort: lineC.nameShort },
        }),
      ],
    };
    currentLineValue = lineA;

    const { getByTestId } = render(<TestComponent />);
    const lines = JSON.parse(getByTestId('lines').props.children as string);

    expect(lines.map((l: Line) => l.id)).toEqual([2, 4]);
  });

  it('excludePassed=false で全ての直通候補を返しつつ現在路線は除外する', () => {
    const lineA = createLine(10, { nameShort: 'M線' });
    const lineB = createLine(11, { nameShort: 'N線' });
    const lineBAlt = createLine(12, { nameShort: 'N線(快速)' });
    const lineC = createLine(13, { nameShort: 'C線' });

    stationAtomValue = {
      selectedBound: createStation(7, {
        line: { id: lineC.id, nameShort: lineC.nameShort },
      }),
      selectedDirection: 'OUTBOUND',
      stations: [
        createStation(1, {
          line: { id: lineC.id, nameShort: lineC.nameShort },
        }),
        createStation(2, {
          line: { id: lineC.id, nameShort: lineC.nameShort },
        }),
        createStation(3, {
          line: { id: lineBAlt.id, nameShort: lineBAlt.nameShort },
        }),
        createStation(4, {
          line: { id: lineB.id, nameShort: lineB.nameShort },
        }),
        createStation(5, {
          line: { id: lineA.id, nameShort: lineA.nameShort },
        }),
        createStation(6, {
          line: { id: lineA.id, nameShort: lineA.nameShort },
        }),
      ],
    };
    currentLineValue = lineA;

    const { getByTestId } = render(<TestComponent excludePassed={false} />);
    const lines = JSON.parse(getByTestId('lines').props.children as string);

    expect(lines.map((l: Line) => l.id)).toEqual([13, 12, 11]);
    expect(lines.find((l: Line) => l.id === 10)).toBeUndefined();
  });
});
