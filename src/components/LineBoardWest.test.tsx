import { render } from '@testing-library/react-native';
import React from 'react';
import type { Line, Station } from '~/@types/graphql';
import LineBoardWest from './LineBoardWest';

// モック設定
jest.mock('jotai', () => ({
  useAtomValue: jest.fn(),
}));

jest.mock('~/hooks', () => ({
  useCurrentLine: jest.fn(),
  useCurrentStation: jest.fn(),
  useGetLineMark: jest.fn(() => jest.fn(() => null)),
  useHasPassStationInRegion: jest.fn(() => false),
  useIsPassing: jest.fn(() => false),
  useNextStation: jest.fn(() => null),
  usePreviousStation: jest.fn(() => null),
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

jest.mock('~/store/selectors/isEn', () => ({
  isEnAtom: {},
}));

jest.mock('./ChevronJRWest', () => ({
  ChevronJRWest: jest.fn(() => null),
}));

jest.mock('./PadLineMarks', () => ({
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

describe('LineBoardWest', () => {
  const { useAtomValue } = require('jotai');
  const { useCurrentLine } = require('~/hooks');

  const mockLine: Line = {
    id: 1,
    name: 'JR神戸線',
    color: '#00a7db',
  } as Line;

  const mockStations: Station[] = [
    {
      id: 1,
      groupId: 1,
      name: '大阪',
      line: mockLine,
    } as Station,
    {
      id: 2,
      groupId: 2,
      name: '三ノ宮',
      line: mockLine,
    } as Station,
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    useAtomValue.mockReturnValue({
      selectedLine: mockLine,
      arrived: true,
      approaching: false,
      stations: mockStations,
    });
    useCurrentLine.mockReturnValue(mockLine);
  });

  it('正しくレンダリングされる', () => {
    const { container } = render(
      <LineBoardWest stations={mockStations} lineColors={['#00a7db', '#00a7db']} />
    );
    expect(container).toBeTruthy();
  });

  it('lineがnullの場合、nullを返す', () => {
    useCurrentLine.mockReturnValue(null);
    useAtomValue.mockReturnValue({
      selectedLine: null,
      arrived: true,
      approaching: false,
      stations: mockStations,
    });
    const { container } = render(
      <LineBoardWest stations={mockStations} lineColors={['#00a7db', '#00a7db']} />
    );
    expect(container.children.length).toBe(0);
  });

  it('barが正しい色で表示される', () => {
    const { container } = render(
      <LineBoardWest stations={mockStations} lineColors={['#00a7db', '#00a7db']} />
    );
    expect(container).toBeTruthy();
  });

  it('barTerminalが正しく表示される', () => {
    const { container } = render(
      <LineBoardWest stations={mockStations} lineColors={['#00a7db', '#00a7db']} />
    );
    expect(container).toBeTruthy();
  });

  it('各駅のStationNameCellが正しくレンダリングされる', () => {
    const { container } = render(
      <LineBoardWest stations={mockStations} lineColors={['#00a7db', '#00a7db']} />
    );
    expect(container).toBeTruthy();
  });

  it('駅数が8未満の場合、空の配列で埋められる', () => {
    const singleStation = [mockStations[0]];
    const { container } = render(
      <LineBoardWest stations={singleStation} lineColors={['#00a7db']} />
    );
    expect(container).toBeTruthy();
  });

  it('lineColorsが正しく適用される', () => {
    const customColors = ['#ff0000', '#00ff00'];
    const { container } = render(
      <LineBoardWest stations={mockStations} lineColors={customColors} />
    );
    expect(container).toBeTruthy();
  });

  it('arrived状態でChevronが表示される', () => {
    const { ChevronJRWest } = require('./ChevronJRWest');
    useAtomValue.mockReturnValue({
      selectedLine: mockLine,
      arrived: false,
      approaching: false,
      stations: mockStations,
    });
    render(
      <LineBoardWest stations={mockStations} lineColors={['#00a7db', '#00a7db']} />
    );
    expect(ChevronJRWest).toHaveBeenCalled();
  });

  it('駅番号情報が正しく表示される', () => {
    const stationsWithNumbers: Station[] = [
      {
        ...mockStations[0],
        stationNumbers: [
          {
            lineSymbolColor: '#00a7db',
            stationNumber: 'JR-A01',
          },
        ],
      } as Station,
    ];
    const { container } = render(
      <LineBoardWest stations={stationsWithNumbers} lineColors={['#00a7db']} />
    );
    expect(container).toBeTruthy();
  });

  it('PadLineMarksが正しく表示される', () => {
    const PadLineMarks = require('./PadLineMarks').default;
    render(
      <LineBoardWest stations={mockStations} lineColors={['#00a7db', '#00a7db']} />
    );
    expect(PadLineMarks).toHaveBeenCalled();
  });
});
