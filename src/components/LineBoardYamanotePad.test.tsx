import { render } from '@testing-library/react-native';
import type { Line, Station } from '~/@types/graphql';
import LineBoardYamanotePad from './LineBoardYamanotePad';

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
  useCurrentTrainType: jest.fn(() => null),
  useDisplayCurrentStation: jest.fn(),
  useEstimateArrivalTimes: jest.fn(() => ({ route: null })),
  useEstimatedMinutesByStationId: jest.fn(() => new Map()),
  useGetLineMark: jest.fn(() => jest.fn(() => null)),
  useNextStation: jest.fn(() => null),
  useStationNumberIndexFunc: jest.fn(() => jest.fn(() => 0)),
  useTransferLines: jest.fn(() => []),
}));

jest.mock('~/utils/isPass', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

jest.mock('~/store/selectors/isEn', () => ({
  isEnAtom: {},
}));

jest.mock('./PadArch', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: jest.fn(() => <View testID="PadArch" />),
  };
});

describe('LineBoardYamanotePad', () => {
  const { useAtomValue } = require('jotai');
  const { useCurrentLine, useDisplayCurrentStation, useNextStation } =
    require('~/hooks');
  const { selectedLineAtom } = require('~/store/atoms/line');
  const { arrivedAtom } = require('~/store/atoms/station');
  const { isEnAtom } = require('~/store/selectors/isEn');
  const PadArch = require('./PadArch').default;

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
      stationNumbers: [
        {
          lineSymbolColor: '#9acd32',
          stationNumber: 'JY-01',
        },
      ],
    } as unknown as Station,
    {
      id: 2,
      groupId: 2,
      name: '有楽町',
      line: mockLine,
      stationNumbers: [
        {
          lineSymbolColor: '#9acd32',
          stationNumber: 'JY-02',
        },
      ],
    } as unknown as Station,
    {
      id: 3,
      groupId: 3,
      name: '新橋',
      line: mockLine,
      stationNumbers: [
        {
          lineSymbolColor: '#9acd32',
          stationNumber: 'JY-03',
        },
      ],
    } as unknown as Station,
  ];

  // 渡されたatomの同一性で読み出し値を出し分ける
  const setAtomValues = ({
    arrived = true,
    selectedLine = mockLine,
    isEn = false,
  }: {
    arrived?: boolean;
    selectedLine?: Line | null;
    isEn?: boolean;
  } = {}) => {
    useAtomValue.mockImplementation((a: unknown) => {
      if (a === arrivedAtom) return arrived;
      if (a === selectedLineAtom) return selectedLine;
      if (a === isEnAtom) return isEn;
      return undefined;
    });
  };

  beforeEach(() => {
    setAtomValues();
    useCurrentLine.mockReturnValue(mockLine);
    useNextStation.mockReturnValue(mockStations[1]);
    useDisplayCurrentStation.mockReturnValue(mockStations[0]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('正しくレンダリングされる', () => {
    const result = render(<LineBoardYamanotePad stations={mockStations} />);
    expect(PadArch).toHaveBeenCalled();
    expect(result.toJSON()).toBeTruthy();
  });

  it('PadArchコンポーネントが呼び出される', () => {
    render(<LineBoardYamanotePad stations={mockStations} />);
    expect(PadArch).toHaveBeenCalled();
  });

  it('lineがnullの場合、nullを返す', () => {
    useCurrentLine.mockReturnValue(null);
    setAtomValues({ selectedLine: null });
    const result = render(<LineBoardYamanotePad stations={mockStations} />);
    expect(result.toJSON()).toBeNull();
  });

  it('arrived=trueの場合、正しい駅数がPadArchに渡される', () => {
    setAtomValues({ arrived: true });
    render(<LineBoardYamanotePad stations={mockStations} />);
    const callArgs = PadArch.mock.calls[0][0];
    expect(callArgs.arrived).toBe(true);
    expect(callArgs.line).toBe(mockLine);
    expect(callArgs.stations).toHaveLength(6);
    const definedStations = callArgs.stations.filter(
      (s: Station | undefined) => s !== undefined
    );
    expect(definedStations).toHaveLength(mockStations.length);
  });

  it('arrived=falseの場合、駅数が1つ減らされる', () => {
    setAtomValues({ arrived: false });
    render(<LineBoardYamanotePad stations={mockStations} />);
    const callArgs = PadArch.mock.calls[0][0];
    expect(callArgs.arrived).toBe(false);
    expect(callArgs.stations).toHaveLength(6);
    const definedStations = callArgs.stations.filter(
      (s: Station | undefined) => s !== undefined
    );
    expect(definedStations).toHaveLength(mockStations.length - 1);
  });

  it('numberingInfoが正しく生成される', () => {
    render(<LineBoardYamanotePad stations={mockStations} />);
    expect(PadArch).toHaveBeenCalledWith(
      expect.objectContaining({
        numberingInfo: expect.any(Array),
      }),
      undefined
    );
  });

  it('lineMarksが正しく生成される', () => {
    render(<LineBoardYamanotePad stations={mockStations} />);
    expect(PadArch).toHaveBeenCalledWith(
      expect.objectContaining({
        lineMarks: expect.any(Array),
      }),
      undefined
    );
  });

  it('isEnプロップが正しく渡される', () => {
    setAtomValues({ isEn: true });
    render(<LineBoardYamanotePad stations={mockStations} />);
    expect(PadArch).toHaveBeenCalledWith(
      expect.objectContaining({
        isEn: true,
      }),
      undefined
    );
  });

  it('archStationsが最大6駅になる', () => {
    const manyStations = Array.from({ length: 10 }, (_, i) => ({
      id: i,
      groupId: i,
      name: `駅${i}`,
      line: mockLine,
    })) as Station[];

    render(<LineBoardYamanotePad stations={manyStations} />);
    expect(PadArch).toHaveBeenCalled();
    const callArgs = PadArch.mock.calls[0][0];
    expect(callArgs.stations).toHaveLength(6);
  });

  it('estimatedMinutesByStationIdがPadArchへ渡される', () => {
    const { useEstimatedMinutesByStationId } = require('~/hooks');
    const mockMap = new Map([[2, 5]]);
    useEstimatedMinutesByStationId.mockReturnValueOnce(mockMap);

    render(<LineBoardYamanotePad stations={mockStations} />);
    expect(PadArch).toHaveBeenCalledWith(
      expect.objectContaining({
        estimatedMinutesByStationId: mockMap,
      }),
      undefined
    );
  });

  it('transferLinesが正しく渡される', () => {
    const { useTransferLines } = require('~/hooks');
    const mockTransferLines = [
      { __typename: 'Line', id: 2, nameShort: '中央線', color: '#f00' },
    ] as Line[];
    useTransferLines.mockReturnValue(mockTransferLines);

    render(<LineBoardYamanotePad stations={mockStations} />);
    expect(PadArch).toHaveBeenCalledWith(
      expect.objectContaining({
        transferLines: mockTransferLines,
      }),
      undefined
    );
  });
});
