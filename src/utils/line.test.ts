import type { Line, Station } from '~/@types/graphql';
import {
  LineType,
  OperationStatus,
  StopCondition,
  TransportType,
} from '~/@types/graphql';
import {
  filterBusLinesForNonBusStation,
  filterWithoutCurrentLine,
  getCurrentStationLinesWithoutCurrentLine,
  getNextStationLinesWithoutCurrentLine,
  isBusLine,
} from './line';

const createLine = (id: number, nameKatakana: string): Line => ({
  __typename: 'Line',
  averageDistance: null,
  color: '#123456',
  company: null,
  id,
  lineSymbols: [],
  lineType: LineType.Normal,
  nameChinese: null,
  nameFull: `Line${id}`,
  nameKatakana,
  nameKorean: null,
  nameRoman: `Line${id}`,
  nameShort: `L${id}`,
  station: null,
  status: OperationStatus.InOperation,
  trainType: null,
  transportType: TransportType.Rail,
});

const createStation = (id: number, lines: Line[]): Station => ({
  __typename: 'Station',
  address: null,
  closedAt: null,
  distance: null,
  groupId: id,
  hasTrainTypes: false,
  id,
  latitude: 35.681236,
  longitude: 139.767125,
  line: {
    __typename: 'LineNested',
    averageDistance: null,
    color: '#123456',
    company: null,
    id: 1,
    lineSymbols: [],
    lineType: LineType.Normal,
    nameChinese: null,
    nameFull: 'Test Line',
    nameKatakana: 'テストライン',
    nameKorean: null,
    nameRoman: 'Test Line',
    nameShort: 'Test',
    station: null,
    status: OperationStatus.InOperation,
    trainType: null,
    transportType: null,
  },
  lines: lines as unknown as Station['lines'],
  name: `Station${id}`,
  nameChinese: null,
  nameKatakana: `ステーション${id}`,
  nameKorean: null,
  nameRoman: `Station${id}`,
  openedAt: null,
  postalCode: null,
  prefectureId: null,
  stationNumbers: [],
  status: OperationStatus.InOperation,
  stopCondition: StopCondition.All,
  threeLetterCode: null,
  trainType: null,
  transportType: null,
});

