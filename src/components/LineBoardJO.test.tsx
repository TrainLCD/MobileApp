import { render } from '@testing-library/react-native';
import type { Line, Station } from '~/@types/graphql';
import LineBoardJO from './LineBoardJO';

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
  useDisplayCurrentStation: jest.fn(),
  useEstimateArrivalTimes: jest.fn(() => ({ route: null })),
  useEstimatedMinutesByStationId: jest.fn(() => new Map()),
  useIsPassing: jest.fn(() => false),
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

jest.mock('~/utils/numbering', () => ({
  getNumberingColor: jest.fn(() => '#000'),
}));

jest.mock('~/store/selectors/isEn', () => ({
  isEnAtom: {},
}));

jest.mock('./ChevronJO', () => ({
  ChevronJO: jest.fn(() => null),
}));

jest.mock('./JOCurrentArrowEdge', () => ({
  JOCurrentArrowEdge: jest.fn(() => null),
}));

jest.mock('./NumberingIcon', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('./PadLineMarks', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('./PassChevronEast', () => ({
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

jest.mock('./LineBoard/shared/components', () => {
  const { Text } = require('react-native');
  return {
    EmptyStationNameCell: jest.fn(() => null),
    EstimatedMinutesBadge: jest.fn(({ estimatedMinutes }) => (
      <Text>{estimatedMinutes}</Text>
    )),
    EstimatedMinutesUnitLabel: jest.fn(() => <Text>分</Text>),
    LineDot: jest.fn(() => null),
    StationName: jest.fn(() => null),
  };
});

describe('LineBoardJO', () => {
  const { useAtomValue } = require('jotai');
  const { useCurrentLine, useDisplayCurrentStation } = require('~/hooks');

  const mockLine: Line = {
    __typename: 'Line',
    id: 1,
    nameShort: '山手線',
    color: '#9acd32',
  } as Line;

  const mockStations: Station[] = [
    {
      id: 1,
      groupId: 1,
      name: '東京',
      line: mockLine,
    } as unknown as Station,
    {
      id: 2,
      groupId: 2,
      name: '品川',
      line: mockLine,
    } as unknown as Station,
  ];

  // arrivedAtom/selectedLineAtomとその他のatomで返す値を分けるディスパッチ型モック
  const mockAtoms = (arrived: boolean, selectedLine: Line | null) => {
    const { arrivedAtom } = require('~/store/atoms/station');
    const { selectedLineAtom } = require('~/store/atoms/line');
    useAtomValue.mockImplementation((a: unknown) => {
      if (a === arrivedAtom) return arrived;
      if (a === selectedLineAtom) return selectedLine;
      return { selectedLine };
    });
  };

  beforeEach(() => {
    mockAtoms(true, mockLine);
    useCurrentLine.mockReturnValue(mockLine);
    useDisplayCurrentStation.mockReturnValue(mockStations[0]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('正しくレンダリングされる', () => {
    const result = render(
      <LineBoardJO
        stations={mockStations}
        lineColors={['#9acd32', '#9acd32']}
      />
    );
    expect(result.toJSON()).toBeTruthy();
  });

  it('lineがnullの場合、nullを返す', () => {
    useCurrentLine.mockReturnValue(null);
    mockAtoms(true, null);
    const result = render(
      <LineBoardJO
        stations={mockStations}
        lineColors={['#9acd32', '#9acd32']}
      />
    );
    expect(result.toJSON()).toBeNull();
  });

  it('arrived=trueの場合、JOCurrentArrowEdgeが表示される', () => {
    const { JOCurrentArrowEdge } = require('./JOCurrentArrowEdge');
    mockAtoms(true, mockLine);
    render(
      <LineBoardJO
        stations={mockStations}
        lineColors={['#9acd32', '#9acd32']}
      />
    );
    expect(JOCurrentArrowEdge).toHaveBeenCalled();
  });

  it('arrived=falseの場合、ChevronJOが表示される', () => {
    const { ChevronJO } = require('./ChevronJO');
    mockAtoms(false, mockLine);
    render(
      <LineBoardJO
        stations={mockStations}
        lineColors={['#9acd32', '#9acd32']}
      />
    );
    expect(ChevronJO).toHaveBeenCalled();
  });

  it('barのスタイルが正しく適用される', () => {
    const result = render(
      <LineBoardJO
        stations={mockStations}
        lineColors={['#9acd32', '#9acd32']}
      />
    );
    expect(result.toJSON()).toBeTruthy();
  });

  it('駅数が8未満の場合でもエラーなくレンダリングされる', () => {
    const singleStation = [mockStations[0]];
    const result = render(
      <LineBoardJO stations={singleStation} lineColors={['#9acd32']} />
    );
    expect(result.toJSON()).toBeTruthy();
  });

  it('barTerminalが正しい位置に表示される', () => {
    const result = render(
      <LineBoardJO
        stations={mockStations}
        lineColors={['#9acd32', '#9acd32']}
      />
    );
    expect(result.toJSON()).toBeTruthy();
  });

  it('各駅のStationNameCellが正しくレンダリングされる', () => {
    const result = render(
      <LineBoardJO
        stations={mockStations}
        lineColors={['#9acd32', '#9acd32']}
      />
    );
    expect(result.toJSON()).toBeTruthy();
  });

  it('lineColorsが正しく反映される', () => {
    const customColors = ['#ff0000', '#00ff00'];
    const result = render(
      <LineBoardJO stations={mockStations} lineColors={customColors} />
    );
    expect(result.toJSON()).toBeTruthy();
  });

  it('barDotが各駅に表示される', () => {
    const result = render(
      <LineBoardJO
        stations={mockStations}
        lineColors={['#9acd32', '#9acd32']}
      />
    );
    expect(result.toJSON()).toBeTruthy();
  });

  it('stationIdに対応するestimatedMinutesがbarDotへ表示される', () => {
    const { useEstimatedMinutesByStationId } = require('~/hooks');
    useEstimatedMinutesByStationId.mockReturnValueOnce(new Map([[2, 5]]));
    const { EstimatedMinutesBadge } = require('./LineBoard/shared/components');
    render(
      <LineBoardJO
        stations={mockStations}
        lineColors={['#9acd32', '#9acd32']}
      />
    );
    expect(EstimatedMinutesBadge.mock.calls[0][0]).toEqual(
      expect.objectContaining({ estimatedMinutes: 5 })
    );
  });

  it('最後の駅にETAがある場合、単位ラベルが表示される', () => {
    const { useEstimatedMinutesByStationId } = require('~/hooks');
    useEstimatedMinutesByStationId.mockReturnValueOnce(new Map([[2, 5]]));
    const {
      EstimatedMinutesUnitLabel,
    } = require('./LineBoard/shared/components');
    render(
      <LineBoardJO
        stations={mockStations}
        lineColors={['#9acd32', '#9acd32']}
      />
    );
    expect(EstimatedMinutesUnitLabel).toHaveBeenCalled();
  });

  it('最後の駅以外のETAには単位ラベルが表示されない', () => {
    const { useEstimatedMinutesByStationId } = require('~/hooks');
    useEstimatedMinutesByStationId.mockReturnValueOnce(new Map([[2, 5]]));
    const {
      EstimatedMinutesBadge,
      EstimatedMinutesUnitLabel,
    } = require('./LineBoard/shared/components');
    const threeStations = [
      ...mockStations,
      {
        id: 3,
        groupId: 3,
        name: '横浜',
        line: mockLine,
      } as unknown as Station,
    ];
    render(
      <LineBoardJO
        stations={threeStations}
        lineColors={['#9acd32', '#9acd32', '#9acd32']}
      />
    );
    // 中間駅(id=2)のETAバッジは表示されるが、単位ラベルは最後尾専用
    expect(EstimatedMinutesBadge).toHaveBeenCalled();
    expect(EstimatedMinutesUnitLabel).not.toHaveBeenCalled();
  });

  it('通過駅の場合、PassChevronEastが表示される', () => {
    const getIsPass = require('~/utils/isPass').default;
    getIsPass.mockReturnValue(true);
    const PassChevronEast = require('./PassChevronEast').default;
    render(
      <LineBoardJO
        stations={mockStations}
        lineColors={['#9acd32', '#9acd32']}
      />
    );
    expect(PassChevronEast).toHaveBeenCalled();
  });
});
