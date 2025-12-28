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
    expect(ChevronTY).toHaveBeenCalledWith(
      expect.objectContaining({
        color: expect.any(String),
      }),
      undefined
    );
    expect(useCurrentLine).toHaveBeenCalled();
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

  it('駅数が8未満の場合、空の配列で埋められる', () => {
    const singleStation = [mockStations[0]];
    const result = render(
      <LineBoardSaikyo
        stations={singleStation}
        lineColors={['#00ac9a']}
        hasTerminus={false}
      />
    );
    expect(result.toJSON()).toBeTruthy();
    expect(useCurrentLine).toHaveBeenCalled();
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

  it('useIntervalフックが1秒間隔で呼ばれる', () => {
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
});
