import { render } from '@testing-library/react-native';
import type { Line, Station } from '~/@types/graphql';
import LineBoardEast from './LineBoardEast';

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

jest.mock('~/hooks/useAfterNextStation', () => ({
  useAfterNextStation: jest.fn(() => undefined),
}));

jest.mock('~/hooks/useDisplayNextStation', () => ({
  useDisplayNextStation: jest.fn(() => undefined),
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

jest.mock('./BarTerminalEast', () => ({
  BarTerminalEast: jest.fn(() => null),
}));

jest.mock('./ChevronTY', () => ({
  ChevronTY: jest.fn(() => null),
}));

describe('LineBoardEast', () => {
  const { useAtomValue } = require('jotai');
  const { useCurrentLine, useDisplayCurrentStation } = require('~/hooks');
  const { selectedLineAtom } = require('~/store/atoms/line');
  const { arrivedAtom } = require('~/store/atoms/station');
  const { isEnAtom } = require('~/store/selectors/isEn');

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
  });

  it('正しくレンダリングされる', () => {
    const result = render(
      <LineBoardEast
        stations={mockStations}
        lineColors={['#9acd32', '#9acd32']}
        hasTerminus={false}
      />
    );
    expect(result.toJSON()).toBeTruthy();
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
      undefined
    );
  });

  it('点滅チェブロンが表示される', () => {
    const { BlinkingChevron } = require('./LineBoard/shared/components');
    render(
      <LineBoardEast
        stations={mockStations}
        lineColors={['#9acd32', '#9acd32']}
        hasTerminus={false}
      />
    );
    expect(BlinkingChevron).toHaveBeenCalled();
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

  it('stationIdに対応するestimatedMinutesがLineDotへ渡される', () => {
    const { useEstimatedMinutesByStationId } = require('~/hooks');
    useEstimatedMinutesByStationId.mockReturnValueOnce(new Map([[2, 5]]));
    const { LineDot } = require('./LineBoard/shared/components');
    render(
      <LineBoardEast
        stations={mockStations}
        lineColors={['#9acd32', '#9acd32']}
        hasTerminus={false}
      />
    );
    expect(LineDot).toHaveBeenCalledWith(
      expect.objectContaining({ estimatedMinutes: 5 }),
      undefined
    );
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
    const result = render(
      <LineBoardEast
        stations={singleStation}
        lineColors={['#9acd32']}
        hasTerminus={false}
      />
    );
    expect(result.toJSON()).toBeTruthy();
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

  it('カスタムchevronColorPairでレンダリングされる', () => {
    const { BlinkingChevron } = require('./LineBoard/shared/components');
    render(
      <LineBoardEast
        stations={mockStations}
        lineColors={['#9acd32', '#9acd32']}
        hasTerminus={false}
        chevronColorPair={['ORANGE', 'BLUE']}
      />
    );
    // 初期色=pair[1]、切替色=pair[0]の順でBlinkingChevronへ渡される
    expect(BlinkingChevron).toHaveBeenCalledWith(
      expect.objectContaining({ colors: ['BLUE', 'ORANGE'] }),
      undefined
    );
  });

  it('chevronColorPair未指定時はデフォルトのBLUEが初期値になる', () => {
    const { BlinkingChevron } = require('./LineBoard/shared/components');
    render(
      <LineBoardEast
        stations={mockStations}
        lineColors={['#9acd32', '#9acd32']}
        hasTerminus={false}
      />
    );
    // デフォルトペア['RED','BLUE']から初期色BLUE・切替色REDの順になる
    expect(BlinkingChevron).toHaveBeenCalledWith(
      expect.objectContaining({ colors: ['BLUE', 'RED'] }),
      undefined
    );
  });
});
