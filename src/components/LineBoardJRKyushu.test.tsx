import { render } from '@testing-library/react-native';
import type { Line, Station } from '~/@types/graphql';
import LineBoardJRKyushu from './LineBoardJRKyushu';

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
  useInterval: jest.fn(),
  useTransferLinesFromStation: jest.fn(() => []),
}));

jest.mock('~/hooks/useScale', () => ({
  useScale: jest.fn(() => ({ widthScale: jest.fn((val) => val) })),
}));

jest.mock('~/store/selectors/isEn', () => ({
  isEnAtom: {},
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
    useAtomValue.mockReturnValue({
      station: mockStations[0],
      arrived: true,
    });
    useCurrentLine.mockReturnValue(mockLine);
    useDisplayCurrentStation.mockReturnValue(mockStations[0]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

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
    useAtomValue.mockReturnValue({
      station: mockStations[0],
      arrived: true,
      selectedLine: null,
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
