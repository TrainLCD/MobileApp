import { render } from '@testing-library/react-native';
import type { Line, Station } from '~/@types/graphql';
import {
  getHorizontalStationNameOffset,
  getHorizontalStationNameWidth,
  HORIZONTAL_STATION_NAME_MAX_CHARS,
} from './LineBoard/shared/styles/commonStyles';
import LineBoardToei, { EN_STATION_NAME_MAX_CHARS } from './LineBoardToei';

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
  useStationNumberIndexFunc: jest.fn(() => jest.fn(() => 0)),
  useTransferLinesFromStation: jest.fn(() => []),
}));

jest.mock('~/hooks/useScale', () => ({
  useScale: jest.fn(() => ({ widthScale: jest.fn((val) => val) })),
}));

jest.mock('~/store/selectors/isEn', () => ({
  isEnAtom: { __brand: 'isEnAtom' },
}));

jest.mock('~/utils/getStationNameR', () => ({
  __esModule: true,
  default: jest.fn((station) => station?.nameR || 'Tokyo'),
}));

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

jest.mock('~/utils/isPass', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

jest.mock('./BarTerminalEast', () => ({
  BarTerminalEast: jest.fn(() => null),
}));

jest.mock('./ChevronTY', () => ({
  ChevronTY: jest.fn(() => null),
}));

jest.mock('./LineBoard/shared/components', () => ({
  BlinkingChevron: jest.fn(() => null),
  EmptyStationNameCell: jest.fn(() => null),
  LineDot: jest.fn(() => null),
}));

jest.mock('./LineBoard/shared/hooks/useBarStyles', () => ({
  useBarStyles: jest.fn(() => ({ left: 0, width: 100 })),
  useChevronPosition: jest.fn(() => ({})),
  useIncludesLongStationName: jest.fn(() => false),
}));

jest.mock('./Typography', () => {
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: jest.fn((props) => <Text {...props}>{props.children}</Text>),
  };
});

