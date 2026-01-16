import { render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import type { Line, LineNested, Station } from '~/@types/graphql';
import { TransportType } from '~/@types/graphql';
import { createStation } from '~/utils/test/factories';
import stationState from '../store/atoms/station';
import { useTransferLinesFromStation } from './useTransferLinesFromStation';

jest.mock('jotai', () => ({
  __esModule: true,
  useAtomValue: jest.fn(),
  atom: jest.fn(),
}));

type TestComponentProps = {
  station: Station | undefined;
  options?: {
    omitRepeatingLine?: boolean;
    omitJR?: boolean;
  };
};

const TestComponent: React.FC<TestComponentProps> = ({ station, options }) => {
  const lines = useTransferLinesFromStation(station, options);
  return <Text testID="transferLines">{JSON.stringify(lines)}</Text>;
};

const createLineNested = (overrides: Partial<LineNested> = {}): LineNested => ({
  __typename: 'LineNested',
  averageDistance: null,
  color: '#123456',
  company: null,
  id: 1,
  lineSymbols: [],
  lineType: undefined,
  nameChinese: null,
  nameFull: 'Line',
  nameKatakana: 'ライン',
  nameKorean: '라인',
  nameRoman: 'Line',
  nameShort: 'Line',
  station: null,
  status: undefined,
  trainType: null,
  transportType: TransportType.Rail,
  ...overrides,
});

describe('useTransferLinesFromStation', () => {
  const mockUseAtomValue = useAtomValue as jest.MockedFunction<
    typeof useAtomValue
  >;

  let stationAtomValue: { stations: Station[] };

  beforeEach(() => {
    stationAtomValue = { stations: [] };
    mockUseAtomValue.mockImplementation((atom) => {
      if (atom === stationState) {
        return stationAtomValue;
      }
      throw new Error('unknown atom');
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('station が undefined の場合は空配列を返す', () => {
    const { getByTestId } = render(<TestComponent station={undefined} />);
    expect(getByTestId('transferLines').props.children).toBe('[]');
  });

  it('バス路線を除外する', () => {
    const currentLine = createLineNested({ id: 1, nameShort: '中央線' });
    const railLine = createLineNested({
      id: 2,
      nameShort: '山手線',
      transportType: TransportType.Rail,
    });
    const busLine = createLineNested({
      id: 3,
      nameShort: 'バス',
      transportType: TransportType.Bus,
    });
    const station = createStation(100, {
      line: currentLine,
      lines: [currentLine, railLine, busLine],
    });
    stationAtomValue.stations = [station];

    const { getByTestId } = render(<TestComponent station={station} />);
    const lines = JSON.parse(
      getByTestId('transferLines').props.children as string
    );

    expect(lines.map((l: Line) => l.id)).toEqual([2]);
    expect(lines.find((l: Line) => l.id === 3)).toBeUndefined();
  });

  it('現在路線は除外する', () => {
    const currentLine = createLineNested({ id: 1, nameShort: '中央線' });
    const otherLine = createLineNested({ id: 2, nameShort: '山手線' });
    const station = createStation(100, {
      line: currentLine,
      lines: [currentLine, otherLine],
    });
    stationAtomValue.stations = [station];

    const { getByTestId } = render(<TestComponent station={station} />);
    const lines = JSON.parse(
      getByTestId('transferLines').props.children as string
    );

    expect(lines.map((l: Line) => l.id)).toEqual([2]);
    expect(lines.find((l: Line) => l.id === 1)).toBeUndefined();
  });

  it('カッコを除いて同名の路線は除外する', () => {
    const currentLine = createLineNested({
      id: 1,
      nameShort: 'JR神戸線(大阪～神戸)',
    });
    const sameLine = createLineNested({
      id: 2,
      nameShort: 'JR神戸線(神戸～姫路)',
    });
    const otherLine = createLineNested({ id: 3, nameShort: '山手線' });
    const station = createStation(100, {
      line: currentLine,
      lines: [currentLine, sameLine, otherLine],
    });
    stationAtomValue.stations = [station];

    const { getByTestId } = render(<TestComponent station={station} />);
    const lines = JSON.parse(
      getByTestId('transferLines').props.children as string
    );

    expect(lines.map((l: Line) => l.id)).toEqual([3]);
    expect(lines.find((l: Line) => l.id === 2)).toBeUndefined();
  });

  it('omitRepeatingLine が true の場合、前後の駅に同一路線がある並走路線を除外する', () => {
    const currentLine = createLineNested({ id: 1, nameShort: '中央線' });
    const parallelLine = createLineNested({ id: 2, nameShort: '総武線' });
    const uniqueLine = createLineNested({ id: 3, nameShort: '丸ノ内線' });

    const prevStation = createStation(99, {
      line: currentLine,
      lines: [currentLine, parallelLine],
    });
    const currentStation = createStation(100, {
      line: currentLine,
      lines: [currentLine, parallelLine, uniqueLine],
    });
    const nextStation = createStation(101, {
      line: currentLine,
      lines: [currentLine, parallelLine],
    });

    stationAtomValue.stations = [prevStation, currentStation, nextStation];

    const { getByTestId } = render(
      <TestComponent
        station={currentStation}
        options={{ omitRepeatingLine: true }}
      />
    );
    const lines = JSON.parse(
      getByTestId('transferLines').props.children as string
    );

    expect(lines.map((l: Line) => l.id)).toEqual([3]);
    expect(lines.find((l: Line) => l.id === 2)).toBeUndefined();
  });

  it('omitRepeatingLine が true でも次の駅で直通運転している場合は並走路線を除外しない', () => {
    const currentLine = createLineNested({ id: 1, nameShort: '中央線' });
    const throughServiceLine = createLineNested({ id: 4, nameShort: '東西線' });
    const parallelLine = createLineNested({ id: 2, nameShort: '総武線' });

    const prevStation = createStation(99, {
      line: currentLine,
      lines: [currentLine, parallelLine],
    });
    const currentStation = createStation(100, {
      line: currentLine,
      lines: [currentLine, parallelLine],
    });
    const nextStation = createStation(101, {
      line: throughServiceLine,
      lines: [throughServiceLine, parallelLine],
    });

    stationAtomValue.stations = [prevStation, currentStation, nextStation];

    const { getByTestId } = render(
      <TestComponent
        station={currentStation}
        options={{ omitRepeatingLine: true }}
      />
    );
    const lines = JSON.parse(
      getByTestId('transferLines').props.children as string
    );

    expect(lines.map((l: Line) => l.id)).toContain(2);
  });

  it('omitJR が true で JR路線が閾値以上の場合、JR線として集約される', () => {
    const currentLine = createLineNested({ id: 1, nameShort: '丸ノ内線' });
    const jrLine1 = createLineNested({
      id: 101,
      nameShort: '山手線',
      company: {
        __typename: 'Company',
        id: 2,
        railroadId: 1,
        type: undefined,
        status: undefined,
        name: 'JR東日本',
        nameShort: 'JR東',
        nameFull: 'JR東日本',
        nameKatakana: 'ジェイアールヒガシニホン',
        nameEnglishShort: 'JR East',
        nameEnglishFull: 'JR East',
        url: undefined,
      },
    });
    const jrLine2 = createLineNested({
      id: 102,
      nameShort: '京浜東北線',
      company: {
        __typename: 'Company',
        id: 2,
        railroadId: 1,
        type: undefined,
        status: undefined,
        name: 'JR東日本',
        nameShort: 'JR東',
        nameFull: 'JR東日本',
        nameKatakana: 'ジェイアールヒガシニホン',
        nameEnglishShort: 'JR East',
        nameEnglishFull: 'JR East',
        url: undefined,
      },
    });
    const jrLine3 = createLineNested({
      id: 103,
      nameShort: '中央線',
      company: {
        __typename: 'Company',
        id: 2,
        railroadId: 1,
        type: undefined,
        status: undefined,
        name: 'JR東日本',
        nameShort: 'JR東',
        nameFull: 'JR東日本',
        nameKatakana: 'ジェイアールヒガシニホン',
        nameEnglishShort: 'JR East',
        nameEnglishFull: 'JR East',
        url: undefined,
      },
    });
    const nonJRLine = createLineNested({
      id: 200,
      nameShort: '銀座線',
      company: {
        __typename: 'Company',
        id: 100,
        railroadId: 100,
        type: undefined,
        status: undefined,
        name: '東京メトロ',
        nameShort: 'メトロ',
        nameFull: '東京メトロ',
        nameKatakana: 'トウキョウメトロ',
        nameEnglishShort: 'Tokyo Metro',
        nameEnglishFull: 'Tokyo Metro',
        url: undefined,
      },
    });

    const station = createStation(100, {
      line: currentLine,
      lines: [currentLine, jrLine1, jrLine2, jrLine3, nonJRLine],
    });
    stationAtomValue.stations = [station];

    const { getByTestId } = render(
      <TestComponent station={station} options={{ omitJR: true }} />
    );
    const lines = JSON.parse(
      getByTestId('transferLines').props.children as string
    );

    const jrUnionLine = lines.find((l: Line) => l.nameShort === 'JR線');
    expect(jrUnionLine).toBeDefined();
    expect(lines.find((l: Line) => l.id === 101)).toBeUndefined();
    expect(lines.find((l: Line) => l.id === 102)).toBeUndefined();
    expect(lines.find((l: Line) => l.id === 103)).toBeUndefined();
    expect(lines.find((l: Line) => l.nameShort === '銀座線')).toBeDefined();
  });

  it('omitJR が true でも JR路線が閾値未満の場合、個別路線が返される', () => {
    const currentLine = createLineNested({ id: 1, nameShort: '丸ノ内線' });
    const jrLine1 = createLineNested({
      id: 101,
      nameShort: '山手線',
      company: {
        __typename: 'Company',
        id: 2,
        railroadId: 1,
        type: undefined,
        status: undefined,
        name: 'JR東日本',
        nameShort: 'JR東',
        nameFull: 'JR東日本',
        nameKatakana: 'ジェイアールヒガシニホン',
        nameEnglishShort: 'JR East',
        nameEnglishFull: 'JR East',
        url: undefined,
      },
    });
    const jrLine2 = createLineNested({
      id: 102,
      nameShort: '京浜東北線',
      company: {
        __typename: 'Company',
        id: 2,
        railroadId: 1,
        type: undefined,
        status: undefined,
        name: 'JR東日本',
        nameShort: 'JR東',
        nameFull: 'JR東日本',
        nameKatakana: 'ジェイアールヒガシニホン',
        nameEnglishShort: 'JR East',
        nameEnglishFull: 'JR East',
        url: undefined,
      },
    });
    const nonJRLine = createLineNested({
      id: 200,
      nameShort: '銀座線',
      company: {
        __typename: 'Company',
        id: 100,
        railroadId: 100,
        type: undefined,
        status: undefined,
        name: '東京メトロ',
        nameShort: 'メトロ',
        nameFull: '東京メトロ',
        nameKatakana: 'トウキョウメトロ',
        nameEnglishShort: 'Tokyo Metro',
        nameEnglishFull: 'Tokyo Metro',
        url: undefined,
      },
    });

    const station = createStation(100, {
      line: currentLine,
      lines: [currentLine, jrLine1, jrLine2, nonJRLine],
    });
    stationAtomValue.stations = [station];

    const { getByTestId } = render(
      <TestComponent station={station} options={{ omitJR: true }} />
    );
    const lines = JSON.parse(
      getByTestId('transferLines').props.children as string
    );

    expect(lines.find((l: Line) => l.nameShort === 'JR線')).toBeUndefined();
    expect(lines.find((l: Line) => l.nameShort === '山手線')).toBeDefined();
    expect(lines.find((l: Line) => l.nameShort === '京浜東北線')).toBeDefined();
    expect(lines.find((l: Line) => l.nameShort === '銀座線')).toBeDefined();
  });

  it('返される路線の nameShort と nameRoman からカッコ内の文字が除去される', () => {
    const currentLine = createLineNested({ id: 1, nameShort: '中央線' });
    const lineWithParentheses = createLineNested({
      id: 2,
      nameShort: '総武線(各駅停車)',
      nameRoman: 'Sobu Line (Local)',
    });

    const station = createStation(100, {
      line: currentLine,
      lines: [currentLine, lineWithParentheses],
    });
    stationAtomValue.stations = [station];

    const { getByTestId } = render(<TestComponent station={station} />);
    const lines = JSON.parse(
      getByTestId('transferLines').props.children as string
    );

    const resultLine = lines.find((l: Line) => l.id === 2);
    expect(resultLine).toBeDefined();
    expect(resultLine.nameShort).toBe('総武線');
    expect(resultLine.nameRoman).toBe('Sobu Line ');
  });

  it('omitJR が true の場合でもカッコ内の文字が除去される', () => {
    const currentLine = createLineNested({ id: 1, nameShort: '丸ノ内線' });
    const lineWithParentheses = createLineNested({
      id: 2,
      nameShort: '銀座線(渋谷方面)',
      nameRoman: 'Ginza Line (Shibuya)',
    });

    const station = createStation(100, {
      line: currentLine,
      lines: [currentLine, lineWithParentheses],
    });
    stationAtomValue.stations = [station];

    const { getByTestId } = render(
      <TestComponent station={station} options={{ omitJR: true }} />
    );
    const lines = JSON.parse(
      getByTestId('transferLines').props.children as string
    );

    const resultLine = lines.find((l: Line) => l.id === 2);
    expect(resultLine).toBeDefined();
    expect(resultLine.nameShort).toBe('銀座線');
    expect(resultLine.nameRoman).toBe('Ginza Line ');
  });
});
