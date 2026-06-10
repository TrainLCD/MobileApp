import { render } from '@testing-library/react-native';
import type { Line, Station } from '~/@types/graphql';
import { StopCondition } from '~/@types/graphql';
import LineBoardLED from './LineBoardLED';

// モック設定
jest.mock('jotai', () => ({
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(),
  useAtom: jest.fn((val) => [val, jest.fn()]),
  useSetAtom: jest.fn(() => jest.fn()),
}));

jest.mock('~/hooks', () => ({
  useLandscapeWindowDimensions: jest.fn(() => ({ width: 812, height: 375 })),
  useAfterNextStation: jest.fn(),
  useBounds: jest.fn(() => ({ directionalStops: [] })),
  useCurrentLine: jest.fn(),
  useCurrentTrainType: jest.fn(() => ({ name: '普通', nameRoman: 'Local' })),
  useDisplayNextStation: jest.fn(),
  useLoopLine: jest.fn(() => ({
    isLoopLine: false,
    isPartiallyLoopLine: false,
    isMeijoLine: false,
    isOsakaLoopLine: false,
    isYamanoteLine: false,
  })),
  useNextStation: jest.fn(),
  useNumbering: jest.fn(() => [null]),
  useTransferLines: jest.fn(() => []),
}));

jest.mock('./Marquee', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: jest.fn(({ children }) => <View>{children}</View>),
  };
});

describe('LineBoardLED', () => {
  const { useAtomValue } = require('jotai');
  const {
    useCurrentLine,
    useDisplayNextStation,
    useAfterNextStation,
    useTransferLines,
    useNumbering,
  } = require('~/hooks');
  const { headerStateAtom } = require('~/store/atoms/navigation');
  const {
    selectedDirectionAtom,
    stationsAtom,
  } = require('~/store/atoms/station');
  const { isLEDThemeAtom } = require('~/store/atoms/theme');

  // 渡されたatomの同一性で読み出し値を出し分ける
  const setAtomValues = ({
    selectedDirection = null,
    headerState = 'NEXT',
  }: {
    selectedDirection?: string | null;
    headerState?: string;
  } = {}) => {
    useAtomValue.mockImplementation((a: unknown) => {
      if (a === selectedDirectionAtom) return selectedDirection;
      if (a === stationsAtom) return [];
      if (a === headerStateAtom) return headerState;
      if (a === isLEDThemeAtom) return true;
      return undefined;
    });
  };

  const mockLine: Line = {
    __typename: 'Line',
    id: 1,
    nameShort: '山手線',
    nameRoman: 'Yamanote Line',
    color: '#9acd32',
  } as Line;

  const mockNextStation: Station = {
    id: 2,
    groupId: 2,
    name: '新宿',
    nameRoman: 'Shinjuku',
    stopCondition: StopCondition.All,
  } as unknown as Station;

  const mockAfterNextStation: Station = {
    id: 3,
    groupId: 3,
    name: '渋谷',
    nameRoman: 'Shibuya',
    stationNumbers: [{ stationNumber: 'JY-20' }],
  } as unknown as Station;

  beforeEach(() => {
    setAtomValues();
    useCurrentLine.mockReturnValue(mockLine);
    useDisplayNextStation.mockReturnValue(mockNextStation);
    useAfterNextStation.mockReturnValue(mockAfterNextStation);
    useTransferLines.mockReturnValue([]);
    useNumbering.mockReturnValue([null]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('正しくレンダリングされる', () => {
    const result = render(<LineBoardLED />);
    expect(result.toJSON()).toBeTruthy();
  });

  it('ARRIVING状態でまもなく駅名が表示される', () => {
    setAtomValues({ headerState: 'ARRIVING' });

    const { getAllByText, getByText } = render(<LineBoardLED />);
    expect(getByText('まもなく')).toBeTruthy();
    expect(getAllByText('新宿').length).toBeGreaterThan(0);
    expect(getByText('です。')).toBeTruthy();
  });

  it('CURRENT状態で電車情報が表示される', () => {
    setAtomValues({ headerState: 'CURRENT' });

    const { getByText } = render(<LineBoardLED />);
    expect(getByText(/この電車は/)).toBeTruthy();
    expect(getByText(/です。/)).toBeTruthy();
  });

  it('NEXT状態で次駅情報が表示される', () => {
    const { getAllByText, getByText } = render(<LineBoardLED />);
    expect(getByText('次は')).toBeTruthy();
    expect(getAllByText('新宿').length).toBeGreaterThan(0);
  });

  it('乗り換え路線がある場合、乗り換え情報が表示される', () => {
    const transferLine = {
      id: 2,
      nameShort: '中央線',
      nameRoman: 'Chuo Line',
    } as unknown as Line;
    useTransferLines.mockReturnValue([transferLine]);

    const { getByText } = render(<LineBoardLED />);
    expect(getByText('中央線')).toBeTruthy();
    expect(getByText('はお乗り換えです。')).toBeTruthy();
  });

  it('駅番号がある場合、英語表記に駅番号が含まれる', () => {
    useNumbering.mockReturnValue([{ stationNumber: 'JY-17' }]);

    const { getAllByText } = render(<LineBoardLED />);
    expect(getAllByText(/Shinjuku/).length).toBeGreaterThan(0);
  });

  it('afterNextStationがある場合、次の次の駅情報が表示される', () => {
    const { getByText } = render(<LineBoardLED />);
    expect(getByText('渋谷')).toBeTruthy();
    expect(getByText('に停車いたします。')).toBeTruthy();
  });

  it('一部列車が通過する駅の場合、注意喚起が表示される', () => {
    useDisplayNextStation.mockReturnValue({
      ...mockNextStation,
      stopCondition: StopCondition.Partial,
    });

    const { getByText } = render(<LineBoardLED />);
    expect(getByText(/は一部列車は通過いたします。/)).toBeTruthy();
  });

  it('英語での次の駅案内が表示される', () => {
    const { getAllByText, getByText } = render(<LineBoardLED />);
    expect(getByText('The next stop is')).toBeTruthy();
    expect(getAllByText(/Shinjuku/).length).toBeGreaterThan(0);
  });

  it('山手線の場合、内回り/外回りが表示される', () => {
    const { useLoopLine } = require('~/hooks');
    useLoopLine.mockReturnValue({
      isLoopLine: false,
      isPartiallyLoopLine: false,
      isMeijoLine: false,
      isOsakaLoopLine: false,
      isYamanoteLine: true,
    });

    setAtomValues({ selectedDirection: 'INBOUND', headerState: 'CURRENT' });

    const { getAllByText } = render(<LineBoardLED />);
    expect(getAllByText(/内回り/).length).toBeGreaterThan(0);
  });
});
