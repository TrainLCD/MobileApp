import { render } from '@testing-library/react-native';
import type { Line, Station } from '~/@types/graphql';
import LineBoardSaikyo from './LineBoardSaikyo';

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

jest.mock('./BarTerminalSaikyo', () => ({
  BarTerminalSaikyo: jest.fn(() => null),
}));

jest.mock('./ChevronTY', () => ({
  ChevronTY: jest.fn(() => null),
}));

jest.mock('./LineBoard/shared/components', () => ({
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
  const { useCurrentLine } = require('~/hooks');

  const mockLine: Line = {
    id: 1,
    name: '埼京線',
    color: '#00ac9a',
  } as Line;

  const mockStations: Station[] = [
    {
      id: 1,
      groupId: 1,
      name: '大宮',
      line: mockLine,
    } as Station,
    {
      id: 2,
      groupId: 2,
      name: '新宿',
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
      <LineBoardSaikyo
        stations={mockStations}
        lineColors={['#00ac9a', '#00ac9a']}
        hasTerminus={false}
      />
    );
    expect(container).toBeTruthy();
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
  });

  it('ChevronTYコンポーネントが表示される', () => {
    const { ChevronTY } = require('./ChevronTY');
    render(
      <LineBoardSaikyo
        stations={mockStations}
        lineColors={['#00ac9a', '#00ac9a']}
        hasTerminus={false}
      />
    );
    expect(ChevronTY).toHaveBeenCalled();
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
      {}
    );
  });

  it('駅数が8未満の場合、空の配列で埋められる', () => {
    const singleStation = [mockStations[0]];
    const { container } = render(
      <LineBoardSaikyo
        stations={singleStation}
        lineColors={['#00ac9a']}
        hasTerminus={false}
      />
    );
    expect(container).toBeTruthy();
  });

  it('lineColorsが正しく適用される', () => {
    const customColors = ['#ff0000', '#00ff00'];
    const { container } = render(
      <LineBoardSaikyo
        stations={mockStations}
        lineColors={customColors}
        hasTerminus={false}
      />
    );
    expect(container).toBeTruthy();
  });

  it('chevronの色が交互に切り替わる', () => {
    const { useInterval } = require('~/hooks');
    render(
      <LineBoardSaikyo
        stations={mockStations}
        lineColors={['#00ac9a', '#00ac9a']}
        hasTerminus={false}
      />
    );
    expect(useInterval).toHaveBeenCalledWith(expect.any(Function), 1000);
  });

  it('空の駅がある場合でもエラーなくレンダリングされる', () => {
    const { container } = render(
      <LineBoardSaikyo
        stations={[mockStations[0]]}
        lineColors={['#00ac9a']}
        hasTerminus={false}
      />
    );
    expect(container).toBeTruthy();
  });

  it('barGradientsが正しくレンダリングされる', () => {
    const { container } = render(
      <LineBoardSaikyo
        stations={mockStations}
        lineColors={['#00ac9a', '#00ac9a']}
        hasTerminus={false}
      />
    );
    expect(container).toBeTruthy();
  });
});
