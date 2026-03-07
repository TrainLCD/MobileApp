import type { Line, Station, StationNumber } from '~/@types/graphql';
import { LineType, OperationStatus, StopCondition } from '~/@types/graphql';

export const createStationNumber = (
  lineSymbol: string,
  stationNumber: string,
  overrides: Partial<StationNumber> = {}
): StationNumber => ({
  __typename: 'StationNumber',
  lineSymbol,
  lineSymbolColor: '#123456',
  lineSymbolShape: 'ROUND',
  stationNumber,
  ...overrides,
});

type StationOverrides = Partial<Omit<Station, 'line'>> & {
  line?: Partial<Station['line']>;
};

export const createStation = (
  id: number,
  overrides: StationOverrides = {}
): Station => {
  const { line: lineOverrides, ...stationOverrides } = overrides;
  return {
    __typename: 'Station',
    address: null,
    closedAt: null,
    distance: null,
    groupId: id,
    hasTrainTypes: false,
    id,
    latitude: null,
    longitude: null,
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
      ...lineOverrides,
    },
    lines: [],
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
    ...stationOverrides,
  };
};

export const createLine = (
  id: number,
  overrides: Partial<Line> = {}
): Line => ({
  __typename: 'Line',
  averageDistance: null,
  color: '#123456',
  company: null,
  id,
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
  ...overrides,
});
