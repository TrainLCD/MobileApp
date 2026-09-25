import { render } from '@testing-library/react-native';
import type { Line, Station } from '~/@types/graphql';
import LineBoardSaikyo from './LineBoardSaikyo';

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
  useInterval: jest.fn(),
  useTransferLinesFromStation: jest.fn(() => []),
}));

jest.mock('~/hooks/useScale', () => ({
  useScale: jest.fn(() => ({ widthScale: jest.fn((val) => val) })),
}));

jest.mock('~/store/selectors/isEn', () => ({
  isEnAtom: { __brand: 'isEnAtom' },
}));

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

jest.mock('~/utils/isPass', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

jest.mock('./BarTerminalSaikyo', () => ({
  BarTerminalSaikyo: jest.fn(() => null),
}));

jest.mock('./ChevronTY', () => ({
  ChevronTY: jest.fn(() => null),
}));

jest.mock('./LineBoard/shared/components', () => ({
  BlinkingChevron: jest.fn(() => null),
  EmptyStationNameCell: jest.fn(() => null),
  LineDot: jest.fn(() => null),
  StationName: jest.fn(() => null),
}));

jest.mock('./LineBoard/shared/hooks/useBarStyles', () => ({
  useBarStyles: jest.fn(() => ({ left: 0, width: 100 })),
  useChevronPosition: jest.fn(() => ({})),
  useIncludesLongStationName: jest.fn(() => false),
}));

describe('LineBoardSaikyo', () => {
  const { useAtomValue } = require('jotai');
  const { useCurrentLine, useDisplayCurrentStation } = require('~/hooks');

  const mockLine: Line = {
    __typename: 'Line',
    id: 1,
    nameShort: '埼京線',
    color: '#00ac9a',
  } as Line;

  const mockStations: Station[] = [
    {
      id: 1,
      groupId: 1,
      name: '大宮',
      line: mockLine,
    } as unknown as Station,
    {
      id: 2,
      groupId: 2,
      name: '新宿',
      line: mockLine,
    } as unknown as Station,
  ];

  beforeEach(() => {
    // arrivedAtom/selectedLineAtom/isEnAtomとその他のatomで返す値を分ける
    useAtomValue.mockImplementation((atomVal: unknown) => {
      const { arrivedAtom } = require('~/store/atoms/station');
      const { selectedLineAtom } = require('~/store/atoms/line');
      const brand = (atomVal as { __brand?: string } | null)?.__brand;
      if (atomVal === arrivedAtom) {
        return true;
      }
      if (atomVal === selectedLineAtom) {
        return null;
      }
      if (brand === 'isEnAtom') {
        return false;
      }
      return {
        station: mockStations[0],
        arrived: true,
      };
    });
    useCurrentLine.mockReturnValue(mockLine);
    useDisplayCurrentStation.mockReturnValue(mockStations[0]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('正しくレンダリングされる', () => {
    const result = render(
      <LineBoardSaikyo
        stations={mockStations}
        lineColors={['#00ac9a', '#00ac9a']}
        hasTerminus={false}
      />
    );
    expect(result.toJSON()).toBeTruthy();
  });

  it('StationNameコンポーネントが各駅に対してレンダリングされる', () => {
    const { StationName } = require('./LineBoard/shared/components');
    render(
      <LineBoardSaikyo
        stations={mockStations}
        lineColors={['#00ac9a', '#00ac9a']}
        hasTerminus={false}
      />
    );
    expect(StationName).toHaveBeenCalled();
    expect(StationName).toHaveBeenCalledTimes(mockStations.length);
    expect(StationName).toHaveBeenCalledWith(
      expect.objectContaining({
        station: expect.objectContaining({
          name: expect.any(String),
        }),
      }),
      undefined
    );
  });

  it('LineDotコンポーネントが各駅に対してレンダリングされる', () => {
    const { LineDot } = require('./LineBoard/shared/components');
    render(
      <LineBoardSaikyo
        stations={mockStations}
        lineColors={['#00ac9a', '#00ac9a']}
        hasTerminus={false}
      />
    );
    expect(LineDot).toHaveBeenCalled();
    expect(LineDot).toHaveBeenCalledTimes(mockStations.length);
    expect(LineDot).toHaveBeenCalledWith(
      expect.objectContaining({
        station: expect.objectContaining({
          name: expect.any(String),
        }),
        arrived: expect.any(Boolean),
        passed: expect.any(Boolean),
      }),
      undefined
    );
  });

  it('点滅チェブロンが表示される', () => {
    const { BlinkingChevron } = require('./LineBoard/shared/components');
    render(
      <LineBoardSaikyo
        stations={mockStations}
        lineColors={['#00ac9a', '#00ac9a']}
        hasTerminus={false}
      />
    );
    expect(BlinkingChevron).toHaveBeenCalledWith(
      expect.objectContaining({ colors: ['RED', 'WHITE'] }),
      undefined
    );
    expect(useCurrentLine).toHaveBeenCalled();
  });

  it('isE131の場合、チェブロンを青と白で点滅させ、駅ドットを丸くする', () => {
    const {
      BlinkingChevron,
      LineDot,
    } = require('./LineBoard/shared/components');
    render(
      <LineBoardSaikyo
        stations={mockStations}
        lineColors={['#F68B1E', '#F68B1E']}
        hasTerminus={false}
        isE131
      />
    );
    expect(BlinkingChevron).toHaveBeenCalledWith(
      expect.objectContaining({ colors: ['BLUE', 'WHITE'] }),
      undefined
    );
    expect(LineDot).toHaveBeenCalledWith(
      expect.objectContaining({ round: true }),
      undefined
    );
  });

  it('isE131の場合、ETAのクエリを実行せず駅ドットにETAを渡さない', () => {
    const { LineDot } = require('./LineBoard/shared/components');
    const { useEstimateArrivalTimes } = require('~/hooks');
    render(
      <LineBoardSaikyo
        stations={mockStations}
        lineColors={['#F68B1E', '#F68B1E']}
        hasTerminus={false}
        isE131
      />
    );
    expect(useEstimateArrivalTimes).toHaveBeenCalledWith({ skip: true });
    for (const [props] of (LineDot as jest.Mock).mock.calls) {
      expect(props.estimatedMinutes ?? null).toBeNull();
    }
  });

  it('isE131を渡さない場合はETAのクエリを実行する', () => {
    const { useEstimateArrivalTimes } = require('~/hooks');
    render(
      <LineBoardSaikyo
        stations={mockStations}
        lineColors={['#00ac9a', '#00ac9a']}
        hasTerminus={false}
      />
    );
    expect(useEstimateArrivalTimes).toHaveBeenCalledWith({ skip: false });
  });

  it('isE131を渡さない場合、駅ドットは丸くしない', () => {
    const { LineDot } = require('./LineBoard/shared/components');
    render(
      <LineBoardSaikyo
        stations={mockStations}
        lineColors={['#00ac9a', '#00ac9a']}
        hasTerminus={false}
      />
    );
    expect(LineDot).toHaveBeenCalledWith(
      expect.objectContaining({ round: false }),
      undefined
    );
  });

  it('hasTerminus=trueの場合、BarTerminalSaikyoが正しく表示される', () => {
    const { BarTerminalSaikyo } = require('./BarTerminalSaikyo');
    render(
      <LineBoardSaikyo
        stations={mockStations}
        lineColors={['#00ac9a', '#00ac9a']}
        hasTerminus={true}
      />
    );
    expect(BarTerminalSaikyo).toHaveBeenCalledWith(
      expect.objectContaining({ hasTerminus: true }),
      undefined
    );
  });

  it('駅数が8未満の場合でもエラーなくレンダリングされる', () => {
    const singleStation = [mockStations[0]];
    const result = render(
      <LineBoardSaikyo
        stations={singleStation}
        lineColors={['#00ac9a']}
        hasTerminus={false}
      />
    );
    expect(result.toJSON()).toBeTruthy();
  });

  it('lineColorsが正しく適用される', () => {
    const { LineDot } = require('./LineBoard/shared/components');
    const customColors = ['#ff0000', '#00ff00'];
    render(
      <LineBoardSaikyo
        stations={mockStations}
        lineColors={customColors}
        hasTerminus={false}
      />
    );
    expect(useCurrentLine).toHaveBeenCalled();
    expect(useAtomValue).toHaveBeenCalled();
    expect(LineDot).toHaveBeenCalledWith(
      expect.objectContaining({
        station: expect.any(Object),
        arrived: expect.any(Boolean),
      }),
      undefined
    );
  });

  it('点滅処理はボード本体ではなくBlinkingChevronに委譲される', () => {
    const { useInterval } = require('~/hooks');
    render(
      <LineBoardSaikyo
        stations={mockStations}
        lineColors={['#00ac9a', '#00ac9a']}
        hasTerminus={false}
      />
    );
    // 毎秒の点滅で全セルが再レンダーされないよう、ボード本体はintervalを持たない
    expect(useInterval).not.toHaveBeenCalled();
  });

  it('空の駅がある場合でもエラーなくレンダリングされる', () => {
    const { StationName } = require('./LineBoard/shared/components');
    render(
      <LineBoardSaikyo
        stations={[mockStations[0]]}
        lineColors={['#00ac9a']}
        hasTerminus={false}
      />
    );
    expect(StationName).toHaveBeenCalled();
    expect(StationName).toHaveBeenCalledWith(
      expect.objectContaining({
        station: expect.objectContaining({
          name: mockStations[0].name,
        }),
      }),
      undefined
    );
    expect(useCurrentLine).toHaveBeenCalled();
  });

  it('barGradientsが正しくレンダリングされる', () => {
    const { useBarStyles } = require('./LineBoard/shared/hooks/useBarStyles');
    render(
      <LineBoardSaikyo
        stations={mockStations}
        lineColors={['#00ac9a', '#00ac9a']}
        hasTerminus={false}
      />
    );
    expect(useBarStyles).toHaveBeenCalled();
    expect(useCurrentLine).toHaveBeenCalled();
  });

  describe('直通先の路線色に切り替わる位置', () => {
    const OEDO = '#b6007a';
    const YAMANOTE = '#9acd32';

    // 路線の色で塗ったバーを、左端・幅・色で取り出す
    const getColoredBars = (
      result: ReturnType<typeof render>
    ): { left: number; width: number; color: string }[] => {
      const { LinearGradient } = require('expo-linear-gradient');
      return result
        .UNSAFE_getAllByType(LinearGradient)
        .map((node) => {
          const style = Object.assign(
            {},
            ...[node.props.style].flat(Number.POSITIVE_INFINITY)
          );
          return {
            left: style.left,
            width: style.width,
            color: String(node.props.colors[0]).slice(0, 7),
          };
        })
        .filter(({ color }) => color === OEDO || color === YAMANOTE);
    };

    it('E131系風では接続駅の丸いドットの中心で次の路線の色に切り替わる', () => {
      const result = render(
        <LineBoardSaikyo
          stations={mockStations}
          lineColors={[OEDO, YAMANOTE]}
          hasTerminus={false}
          isE131
        />
      );
      // useBarStylesのモックでバーは左端0・幅100、丸いドットの中心は12
      expect(getColoredBars(result)).toEqual([
        { left: 0, width: 12, color: OEDO },
        { left: 12, width: 88, color: YAMANOTE },
        { left: 0, width: 100, color: YAMANOTE },
      ]);
    });

    it('接続駅に着いた後も先頭のドットより手前は着いてきた路線の色で塗る', () => {
      const result = render(
        <LineBoardSaikyo
          stations={mockStations}
          lineColors={[YAMANOTE, YAMANOTE]}
          arrivingLineColor={OEDO}
          hasTerminus={false}
        />
      );
      // 埼京線風は四角いドットで中心は16
      expect(getColoredBars(result)).toEqual([
        { left: 0, width: 16, color: OEDO },
        { left: 16, width: 84, color: YAMANOTE },
        { left: 0, width: 100, color: YAMANOTE },
      ]);
    });
  });
});
