import { render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import type { Line, Station } from '~/@types/graphql';
import {
  createCompany,
  createLine,
  createStation,
} from '~/utils/test/factories';
import {
  selectedBoundAtom,
  selectedDirectionAtom,
  stationsAtom,
} from '../store/atoms/station';
import { useConnectedLines } from './useConnectedLines';
import { useCurrentLine } from './useCurrentLine';

jest.mock('jotai', () => ({
  __esModule: true,
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(),
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

// createStation の line は LineNested なので、createLine の結果から
// テストで意味のあるフィールドだけを詰め替える
const toNestedLine = (line: Line) => ({
  id: line.id,
  nameShort: line.nameShort,
  company: line.company,
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
    currentLineValue = createLine(1);
    mockUseAtomValue.mockImplementation((atom) => {
      if (atom === selectedBoundAtom) {
        return stationAtomValue.selectedBound;
      }
      if (atom === selectedDirectionAtom) {
        return stationAtomValue.selectedDirection;
      }
      if (atom === stationsAtom) {
        return stationAtomValue.stations;
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

  // 同一会社の路線を続けて直通する系統で、直通先として「次に入る路線」ではなく
  // 「その会社の最後の路線」が案内されていた不具合の回帰テスト (#6747)
  it('同一会社の路線が連続する場合でも直通順の先頭（次に入る路線）を落とさない', () => {
    const tokyu = createCompany(1, { nameShort: '東急' });
    const sotetsu = createCompany(2, { nameShort: '相鉄' });

    const tokyuShinYokohamaLine = createLine(1, {
      nameShort: '東急新横浜線',
      company: tokyu,
    });
    const sotetsuShinYokohamaLine = createLine(2, {
      nameShort: '相鉄新横浜線',
      company: sotetsu,
    });
    const sotetsuMainLine = createLine(3, {
      nameShort: '相鉄本線',
      company: sotetsu,
    });

    stationAtomValue = {
      selectedBound: createStation(5, {
        line: toNestedLine(sotetsuMainLine),
      }),
      selectedDirection: 'INBOUND',
      stations: [
        createStation(1, { line: toNestedLine(tokyuShinYokohamaLine) }),
        createStation(2, { line: toNestedLine(tokyuShinYokohamaLine) }),
        createStation(3, { line: toNestedLine(sotetsuShinYokohamaLine) }),
        createStation(4, { line: toNestedLine(sotetsuMainLine) }),
        createStation(5, { line: toNestedLine(sotetsuMainLine) }),
      ],
    };
    currentLineValue = tokyuShinYokohamaLine;

    const { getByTestId } = render(<TestComponent />);
    const lines = JSON.parse(getByTestId('lines').props.children as string);

    expect(lines.map((l: Line) => l.nameShort)).toEqual([
      '相鉄新横浜線',
      '相鉄本線',
    ]);
  });

  it('OUTBOUND でも同一会社の路線が連続する場合に直通順の先頭を落とさない', () => {
    const tokyu = createCompany(1, { nameShort: '東急' });
    const sotetsu = createCompany(2, { nameShort: '相鉄' });

    const tokyuShinYokohamaLine = createLine(1, {
      nameShort: '東急新横浜線',
      company: tokyu,
    });
    const sotetsuShinYokohamaLine = createLine(2, {
      nameShort: '相鉄新横浜線',
      company: sotetsu,
    });
    const sotetsuMainLine = createLine(3, {
      nameShort: '相鉄本線',
      company: sotetsu,
    });

    stationAtomValue = {
      selectedBound: createStation(1, {
        line: toNestedLine(sotetsuMainLine),
      }),
      selectedDirection: 'OUTBOUND',
      stations: [
        createStation(1, { line: toNestedLine(sotetsuMainLine) }),
        createStation(2, { line: toNestedLine(sotetsuMainLine) }),
        createStation(3, { line: toNestedLine(sotetsuShinYokohamaLine) }),
        createStation(4, { line: toNestedLine(tokyuShinYokohamaLine) }),
        createStation(5, { line: toNestedLine(tokyuShinYokohamaLine) }),
      ],
    };
    currentLineValue = tokyuShinYokohamaLine;

    const { getByTestId } = render(<TestComponent />);
    const lines = JSON.parse(getByTestId('lines').props.children as string);

    expect(lines.map((l: Line) => l.nameShort)).toEqual([
      '相鉄新横浜線',
      '相鉄本線',
    ]);
  });

  // 同一会社が飛び飛びで現れる並び (A社→A社→B社→A社) では、
  // 旧実装だと最後の路線が候補から落ちていた (#6747)
  it('同一会社が飛び飛びで現れる場合でも最後の直通先を落とさない', () => {
    const companyA = createCompany(1, { nameShort: 'A社' });
    const companyB = createCompany(2, { nameShort: 'B社' });
    const companyC = createCompany(3, { nameShort: 'C社' });

    const currentLine = createLine(1, {
      nameShort: 'C社線',
      company: companyC,
    });
    const lineA1 = createLine(2, { nameShort: 'A社本線', company: companyA });
    const lineA2 = createLine(3, { nameShort: 'A社支線', company: companyA });
    const lineB = createLine(4, { nameShort: 'B社線', company: companyB });
    const lineA3 = createLine(5, { nameShort: 'A社新線', company: companyA });

    stationAtomValue = {
      selectedBound: createStation(6, { line: toNestedLine(lineA3) }),
      selectedDirection: 'INBOUND',
      stations: [
        createStation(1, { line: toNestedLine(currentLine) }),
        createStation(2, { line: toNestedLine(lineA1) }),
        createStation(3, { line: toNestedLine(lineA2) }),
        createStation(4, { line: toNestedLine(lineB) }),
        createStation(5, { line: toNestedLine(lineA3) }),
        createStation(6, { line: toNestedLine(lineA3) }),
      ],
    };
    currentLineValue = currentLine;

    const { getByTestId } = render(<TestComponent />);
    const lines = JSON.parse(getByTestId('lines').props.children as string);

    expect(lines.map((l: Line) => l.id)).toEqual([2, 3, 4, 5]);
  });
});
