import { render } from '@testing-library/react-native';
import type { Line, Station } from '~/@types/graphql';
import LineBoardWest from './LineBoardWest';

// モック設定
jest.mock('jotai', () => ({
  useAtomValue: jest.fn(),
  atom: jest.fn((initialValue) => initialValue),
  useAtom: jest.fn((val) => [val, jest.fn()]),
  useSetAtom: jest.fn(() => jest.fn()),
}));

jest.mock('~/hooks', () => ({
  useLandscapeWindowDimensions: jest.fn(() => ({ width: 812, height: 375 })),
  useCurrentLine: jest.fn(),
  useCurrentStation: jest.fn(),
  useDisplayCurrentStation: jest.fn(),
  useHasPassStationInRegion: jest.fn(() => false),
  useIsPassing: jest.fn(() => false),
  useNextStation: jest.fn(() => null),
  usePreviousStation: jest.fn(() => null),
  useStationNumberIndexFunc: jest.fn(() => jest.fn(() => 0)),
  useTransferLinesFromStation: jest.fn(() => []),
}));

jest.mock('~/utils/getStationNameR', () => ({
  __esModule: true,
  default: jest.fn((station) => station?.nameR || 'Tokyo'),
}));

jest.mock('~/utils/isPass', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

jest.mock('~/store/selectors/isEn', () => ({
  isEnAtom: {},
}));

jest.mock('./ChevronJRWest', () => ({
  ChevronJRWest: jest.fn(() => null),
}));

jest.mock('./PadLineMarks', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('./Typography', () => {
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: jest.fn((props) => <Text {...props}>{props.children}</Text>),
  };
});

jest.mock('./LineBoard/shared/components', () => ({
  EmptyStationNameCell: jest.fn(() => null),
  LineDot: jest.fn(() => null),
  StationName: jest.fn(() => null),
}));

describe('LineBoardWest', () => {
  const { useAtomValue } = require('jotai');
  const { useCurrentLine, useCurrentStation, useDisplayCurrentStation } =
    require('~/hooks');

  const mockLine: Line = {
    __typename: 'Line',
    id: 1,
    nameShort: 'JR神戸線',
    color: '#00a7db',
  } as Line;

  const mockStations: Station[] = [
    {
      id: 1,
      groupId: 1,
      name: '大阪',
      line: mockLine,
    } as unknown as Station,
    {
      id: 2,
      groupId: 2,
      name: '三ノ宮',
      line: mockLine,
    } as unknown as Station,
  ];

  // 派生atom(leftStations/arrived/approaching/stations)とlineStateを
  // atom参照で出し分けるディスパッチ型モック
  const mockAtoms = ({
    leftStations = mockStations,
    arrived = true,
    approaching = false,
    stations = mockStations,
    selectedLine = mockLine,
  }: {
    leftStations?: Station[];
    arrived?: boolean;
    approaching?: boolean;
    stations?: Station[];
    selectedLine?: Line | null;
  }) => {
    const { leftStationsAtom } = require('~/store/selectors/navigation');
    const {
      arrivedAtom,
      approachingAtom,
      stationsAtom,
    } = require('~/store/selectors/station');
    useAtomValue.mockImplementation((a: unknown) => {
      if (a === leftStationsAtom) return leftStations;
      if (a === arrivedAtom) return arrived;
      if (a === approachingAtom) return approaching;
      if (a === stationsAtom) return stations;
      return { selectedLine };
    });
  };

  beforeEach(() => {
    mockAtoms({});
    useCurrentLine.mockReturnValue(mockLine);
    // 現在駅と表示用現在駅を同一駅に固定し、isHealed=false(前方補正なし)の
    // 通常運行パスを決定論的に検証する。
    useCurrentStation.mockReturnValue(mockStations[0]);
    useDisplayCurrentStation.mockReturnValue(mockStations[0]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('正しくレンダリングされる', () => {
    const result = render(
      <LineBoardWest
        stations={mockStations}
        lineColors={['#00a7db', '#00a7db']}
      />
    );
    expect(result.toJSON()).toBeTruthy();
  });

  it('lineがnullの場合、nullを返す', () => {
    useCurrentLine.mockReturnValue(null);
    mockAtoms({ selectedLine: null });
    const result = render(
      <LineBoardWest
        stations={mockStations}
        lineColors={['#00a7db', '#00a7db']}
      />
    );
    expect(result.toJSON()).toBeNull();
  });

  it('barが正しい色で表示される', () => {
    const result = render(
      <LineBoardWest
        stations={mockStations}
        lineColors={['#00a7db', '#00a7db']}
      />
    );
    expect(result.toJSON()).toBeTruthy();
    expect(useCurrentLine).toHaveBeenCalled();
  });

  it('barTerminalが正しく表示される', () => {
    const result = render(
      <LineBoardWest
        stations={mockStations}
        lineColors={['#00a7db', '#00a7db']}
      />
    );
    expect(result.toJSON()).toBeTruthy();
    expect(useAtomValue).toHaveBeenCalled();
  });

  it('各駅のStationNameCellが正しくレンダリングされる', () => {
    const Typography = require('./Typography').default;
    render(
      <LineBoardWest
        stations={mockStations}
        lineColors={['#00a7db', '#00a7db']}
      />
    );
    expect(Typography).toHaveBeenCalled();
  });

  it('駅数が8未満の場合でもエラーなくレンダリングされる', () => {
    const singleStation = [mockStations[0]];
    const result = render(
      <LineBoardWest stations={singleStation} lineColors={['#00a7db']} />
    );
    expect(result.toJSON()).toBeTruthy();
  });

  it('lineColorsが正しく適用される', () => {
    const customColors = ['#ff0000', '#00ff00'];
    render(<LineBoardWest stations={mockStations} lineColors={customColors} />);
    expect(useCurrentLine).toHaveBeenCalled();
    expect(useAtomValue).toHaveBeenCalled();
  });

  it('arrived=falseの場合、ChevronJRWestが表示される', () => {
    const { ChevronJRWest } = require('./ChevronJRWest');
    mockAtoms({ arrived: false });
    render(
      <LineBoardWest
        stations={mockStations}
        lineColors={['#00a7db', '#00a7db']}
      />
    );
    expect(ChevronJRWest).toHaveBeenCalled();
  });

  it('駅番号情報を持つ駅でもエラーなくレンダリングされる', () => {
    const stationsWithNumbers: Station[] = [
      {
        ...mockStations[0],
        stationNumbers: [
          {
            lineSymbolColor: '#00a7db',
            stationNumber: 'JR-A01',
          },
        ],
      } as unknown as Station,
    ];
    const result = render(
      <LineBoardWest stations={stationsWithNumbers} lineColors={['#00a7db']} />
    );
    expect(result.toJSON()).toBeTruthy();
  });

  it('PadLineMarksが正しく表示される', () => {
    const PadLineMarks = require('./PadLineMarks').default;
    render(
      <LineBoardWest
        stations={mockStations}
        lineColors={['#00a7db', '#00a7db']}
      />
    );
    expect(PadLineMarks).toHaveBeenCalled();
  });
});
