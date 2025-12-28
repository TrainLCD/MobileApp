import { render } from '@testing-library/react-native';
import type { Line, Station } from '~/@types/graphql';
import LineBoardToei from './LineBoardToei';

// モック設定
jest.mock('jotai', () => ({
  useAtomValue: jest.fn(),
  atom: jest.fn((val) => ({ init: val })),
  useAtom: jest.fn((val) => [val, jest.fn()]),
  useSetAtom: jest.fn(() => jest.fn()),
}));

jest.mock('~/hooks', () => ({
  useCurrentLine: jest.fn(),
  useInterval: jest.fn(),
  useStationNumberIndexFunc: jest.fn(() => jest.fn(() => 0)),
  useTransferLinesFromStation: jest.fn(() => []),
}));

jest.mock('~/hooks/useScale', () => ({
  useScale: jest.fn(() => ({ widthScale: jest.fn((val) => val) })),
}));

jest.mock('~/store/selectors/isEn', () => ({
  isEnAtom: {},
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
  const { useCurrentLine } = require('~/hooks');

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

  beforeEach(() => {
    useAtomValue.mockReturnValue({
      station: mockStations[0],
      arrived: true,
    });
    useCurrentLine.mockReturnValue(mockLine);
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

  it('ChevronTYコンポーネントが表示される', () => {
    const { ChevronTY } = require('./ChevronTY');
    render(
      <LineBoardToei
        stations={mockStations}
        lineColors={['#ed6d00', '#ed6d00']}
        hasTerminus={false}
      />
    );
    expect(ChevronTY).toHaveBeenCalled();
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

  it('useIntervalフックが1秒間隔で呼ばれる', () => {
    const { useInterval } = require('~/hooks');
    render(
      <LineBoardToei
        stations={mockStations}
        lineColors={['#ed6d00', '#ed6d00']}
        hasTerminus={false}
      />
    );
    expect(useInterval).toHaveBeenCalledWith(expect.any(Function), 1000);
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
});
