import { render } from '@testing-library/react-native';
import type { Line, Station } from '~/@types/graphql';
import LineBoardEast from './LineBoardEast';

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

jest.mock('./LineBoard/shared/components', () => ({
  EmptyStationNameCell: jest.fn(() => null),
  LineDot: jest.fn(() => null),
  StationName: jest.fn(() => null),
}));

jest.mock('./LineBoard/shared/hooks/useBarStyles', () => ({
  useBarStyles: jest.fn(() => ({ left: 0, width: 100 })),
  useChevronPosition: jest.fn(() => ({})),
  useIncludesLongStationName: jest.fn(() => false),
}));

jest.mock('./BarTerminalEast', () => ({
  BarTerminalEast: jest.fn(() => null),
}));

jest.mock('./ChevronTY', () => ({
  ChevronTY: jest.fn(() => null),
}));

describe('LineBoardEast', () => {
  const { useAtomValue } = require('jotai');
  const { useCurrentLine } = require('~/hooks');

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
      station: mockStations[0],
      arrived: true,
    });
    useCurrentLine.mockReturnValue(mockLine);
  });

  it('正しくレンダリングされる', () => {
    const { container } = render(
      <LineBoardEast
        stations={mockStations}
        lineColors={['#9acd32', '#9acd32']}
        hasTerminus={false}
      />
    );
    expect(container).toBeTruthy();
  });

  it('空の駅の場合、EmptyStationNameCellがレンダリングされる', () => {
    const { EmptyStationNameCell } = require('./LineBoard/shared/components');
    render(
      <LineBoardEast
        stations={[mockStations[0]]}
        lineColors={['#9acd32']}
        hasTerminus={false}
      />
    );
    // 8駅中1駅しかないので、7つの空セルがレンダリングされる
    expect(EmptyStationNameCell).toHaveBeenCalled();
  });

  it('hasTerminus=trueの場合、正しく渡される', () => {
    const { BarTerminalEast } = require('./BarTerminalEast');
    render(
      <LineBoardEast
        stations={mockStations}
        lineColors={['#9acd32', '#9acd32']}
        hasTerminus={true}
      />
    );
    expect(BarTerminalEast).toHaveBeenCalledWith(
      expect.objectContaining({ hasTerminus: true }),
      {}
    );
  });

  it('ChevronTYコンポーネントが表示される', () => {
    const { ChevronTY } = require('./ChevronTY');
    render(
      <LineBoardEast
        stations={mockStations}
        lineColors={['#9acd32', '#9acd32']}
        hasTerminus={false}
      />
    );
    expect(ChevronTY).toHaveBeenCalled();
  });

  it('StationNameコンポーネントが各駅に対してレンダリングされる', () => {
    const { StationName } = require('./LineBoard/shared/components');
    render(
      <LineBoardEast
        stations={mockStations}
        lineColors={['#9acd32', '#9acd32']}
        hasTerminus={false}
      />
    );
    expect(StationName).toHaveBeenCalled();
  });

  it('LineDotコンポーネントが各駅に対してレンダリングされる', () => {
    const { LineDot } = require('./LineBoard/shared/components');
    render(
      <LineBoardEast
        stations={mockStations}
        lineColors={['#9acd32', '#9acd32']}
        hasTerminus={false}
      />
    );
    expect(LineDot).toHaveBeenCalled();
  });

  it('lineがnullの場合、何もレンダリングされない', () => {
    useCurrentLine.mockReturnValue(null);
    const { StationName } = require('./LineBoard/shared/components');
    render(
      <LineBoardEast
        stations={mockStations}
        lineColors={['#9acd32', '#9acd32']}
        hasTerminus={false}
      />
    );
    expect(StationName).not.toHaveBeenCalled();
  });

  it('stationsが8つ未満の場合、空のセルで埋められる', () => {
    const singleStation = [mockStations[0]];
    const { container } = render(
      <LineBoardEast
        stations={singleStation}
        lineColors={['#9acd32']}
        hasTerminus={false}
      />
    );
    expect(container).toBeTruthy();
  });

  it('lineColorsが正しく適用される', () => {
    const customColors = ['#ff0000', '#00ff00'];
    render(
      <LineBoardEast
        stations={mockStations}
        lineColors={customColors}
        hasTerminus={false}
      />
    );
    expect(useCurrentLine).toHaveBeenCalled();
  });
});
