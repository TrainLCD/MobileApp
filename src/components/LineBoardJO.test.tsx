import { render } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';
import type { Line, Station } from '~/@types/graphql';
import LineBoardJO from './LineBoardJO';

// react-test-rendererの型定義が未導入のため、toJSON()の構造を最小限に表す
type RenderedJSONNode = {
  type: string;
  props: Record<string, unknown>;
  children: (RenderedJSONNode | string)[] | null;
};

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

  describe('レイアウト計算(スマホ)', () => {
    // useLandscapeWindowDimensionsモックのwidth=812に対応するバー1セグメント幅
    const BAR_WIDTH = (812 - 96) / 7.835;

    const collectNodes = (
      node: RenderedJSONNode | string | (RenderedJSONNode | string)[] | null
    ): RenderedJSONNode[] => {
      if (!node || typeof node === 'string') {
        return [];
      }
      if (Array.isArray(node)) {
        return node.flatMap((n) => collectNodes(n));
      }
      return [node, ...collectNodes(node.children)];
    };

    const renderAndFlattenStyles = () => {
      const result = render(
        <LineBoardJO
          stations={mockStations}
          lineColors={['#9acd32', '#9acd32']}
        />
      );
      return collectNodes(
        result.toJSON() as RenderedJSONNode | RenderedJSONNode[] | null
      ).map((node) => StyleSheet.flatten(node.props.style as ViewStyle) ?? {});
    };

    it('未通過駅のドットはバー高さ-8pxの正方形としてバー内の縦中央に配置される', () => {
      const styles = renderAndFlattenStyles();
      const dots = styles.filter((s) => s.borderRadius === 32);
      // バー高さ40 - 8 = 32px。現在駅(index 0)以外の7個が未通過ドット
      const futureDots = dots.filter((s) => s.width === 32);
      expect(futureDots).toHaveLength(7);
      for (const dot of futureDots) {
        expect(dot.height).toBe(32);
        expect(dot.bottom).toBe(48 + 4); // BAR_BOTTOM_JO + 上下4pxインセット
      }
      // 現在駅の16pxドットは従来どおりバーの縦中央
      const currentDots = dots.filter((s) => s.width === 16);
      expect(currentDots).toHaveLength(1);
      expect(currentDots[0].bottom).toBe(48 + 12);
    });

    it('最終バーセグメントと終端矢印が延長分(+14px)だけ右へ伸びる', () => {
      const styles = renderAndFlattenStyles();
      const segmentWidths = styles
        .filter(
          (s) =>
            s.height === 40 && s.bottom === 48 && typeof s.width === 'number'
        )
        .map((s) => s.width as number)
        .sort((a, b) => a - b);
      expect(segmentWidths).toHaveLength(8);
      expect(segmentWidths[6]).toBeCloseTo(BAR_WIDTH + 1); // 通常セグメント
      expect(segmentWidths[7]).toBeCloseTo(BAR_WIDTH + 1 + 14); // 最終のみ延長
      const terminal = styles.find(
        (s) => s.borderLeftWidth === 20 && s.borderBottomWidth === 20
      );
      expect(terminal?.left).toBeCloseTo(BAR_WIDTH * 8 - 10 + 14);
    });

    it('単位ラベルコンテナが最終ドットの右端に隣接して縦中央配置される', () => {
      const { useEstimatedMinutesByStationId } = require('~/hooks');
      useEstimatedMinutesByStationId.mockReturnValueOnce(new Map([[2, 5]]));
      const result = render(
        <LineBoardJO
          stations={mockStations}
          lineColors={['#9acd32', '#9acd32']}
        />
      );
      const unitContainer = collectNodes(
        result.toJSON() as RenderedJSONNode | RenderedJSONNode[] | null
      ).find((node) => node.props.pointerEvents === 'none');
      expect(unitContainer).toBeTruthy();
      const style = StyleSheet.flatten(unitContainer?.props.style as ViewStyle);
      expect(style.position).toBe('absolute');
      expect(style.left).toBe(36); // ドット幅32px + 間隔4px
      expect(style.top).toBe(0);
      expect(style.height).toBe(32); // ドットと同じ高さで縦中央揃え
    });
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
