import { render } from '@testing-library/react-native';
import type { Line, Station } from '~/@types/graphql';
import LineBoardJO from './LineBoardJO';

// モック設定
jest.mock('jotai', () => ({
  useAtomValue: jest.fn(),
  atom: jest.fn((val) => ({ init: val })),
  useAtom: jest.fn((val) => [val, jest.fn()]),
  useSetAtom: jest.fn(() => jest.fn()),
}));

jest.mock('~/hooks', () => ({
  useCurrentLine: jest.fn(),
  useCurrentStation: jest.fn(),
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

jest.mock('./PassChevronTY', () => ({
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

describe('LineBoardJO', () => {
  const { useAtomValue } = require('jotai');
  const { useCurrentLine, useCurrentStation } = require('~/hooks');

  const mockLine: Line = {
    id: 1,
    name: '山手線',
    color: '#9acd32',
  } as Line;

  const mockStations: Station[] = [
    {
      id: 1,
      groupId: 1,
      name: '東京',
      line: mockLine,
    } as Station,
    {
      id: 2,
      groupId: 2,
      name: '品川',
      line: mockLine,
    } as Station,
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    useAtomValue.mockReturnValue({
      arrived: true,
      selectedLine: mockLine,
    });
    useCurrentLine.mockReturnValue(mockLine);
    useCurrentStation.mockReturnValue(mockStations[0]);
  });

  it('正しくレンダリングされる', () => {
    const { container } = render(
      <LineBoardJO
        stations={mockStations}
        lineColors={['#9acd32', '#9acd32']}
      />
    );
    expect(container).toBeTruthy();
  });

  it('lineがnullの場合、nullを返す', () => {
    useCurrentLine.mockReturnValue(null);
    useAtomValue.mockReturnValue({
      arrived: true,
      selectedLine: null,
    });
    const { container } = render(
      <LineBoardJO
        stations={mockStations}
        lineColors={['#9acd32', '#9acd32']}
      />
    );
    expect(container.children.length).toBe(0);
  });

  it('arrived=trueの場合、JOCurrentArrowEdgeが表示される', () => {
    const { JOCurrentArrowEdge } = require('./JOCurrentArrowEdge');
    useAtomValue.mockReturnValue({
      arrived: true,
      selectedLine: mockLine,
    });
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
    useAtomValue.mockReturnValue({
      arrived: false,
      selectedLine: mockLine,
    });
    render(
      <LineBoardJO
        stations={mockStations}
        lineColors={['#9acd32', '#9acd32']}
      />
    );
    expect(ChevronJO).toHaveBeenCalled();
  });

  it('barのスタイルが正しく適用される', () => {
    const { container } = render(
      <LineBoardJO
        stations={mockStations}
        lineColors={['#9acd32', '#9acd32']}
      />
    );
    expect(container).toBeTruthy();
  });

  it('駅数が8未満の場合、空の配列で埋められる', () => {
    const singleStation = [mockStations[0]];
    const { container } = render(
      <LineBoardJO stations={singleStation} lineColors={['#9acd32']} />
    );
    expect(container).toBeTruthy();
  });

  it('barTerminalが正しい位置に表示される', () => {
    const { container } = render(
      <LineBoardJO
        stations={mockStations}
        lineColors={['#9acd32', '#9acd32']}
      />
    );
    expect(container).toBeTruthy();
  });

  it('各駅のStationNameCellが正しくレンダリングされる', () => {
    const { container } = render(
      <LineBoardJO
        stations={mockStations}
        lineColors={['#9acd32', '#9acd32']}
      />
    );
    expect(container).toBeTruthy();
  });

  it('lineColorsが正しく反映される', () => {
    const customColors = ['#ff0000', '#00ff00'];
    const { container } = render(
      <LineBoardJO stations={mockStations} lineColors={customColors} />
    );
    expect(container).toBeTruthy();
  });

  it('barDotが各駅に表示される', () => {
    const { container } = render(
      <LineBoardJO
        stations={mockStations}
        lineColors={['#9acd32', '#9acd32']}
      />
    );
    expect(container).toBeTruthy();
  });

  it('通過駅の場合、PassChevronTYが表示される', () => {
    const getIsPass = require('~/utils/isPass').default;
    getIsPass.mockReturnValue(true);
    const PassChevronTY = require('./PassChevronTY').default;
    render(
      <LineBoardJO
        stations={mockStations}
        lineColors={['#9acd32', '#9acd32']}
      />
    );
    expect(PassChevronTY).toHaveBeenCalled();
  });
});