describe('LineBoardToei', () => {
  const { useAtomValue } = require('jotai');
  const { useCurrentLine, useDisplayCurrentStation } = require('~/hooks');

  const mockLine: Line = {
    __typename: 'Line',
    id: 1,
    nameShort: '都営浅草線',
    color: '#ed6d00',
  } as Line;

  const mockStations: Station[] = [
    {
      id: 1,
      groupId: 1,
      name: '新橋',
      nameKorean: '신바시',
      nameChinese: '新桥',
      line: mockLine,
      stationNumbers: [
        {
          lineSymbolColor: '#ed6d00',
          stationNumber: 'A-10',
        },
      ],
    } as unknown as Station,
    {
      id: 2,
      groupId: 2,
      name: '東銀座',
      nameKorean: '히가시긴자',
      nameChinese: '东银座',
      line: mockLine,
      stationNumbers: [
        {
          lineSymbolColor: '#ed6d00',
          stationNumber: 'A-11',
        },
      ],
    } as unknown as Station,
  ];

  const createUseAtomValueMock =
    ({
      isEn = false,
      enabledLanguages = ['JA', 'EN', 'ZH', 'KO'] as string[],
      stationOverrides = {} as Record<string, unknown>,
    } = {}) =>
    (atomVal: unknown) => {
      const { enabledLanguagesAtom } = require('~/store/atoms/navigation');
      const { arrivedAtom } = require('~/store/atoms/station');
      const { selectedLineAtom } = require('~/store/atoms/line');
      const brand = (atomVal as { __brand?: string } | null)?.__brand;
      if (brand === 'isEnAtom') {
        return isEn;
      }
      if (atomVal === enabledLanguagesAtom) {
        return enabledLanguages;
      }
      if (atomVal === arrivedAtom) {
        return (stationOverrides.arrived as boolean | undefined) ?? true;
      }
      if (atomVal === selectedLineAtom) {
        return (
          (stationOverrides.selectedLine as Line | null | undefined) ?? null
        );
      }
      return {
        station: mockStations[0],
        arrived: true,
        ...stationOverrides,
      };
    };

  beforeEach(() => {
    useAtomValue.mockImplementation(createUseAtomValueMock());
    useCurrentLine.mockReturnValue(mockLine);
    useDisplayCurrentStation.mockReturnValue(mockStations[0]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('正しくレンダリングされる', () => {
    const result = render(
      <LineBoardToei
        stations={mockStations}
        lineColors={['#ed6d00', '#ed6d00']}
        hasTerminus={false}
      />
    );
    expect(result.toJSON()).toBeTruthy();
  });

  it('駅番号が正しく表示される', () => {
    const { getByText } = render(
      <LineBoardToei
        stations={mockStations}
        lineColors={['#ed6d00', '#ed6d00']}
        hasTerminus={false}
      />
    );
    expect(getByText('A-10')).toBeTruthy();
    expect(getByText('A-11')).toBeTruthy();
  });

  it('LineDotコンポーネントが各駅に対してレンダリングされる', () => {
    const { LineDot } = require('./LineBoard/shared/components');
    render(
      <LineBoardToei
        stations={mockStations}
        lineColors={['#ed6d00', '#ed6d00']}
        hasTerminus={false}
      />
    );
    expect(LineDot).toHaveBeenCalled();
  });

  it('点滅チェブロンが表示される', () => {
    const { BlinkingChevron } = require('./LineBoard/shared/components');
    render(
      <LineBoardToei
        stations={mockStations}
        lineColors={['#ed6d00', '#ed6d00']}
        hasTerminus={false}
      />
    );
    expect(BlinkingChevron).toHaveBeenCalledWith(
      expect.objectContaining({ colors: ['BLUE', 'RED'] }),
      undefined
    );
  });

  it('hasTerminus=trueの場合、BarTerminalEastが正しく表示される', () => {
    const { BarTerminalEast } = require('./BarTerminalEast');
    render(
      <LineBoardToei
        stations={mockStations}
        lineColors={['#ed6d00', '#ed6d00']}
        hasTerminus={true}
      />
    );
    expect(BarTerminalEast).toHaveBeenCalledWith(
      expect.objectContaining({ hasTerminus: true }),
      undefined
    );
  });

  it('駅数が8未満の場合、EmptyStationNameCellで埋められる', () => {
    const { EmptyStationNameCell } = require('./LineBoard/shared/components');
    render(
      <LineBoardToei
        stations={[mockStations[0]]}
        lineColors={['#ed6d00']}
        hasTerminus={false}
      />
    );
    expect(EmptyStationNameCell).toHaveBeenCalled();
  });

  it('lineColorsが正しく適用される', () => {
    const customColors = ['#ff0000', '#00ff00'];
    const result = render(
      <LineBoardToei
        stations={mockStations}
        lineColors={customColors}
        hasTerminus={false}
      />
    );
    expect(result.toJSON()).toBeTruthy();
  });

  it('点滅処理はボード本体ではなくBlinkingChevronに委譲される', () => {
    const { useInterval } = require('~/hooks');
    render(
      <LineBoardToei
        stations={mockStations}
        lineColors={['#ed6d00', '#ed6d00']}
        hasTerminus={false}
      />
    );
    // 毎秒の点滅で全セルが再レンダーされないよう、ボード本体はintervalを持たない
    expect(useInterval).not.toHaveBeenCalled();
  });

  it('lineがnullの場合、駅セルがレンダリングされない', () => {
    useCurrentLine.mockReturnValue(null);
    useAtomValue.mockImplementation(
      createUseAtomValueMock({ stationOverrides: { selectedLine: null } })
    );
    const { LineDot } = require('./LineBoard/shared/components');
    LineDot.mockClear();
    render(
      <LineBoardToei
        stations={mockStations}
        lineColors={['#ed6d00', '#ed6d00']}
        hasTerminus={false}
      />
    );
    expect(LineDot).not.toHaveBeenCalled();
  });

  it('barGradientsが正しくレンダリングされる', () => {
    const result = render(
      <LineBoardToei
        stations={mockStations}
        lineColors={['#ed6d00', '#ed6d00']}
        hasTerminus={false}
      />
    );
    expect(result.toJSON()).toBeTruthy();
  });

  it('韓国語が無効の場合、韓国語の併記が表示されない', () => {
    useAtomValue.mockImplementation(
      createUseAtomValueMock({ enabledLanguages: ['JA', 'EN'] })
    );
    const { queryByText } = render(
      <LineBoardToei
        stations={mockStations}
        lineColors={['#ed6d00', '#ed6d00']}
        hasTerminus={false}
      />
    );
    expect(queryByText('신바시')).toBeNull();
    expect(queryByText('히가시긴자')).toBeNull();
  });

  it('中国語が無効の場合、英語モードで中国語の併記が表示されない', () => {
    useAtomValue.mockImplementation(
      createUseAtomValueMock({ isEn: true, enabledLanguages: ['JA', 'EN'] })
    );
    const { queryByText } = render(
      <LineBoardToei
        stations={mockStations}
        lineColors={['#ed6d00', '#ed6d00']}
        hasTerminus={false}
      />
    );
    expect(queryByText('新桥')).toBeNull();
    expect(queryByText('东银座')).toBeNull();
  });

  it('韓国語が有効の場合、韓国語の併記が表示される', () => {
    useAtomValue.mockImplementation(
      createUseAtomValueMock({ enabledLanguages: ['JA', 'EN', 'KO'] })
    );
    const { getByText } = render(
      <LineBoardToei
        stations={mockStations}
        lineColors={['#ed6d00', '#ed6d00']}
        hasTerminus={false}
      />
    );
    expect(getByText('신')).toBeTruthy();
  });

  it('中国語が有効の場合、英語モードで中国語の併記が表示される', () => {
    useAtomValue.mockImplementation(
      createUseAtomValueMock({
        isEn: true,
        enabledLanguages: ['JA', 'EN', 'ZH'],
      })
    );
    const { getByText } = render(
      <LineBoardToei
        stations={mockStations}
        lineColors={['#ed6d00', '#ed6d00']}
        hasTerminus={false}
      />
    );
    expect(getByText('新桥')).toBeTruthy();
  });

  describe('斜め書き駅名(横書き)の折り返し幅と位置補正', () => {
    // useLandscapeWindowDimensions のモックが返す短辺
    const WINDOW_HEIGHT = 375;

    const flattenStyle = (style: unknown): Record<string, unknown> =>
      Object.assign(
        {},
        ...(Array.isArray(style) ? style.flat() : [style]).filter(
          (s: unknown): s is Record<string, unknown> =>
            !!s && typeof s === 'object'
        )
      );

    const renderStationName = (stations: Station[]) => {
      const { getByText } = render(
        <LineBoardToei
          stations={stations}
          lineColors={['#ed6d00', '#ed6d00']}
          hasTerminus={false}
        />
      );
      return flattenStyle(getByText('新橋').props.style);
    };

    beforeEach(() => {
      const {
        useIncludesLongStationName,
      } = require('./LineBoard/shared/hooks/useBarStyles');
      useIncludesLongStationName.mockReturnValue(true);
      // 韓国語の入れ子表示を切って駅名の Text を一意に取得する
      useAtomValue.mockImplementation(
        createUseAtomValueMock({ enabledLanguages: ['JA'] })
      );
    });

    afterEach(() => {
      const {
        useIncludesLongStationName,
      } = require('./LineBoard/shared/hooks/useBarStyles');
      useIncludesLongStationName.mockReturnValue(false);
    });

    it('ナンバリングありの場合、既定より広い幅と対応する位置補正が適用される', () => {
      const style = renderStationName(mockStations);

      const expectedWidth = getHorizontalStationNameWidth(
        HORIZONTAL_STATION_NAME_MAX_CHARS + 0.5
      );
      const expectedOffset = getHorizontalStationNameOffset(
        WINDOW_HEIGHT / 2,
        expectedWidth
      );

      expect(style.width).toBeCloseTo(expectedWidth);
      expect(style.marginLeft).toBeCloseTo(expectedOffset.marginLeft);
      expect(style.marginBottom).toBeCloseTo(
        WINDOW_HEIGHT / 6 + expectedOffset.marginBottom
      );
    });

    it('ナンバリングなしの場合、既定の幅と対応する位置補正が適用される', () => {
      const stationsWithoutNumbering = mockStations.map((s) => ({
        ...s,
        stationNumbers: [],
      })) as Station[];

      const style = renderStationName(stationsWithoutNumbering);

      const expectedWidth = getHorizontalStationNameWidth(
        HORIZONTAL_STATION_NAME_MAX_CHARS
      );
      const expectedOffset = getHorizontalStationNameOffset(
        WINDOW_HEIGHT / 2.5,
        expectedWidth
      );

      expect(style.width).toBeCloseTo(expectedWidth);
      expect(style.marginLeft).toBeCloseTo(expectedOffset.marginLeft);
      expect(style.marginBottom).toBeCloseTo(
        WINDOW_HEIGHT / 10 + expectedOffset.marginBottom
      );
    });

    it('英語表記の場合、中国語の併記ぶん行が増えるので日本語より狭い幅になる', () => {
      useAtomValue.mockImplementation(
        createUseAtomValueMock({ isEn: true, enabledLanguages: ['JA', 'EN'] })
      );

      const { getAllByText } = render(
        <LineBoardToei
          stations={mockStations}
          lineColors={['#ed6d00', '#ed6d00']}
          hasTerminus={false}
        />
      );
      const style = flattenStyle(getAllByText('Tokyo')[0].props.style);

      const expectedWidth = getHorizontalStationNameWidth(
        EN_STATION_NAME_MAX_CHARS
      );
      const expectedOffset = getHorizontalStationNameOffset(
        WINDOW_HEIGHT / 2,
        expectedWidth
      );

      expect(style.width).toBeCloseTo(expectedWidth);
      // 斜め書きの外接矩形は (幅 × sin55°) が支配的なので、
      // 日本語と同じ広い幅にすると回転後に親からはみ出して併記が切れる
      expect(style.width).toBeLessThan(
        getHorizontalStationNameWidth(HORIZONTAL_STATION_NAME_MAX_CHARS + 0.5)
      );
      expect(style.marginLeft).toBeCloseTo(expectedOffset.marginLeft);
      expect(style.marginBottom).toBeCloseTo(
        WINDOW_HEIGHT / 6 + expectedOffset.marginBottom
      );
    });
  });
});
