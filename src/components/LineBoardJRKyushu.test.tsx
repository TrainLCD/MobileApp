import { render } from '@testing-library/react-native';
import { type Line, type Station, StopCondition } from '~/@types/graphql';
import { useDisplayNextStation } from '~/hooks/useDisplayNextStation';
import { useSlicedStations } from '~/hooks/useSlicedStations';
import LineBoardJRKyushu from './LineBoardJRKyushu';

// モック設定
jest.mock('jotai', () => ({
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(),
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

jest.mock('~/hooks/useDisplayNextStation', () => ({
  useDisplayNextStation: jest.fn(),
}));

jest.mock('~/hooks/useSlicedStations', () => ({
  useSlicedStations: jest.fn(),
}));

jest.mock('~/store/selectors/isEn', () => ({
  isEnAtom: {},
}));

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

jest.mock('./BarTerminalSaikyo', () => ({
  BarTerminalSaikyo: jest.fn(() => null),
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
  StationName: jest.fn(() => null),
}));

jest.mock('./LineBoard/shared/hooks/useBarStyles', () => ({
  useBarStyles: jest.fn(() => ({ left: 0, width: 100 })),
  useChevronPosition: jest.fn(() => ({})),
  useIncludesLongStationName: jest.fn(() => false),
}));

jest.mock('./NumberingIcon', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

describe('LineBoardJRKyushu', () => {
  const { useAtomValue } = require('jotai');
  const { useCurrentLine, useDisplayCurrentStation } = require('~/hooks');
  const { selectedLineAtom } = require('~/store/atoms/line');
  const { arrivedAtom } = require('~/store/atoms/station');
  const { isEnAtom } = require('~/store/selectors/isEn');

  const mockLine: Line = {
    __typename: 'Line',
    id: 1,
    nameShort: '鹿児島本線',
    color: '#f60',
  } as Line;

  const mockStations: Station[] = [
    {
      id: 1,
      groupId: 1,
      name: '博多',
      line: mockLine,
      threeLetterCode: 'HKT',
      stationNumbers: [
        {
          lineSymbolShape: 'SQUARE',
          lineSymbolColor: '#f60',
          stationNumber: 'JK-01',
        },
      ],
    } as unknown as Station,
    {
      id: 2,
      groupId: 2,
      name: '小倉',
      line: mockLine,
      threeLetterCode: 'KKR',
      stationNumbers: [
        {
          lineSymbolShape: 'SQUARE',
          lineSymbolColor: '#f60',
          stationNumber: 'JK-02',
        },
      ],
    } as unknown as Station,
  ];

  beforeEach(() => {
    // 渡されたatomの同一性で読み出し値を出し分ける
    useAtomValue.mockImplementation((a: unknown) => {
      if (a === arrivedAtom) return true;
      if (a === selectedLineAtom) return null;
      if (a === isEnAtom) return false;
      return undefined;
    });
    useCurrentLine.mockReturnValue(mockLine);
    useDisplayCurrentStation.mockReturnValue(mockStations[0]);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it.each([
    { tablet: true, enabled: true, pass: true, terminal: false, visible: true },
    {
      tablet: false,
      enabled: true,
      pass: true,
      terminal: false,
      visible: false,
    },
    {
      tablet: true,
      enabled: false,
      pass: true,
      terminal: false,
      visible: false,
    },
    {
      tablet: true,
      enabled: true,
      pass: false,
      terminal: false,
      visible: false,
    },
    { tablet: true, enabled: true, pass: true, terminal: true, visible: false },
  ])(
    '次停車駅の案内を表示する条件 tablet=$tablet enabled=$enabled pass=$pass terminal=$terminal',
    ({ tablet, enabled, pass, terminal, visible }) => {
      jest.replaceProperty(require('~/utils/isTablet'), 'default', tablet);
      const stations = [
        mockStations[0],
        {
          ...mockStations[0],
          id: 3,
          groupId: 3,
          name: '通過候補駅',
          stopCondition: pass ? StopCondition.Not : StopCondition.All,
        },
        mockStations[1],
      ];
      jest
        .mocked(useDisplayNextStation)
        .mockReturnValue(terminal ? mockStations[1] : mockStations[0]);
      jest.mocked(useSlicedStations).mockReturnValue(stations);

      const { queryByText } = render(
        <LineBoardJRKyushu
          stations={stations}
          lineColors={['#f60', '#f60', '#f60']}
          hasTerminus={terminal}
          showNextStopBanner={enabled}
        />
      );

      const banner = queryByText(/のつぎは.+にとまります/);
      if (visible) {
        expect(banner).toHaveTextContent('博多のつぎは小倉にとまります');
      } else {
        expect(banner).toBeNull();
      }
    }
  );

  it.each([false, true])(
    '埼京線風グラデ=%pを帯と終端・空き枠へ揃える',
    (saikyoGradient) => {
      const { UNSAFE_getAllByType } = render(
        <LineBoardJRKyushu
          stations={mockStations}
          lineColors={['#f60', '#f60']}
          hasTerminus={false}
          saikyoGradient={saikyoGradient}
        />
      );
      const { LinearGradient } = require('expo-linear-gradient');
      const layers = UNSAFE_getAllByType(LinearGradient).filter(
        (layer) => layer.props.colors[0] === '#fff'
      );
      expect(layers.length).toBeGreaterThan(0);
      for (const layer of layers) {
        expect(layer.props.colors).toEqual(
          saikyoGradient
            ? ['#fff', '#000', '#000']
            : ['#fff', '#000', '#000', '#fff']
        );
        expect(layer.props.locations).toEqual(
          saikyoGradient ? [0.1, 0.5, 0.9] : [0.5, 0.5, 0.5, 0.9]
        );
      }
      const { EmptyStationNameCell } = require('./LineBoard/shared/components');
      expect(EmptyStationNameCell.mock.calls[0][0]).toMatchObject({
        saikyoGradient,
      });
      const { BarTerminalSaikyo } = require('./BarTerminalSaikyo');
      expect(BarTerminalSaikyo).toHaveBeenCalledTimes(saikyoGradient ? 1 : 0);
    }
  );

  it('正しくレンダリングされる', () => {
    const result = render(
      <LineBoardJRKyushu
        stations={mockStations}
        lineColors={['#f60', '#f60']}
        hasTerminus={false}
      />
    );
    expect(result.toJSON()).toBeTruthy();
  });

  it('StationNameコンポーネントが各駅に対してレンダリングされる', () => {
    const { StationName } = require('./LineBoard/shared/components');
    render(
      <LineBoardJRKyushu
        stations={mockStations}
        lineColors={['#f60', '#f60']}
        hasTerminus={false}
      />
    );
    expect(StationName).toHaveBeenCalled();
    expect(StationName).toHaveBeenCalledTimes(mockStations.length);
  });

  it('LineDotコンポーネントが各駅に対してレンダリングされる', () => {
    const { LineDot } = require('./LineBoard/shared/components');
    render(
      <LineBoardJRKyushu
        stations={mockStations}
        lineColors={['#f60', '#f60']}
        hasTerminus={false}
      />
    );
    expect(LineDot).toHaveBeenCalled();
    expect(LineDot).toHaveBeenCalledTimes(mockStations.length);
  });

  it('stationIdに対応するestimatedMinutesがLineDotへ渡される', () => {
    const { useEstimatedMinutesByStationId } = require('~/hooks');
    useEstimatedMinutesByStationId.mockReturnValueOnce(new Map([[2, 5]]));
    const { LineDot } = require('./LineBoard/shared/components');
    render(
      <LineBoardJRKyushu
        stations={mockStations}
        lineColors={['#f60', '#f60']}
        hasTerminus={false}
      />
    );
    expect(LineDot).toHaveBeenCalledWith(
      expect.objectContaining({ estimatedMinutes: 5 }),
      undefined
    );
  });

  it('最後の駅のLineDotにのみisLast=trueが渡される', () => {
    const { LineDot } = require('./LineBoard/shared/components');
    render(
      <LineBoardJRKyushu
        stations={mockStations}
        lineColors={['#f60', '#f60']}
        hasTerminus={false}
      />
    );
    expect(LineDot).toHaveBeenCalledWith(
      expect.objectContaining({ station: mockStations[0], isLast: false }),
      undefined
    );
    expect(LineDot).toHaveBeenCalledWith(
      expect.objectContaining({ station: mockStations[1], isLast: true }),
      undefined
    );
  });

  it('NumberingIconコンポーネントが駅番号付きの駅に対してレンダリングされる', () => {
    const NumberingIcon = require('./NumberingIcon').default;
    render(
      <LineBoardJRKyushu
        stations={mockStations}
        lineColors={['#f60', '#f60']}
        hasTerminus={false}
      />
    );
    expect(NumberingIcon).toHaveBeenCalled();
    expect(NumberingIcon).toHaveBeenCalledTimes(mockStations.length);
  });

  it('点滅チェブロンが表示される', () => {
    const { BlinkingChevron } = require('./LineBoard/shared/components');
    render(
      <LineBoardJRKyushu
        stations={mockStations}
        lineColors={['#f60', '#f60']}
        hasTerminus={false}
      />
    );
    expect(BlinkingChevron).toHaveBeenCalledWith(
      expect.objectContaining({ colors: ['BLACK', 'BLUE'] }),
      undefined
    );
    expect(useCurrentLine).toHaveBeenCalled();
  });

  it('hasTerminus=trueの場合、BarTerminalEastが正しく表示される', () => {
    const { BarTerminalEast } = require('./BarTerminalEast');
    render(
      <LineBoardJRKyushu
        stations={mockStations}
        lineColors={['#f60', '#f60']}
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
      <LineBoardJRKyushu
        stations={[mockStations[0]]}
        lineColors={['#f60']}
        hasTerminus={false}
      />
    );
    expect(EmptyStationNameCell).toHaveBeenCalled();
  });

  it('lineColorsが正しく適用される', () => {
    const customColors = ['#ff0000', '#00ff00'];
    render(
      <LineBoardJRKyushu
        stations={mockStations}
        lineColors={customColors}
        hasTerminus={false}
      />
    );
    expect(useCurrentLine).toHaveBeenCalled();
    expect(useAtomValue).toHaveBeenCalled();
  });

  it('点滅処理はボード本体ではなくBlinkingChevronに委譲される', () => {
    const { useInterval } = require('~/hooks');
    render(
      <LineBoardJRKyushu
        stations={mockStations}
        lineColors={['#f60', '#f60']}
        hasTerminus={false}
      />
    );
    // 毎秒の点滅で全セルが再レンダーされないよう、ボード本体はintervalを持たない
    expect(useInterval).not.toHaveBeenCalled();
  });

  it('駅番号がない駅の場合、NumberingIconが表示されない', () => {
    const stationsWithoutNumbers: Station[] = [
      {
        ...mockStations[0],
        stationNumbers: undefined,
      } as unknown as Station,
    ];
    const NumberingIcon = require('./NumberingIcon').default;
    NumberingIcon.mockClear();

    render(
      <LineBoardJRKyushu
        stations={stationsWithoutNumbers}
        lineColors={['#f60']}
        hasTerminus={false}
      />
    );
    expect(NumberingIcon).not.toHaveBeenCalled();
  });

  it('lineがnullの場合、駅セルがレンダリングされない', () => {
    useCurrentLine.mockReturnValue(null);
    useAtomValue.mockImplementation((a: unknown) => {
      if (a === arrivedAtom) return true;
      if (a === selectedLineAtom) return null;
      if (a === isEnAtom) return false;
      return undefined;
    });
    const { LineDot } = require('./LineBoard/shared/components');
    LineDot.mockClear();
    render(
      <LineBoardJRKyushu
        stations={mockStations}
        lineColors={['#f60', '#f60']}
        hasTerminus={false}
      />
    );
    expect(LineDot).not.toHaveBeenCalled();
  });

  it('barGradientsが正しくレンダリングされる', () => {
    const { useBarStyles } = require('./LineBoard/shared/hooks/useBarStyles');
    render(
      <LineBoardJRKyushu
        stations={mockStations}
        lineColors={['#f60', '#f60']}
        hasTerminus={false}
      />
    );
    expect(useBarStyles).toHaveBeenCalled();
    expect(useCurrentLine).toHaveBeenCalled();
  });

  it('threeLetterCodeが正しくNumberingIconに渡される', () => {
    const NumberingIcon = require('./NumberingIcon').default;
    render(
      <LineBoardJRKyushu
        stations={mockStations}
        lineColors={['#f60', '#f60']}
        hasTerminus={false}
      />
    );
    expect(NumberingIcon).toHaveBeenCalledWith(
      expect.objectContaining({
        threeLetterCode: 'HKT',
      }),
      undefined
    );
  });
});