describe('isBusLine', () => {
  it('should return true for Bus transport type', () => {
    expect(isBusLine({ transportType: TransportType.Bus })).toBe(true);
  });

  it('should return false for Rail transport type', () => {
    expect(isBusLine({ transportType: TransportType.Rail })).toBe(false);
  });

  it('should return false for RailAndBus transport type', () => {
    expect(isBusLine({ transportType: TransportType.RailAndBus })).toBe(false);
  });

  it('should return false for TransportTypeUnspecified', () => {
    expect(
      isBusLine({ transportType: TransportType.TransportTypeUnspecified })
    ).toBe(false);
  });

  it('should return false for null', () => {
    expect(isBusLine(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isBusLine(undefined)).toBe(false);
  });

  it('should return false for null transportType', () => {
    expect(isBusLine({ transportType: null })).toBe(false);
  });
});

describe('filterBusLinesForNonBusStation', () => {
  const railLine = { transportType: TransportType.Rail };
  const busLine = { transportType: TransportType.Bus };
  const railAndBusLine = { transportType: TransportType.RailAndBus };

  it('should filter out bus lines when current line is rail', () => {
    const lines = [railLine, busLine, railAndBusLine];
    const result = filterBusLinesForNonBusStation(railLine, lines);
    expect(result).toEqual([railLine, railAndBusLine]);
  });

  it('should keep all lines when current line is bus', () => {
    const lines = [railLine, busLine, railAndBusLine];
    const result = filterBusLinesForNonBusStation(busLine, lines);
    expect(result).toEqual([railLine, busLine, railAndBusLine]);
  });

  it('should filter out bus lines when current line is RailAndBus', () => {
    const lines = [railLine, busLine, railAndBusLine];
    const result = filterBusLinesForNonBusStation(railAndBusLine, lines);
    expect(result).toEqual([railLine, railAndBusLine]);
  });

  it('should return empty array when lines is null', () => {
    const result = filterBusLinesForNonBusStation(railLine, null);
    expect(result).toEqual([]);
  });

  it('should return empty array when lines is undefined', () => {
    const result = filterBusLinesForNonBusStation(railLine, undefined);
    expect(result).toEqual([]);
  });

  it('should filter out bus lines when current line is null', () => {
    const lines = [railLine, busLine, railAndBusLine];
    const result = filterBusLinesForNonBusStation(null, lines);
    expect(result).toEqual([railLine, railAndBusLine]);
  });

  it('should filter out bus lines when current line is undefined', () => {
    const lines = [railLine, busLine, railAndBusLine];
    const result = filterBusLinesForNonBusStation(undefined, lines);
    expect(result).toEqual([railLine, railAndBusLine]);
  });

  it('should return empty array when both current line and lines are null', () => {
    const result = filterBusLinesForNonBusStation(null, null);
    expect(result).toEqual([]);
  });

  it('should keep only rail lines from mixed array when current is rail', () => {
    const lines = [busLine, busLine, railLine];
    const result = filterBusLinesForNonBusStation(railLine, lines);
    expect(result).toEqual([railLine]);
  });

  it('should return all bus lines when current line is bus', () => {
    const lines = [busLine, busLine, busLine];
    const result = filterBusLinesForNonBusStation(busLine, lines);
    expect(result).toEqual([busLine, busLine, busLine]);
  });
});

describe('filterWithoutCurrentLine', () => {
  const line1 = createLine(1, 'ライン1');
  const line2 = createLine(2, 'ライン2');
  const line3 = createLine(3, 'ライン3');

  it('currentLineがnullの場合、空配列を返す', () => {
    const stations = [createStation(1, [line1, line2])];
    const result = filterWithoutCurrentLine(stations, null, 0);
    expect(result).toEqual([]);
  });

  it('stationIndexが範囲外の場合、空配列を返す', () => {
    const stations = [createStation(1, [line1, line2])];
    const result = filterWithoutCurrentLine(stations, line1, 5);
    expect(result).toEqual([]);
  });

  it('currentStationがundefinedの場合、空配列を返す', () => {
    const stations: Station[] = [];
    const result = filterWithoutCurrentLine(stations, line1, 0);
    expect(result).toEqual([]);
  });

  it('現在の路線を除外した路線リストを返す', () => {
    const stations = [createStation(1, [line1, line2, line3])];
    const result = filterWithoutCurrentLine(stations, line1, 0);
    expect(result).toEqual([line2, line3]);
  });

  it('同じnameKatakanaの路線も除外する', () => {
    const line1Copy = createLine(100, 'ライン1'); // 同じnameKatakana
    const stations = [createStation(1, [line1, line1Copy, line2])];
    const result = filterWithoutCurrentLine(stations, line1, 0);
    expect(result).toEqual([line2]);
  });

  it('駅にlinesがundefinedの場合、空配列を返す', () => {
    const station = createStation(1, []);
    station.lines = undefined;
    const stations = [station];
    const result = filterWithoutCurrentLine(stations, line1, 0);
    expect(result).toEqual([]);
  });

  it('駅にlinesがnullの場合、空配列を返す', () => {
    const station = createStation(1, []);
    station.lines = null;
    const stations = [station];
    const result = filterWithoutCurrentLine(stations, line1, 0);
    expect(result).toEqual([]);
  });
});

describe('getCurrentStationLinesWithoutCurrentLine', () => {
  const line1 = createLine(1, 'ライン1');
  const line2 = createLine(2, 'ライン2');

  it('最初の駅（index=0）の路線を返す', () => {
    const stations = [
      createStation(1, [line1, line2]),
      createStation(2, [line1]),
    ];
    const result = getCurrentStationLinesWithoutCurrentLine(stations, line1);
    expect(result).toEqual([line2]);
  });

  it('空の駅配列の場合、空配列を返す', () => {
    const result = getCurrentStationLinesWithoutCurrentLine([], line1);
    expect(result).toEqual([]);
  });
});

describe('getNextStationLinesWithoutCurrentLine', () => {
  const line1 = createLine(1, 'ライン1');
  const line2 = createLine(2, 'ライン2');
  const line3 = createLine(3, 'ライン3');

  it('2番目の駅（index=1）の路線を返す（デフォルト）', () => {
    const stations = [
      createStation(1, [line1]),
      createStation(2, [line1, line2, line3]),
    ];
    const result = getNextStationLinesWithoutCurrentLine(stations, line1);
    expect(result).toEqual([line2, line3]);
  });

  it('forceStationIndexを指定した場合、その駅の路線を返す', () => {
    const stations = [
      createStation(1, [line1]),
      createStation(2, [line1, line2]),
      createStation(3, [line1, line3]),
    ];
    const result = getNextStationLinesWithoutCurrentLine(stations, line1, 2);
    expect(result).toEqual([line3]);
  });

  it('forceStationIndex=0を指定した場合、最初の駅の路線を返す', () => {
    const stations = [
      createStation(1, [line1, line2]),
      createStation(2, [line1, line3]),
    ];
    const result = getNextStationLinesWithoutCurrentLine(stations, line1, 0);
    expect(result).toEqual([line2]);
  });

  it('駅が1つしかない場合、空配列を返す', () => {
    const stations = [createStation(1, [line1, line2])];
    const result = getNextStationLinesWithoutCurrentLine(stations, line1);
    expect(result).toEqual([]);
  });
});
