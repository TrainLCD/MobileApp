import type { Station, TrainTypeNested } from '~/@types/graphql';
import { TrainTypeKind } from '~/@types/graphql';
import {
  getStationLineId,
  getStationPrimaryCode,
  isSameStationShallow,
} from './station';

jest.mock('~/translation', () => ({
  isJapanese: true,
}));

jest.mock('./trainTypeString', () => ({
  getIsLocal: jest.fn(),
}));

import { getIsLocal } from './trainTypeString';

const mockGetIsLocal = getIsLocal as jest.MockedFunction<typeof getIsLocal>;

const createMockStation = (overrides: Partial<Station> = {}): Station =>
  ({
    __typename: 'StationNested',
    id: 1,
    name: '東京',
    nameRoman: 'Tokyo',
    stationNumbers: [
      {
        __typename: 'StationNumber',
        stationNumber: 'JY01',
        lineSymbol: 'JY',
        lineSymbolColor: '#80C241',
        lineSymbolShape: 'round',
      },
    ],
    line: {
      __typename: 'LineNested',
      id: 100,
      name: '山手線',
      nameRoman: 'Yamanote Line',
    },
    trainType: null,
    ...overrides,
  }) as Station;

const createMockTrainType = (
  overrides: Partial<TrainTypeNested> = {}
): TrainTypeNested =>
  ({
    __typename: 'TrainTypeNested',
    id: 1,
    name: '快速',
    nameRoman: 'Rapid',
    kind: TrainTypeKind.Rapid,
    ...overrides,
  }) as TrainTypeNested;

describe('getStationPrimaryCode', () => {
  beforeEach(() => {
    mockGetIsLocal.mockReset();
  });

  describe('when from station is null', () => {
    it('should return empty string when both are null', () => {
      mockGetIsLocal.mockReturnValue(true);
      expect(getStationPrimaryCode(null, null)).toBe('');
    });

    it('should return empty string when from is null', () => {
      mockGetIsLocal.mockReturnValue(true);
      const to = createMockStation();
      expect(getStationPrimaryCode(null, to)).toBe('');
    });
  });

  describe('when both stations are local (getIsLocal returns true for both)', () => {
    beforeEach(() => {
      mockGetIsLocal.mockReturnValue(true);
    });

    it('should return only the station number', () => {
      const from = createMockStation();
      const to = createMockStation({
        id: 2,
        name: '渋谷',
        nameRoman: 'Shibuya',
      });
      expect(getStationPrimaryCode(from, to)).toBe('JY01');
    });

    it('should return empty string when stationNumbers is empty', () => {
      const from = createMockStation({ stationNumbers: [] });
      const to = createMockStation();
      expect(getStationPrimaryCode(from, to)).toBe('');
    });

    it('should return empty string when stationNumbers is null', () => {
      const from = createMockStation({ stationNumbers: null });
      const to = createMockStation();
      expect(getStationPrimaryCode(from, to)).toBe('');
    });

    it('should return empty string when stationNumber is null', () => {
      const from = createMockStation({
        stationNumbers: [
          {
            __typename: 'StationNumber',
            stationNumber: null,
            lineSymbol: 'JY',
            lineSymbolColor: null,
            lineSymbolShape: null,
          },
        ],
      });
      const to = createMockStation();
      expect(getStationPrimaryCode(from, to)).toBe('');
    });
  });

  describe('when either station is not local', () => {
    it('should return station number with train type when from is not local', () => {
      mockGetIsLocal
        .mockReturnValueOnce(false) // from
        .mockReturnValueOnce(true); // to
      const trainType = createMockTrainType({
        name: '快速',
        nameRoman: 'Rapid',
      });
      const from = createMockStation({ trainType });
      const to = createMockStation();
      expect(getStationPrimaryCode(from, to)).toBe('JY01 快速');
    });

    it('should return station number with train type when to is not local', () => {
      mockGetIsLocal
        .mockReturnValueOnce(true) // from
        .mockReturnValueOnce(false); // to
      const trainType = createMockTrainType({
        name: '快速',
        nameRoman: 'Rapid',
      });
      const from = createMockStation({ trainType });
      const to = createMockStation();
      expect(getStationPrimaryCode(from, to)).toBe('JY01 快速');
    });

    it('should return station number with train type when both are not local', () => {
      mockGetIsLocal.mockReturnValue(false);
      const trainType = createMockTrainType({
        name: '快速',
        nameRoman: 'Rapid',
      });
      const from = createMockStation({ trainType });
      const to = createMockStation({ trainType });
      expect(getStationPrimaryCode(from, to)).toBe('JY01 快速');
    });

    it('should return only station number when trainType is null', () => {
      mockGetIsLocal.mockReturnValue(false);
      const from = createMockStation({ trainType: null });
      const to = createMockStation({ trainType: null });
      expect(getStationPrimaryCode(from, to)).toBe('JY01');
    });

    it('should return only station number when trainType.name is null', () => {
      mockGetIsLocal.mockReturnValue(false);
      const trainType = createMockTrainType({ name: null });
      const from = createMockStation({ trainType });
      const to = createMockStation({ trainType });
      expect(getStationPrimaryCode(from, to)).toBe('JY01');
    });

    it('should handle empty stationNumbers with trainType', () => {
      mockGetIsLocal.mockReturnValue(false);
      const trainType = createMockTrainType({ name: '快速' });
      const from = createMockStation({ stationNumbers: [], trainType });
      const to = createMockStation({ trainType });
      expect(getStationPrimaryCode(from, to)).toBe('快速');
    });
  });
});

describe('getStationPrimaryCode (English locale)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('should return station number with train type nameRoman in English', () => {
    jest.doMock('~/translation', () => ({
      isJapanese: false,
    }));
    jest.doMock('./trainTypeString', () => ({
      getIsLocal: jest.fn().mockReturnValue(false),
    }));

    const { getStationPrimaryCode: getCode } = require('./station');
    const trainType = createMockTrainType({ name: '快速', nameRoman: 'Rapid' });
    const from = createMockStation({ trainType });
    const to = createMockStation({ trainType });
    expect(getCode(from, to)).toBe('JY01 Rapid');
  });

  afterEach(() => {
    jest.resetModules();
  });
});

describe('getStationName', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  describe('when locale is Japanese', () => {
    beforeEach(() => {
      jest.doMock('~/translation', () => ({
        isJapanese: true,
      }));
    });

    it('should return the Japanese name', () => {
      const { getStationName: getName } = require('./station');
      const station = createMockStation({ name: '東京', nameRoman: 'Tokyo' });
      expect(getName(station)).toBe('東京');
    });

    it('should return empty string when name is null', () => {
      const { getStationName: getName } = require('./station');
      const station = createMockStation({ name: null, nameRoman: 'Tokyo' });
      expect(getName(station)).toBe('');
    });

    it('should return empty string when station is undefined', () => {
      const { getStationName: getName } = require('./station');
      expect(getName(undefined)).toBe('');
    });
  });

  describe('when locale is English', () => {
    beforeEach(() => {
      jest.doMock('~/translation', () => ({
        isJapanese: false,
      }));
    });

    it('should return the Roman name', () => {
      const { getStationName: getName } = require('./station');
      const station = createMockStation({ name: '東京', nameRoman: 'Tokyo' });
      expect(getName(station)).toBe('Tokyo');
    });

    it('should return empty string when nameRoman is null', () => {
      const { getStationName: getName } = require('./station');
      const station = createMockStation({ name: '東京', nameRoman: null });
      expect(getName(station)).toBe('');
    });

    it('should return empty string when station is undefined', () => {
      const { getStationName: getName } = require('./station');
      expect(getName(undefined)).toBe('');
    });
  });

  afterEach(() => {
    jest.resetModules();
  });
});

describe('getStationLineId', () => {
  it('should return line id when station has a line', () => {
    const station = createMockStation({
      line: { __typename: 'LineNested', id: 123 } as Station['line'],
    });
    expect(getStationLineId(station)).toBe(123);
  });

  it('should return undefined when station is undefined', () => {
    expect(getStationLineId(undefined)).toBeUndefined();
  });

  it('should return undefined when line is null', () => {
    const station = createMockStation({ line: null });
    expect(getStationLineId(station)).toBeUndefined();
  });

  it('should return undefined when line is undefined', () => {
    const station = createMockStation({ line: undefined });
    expect(getStationLineId(station)).toBeUndefined();
  });

  it('should return undefined when line.id is null (nullish coalescing)', () => {
    const station = createMockStation({
      line: { __typename: 'LineNested', id: null } as Station['line'],
    });
    // The function uses ?? undefined, so null becomes undefined
    expect(getStationLineId(station)).toBeUndefined();
  });
});

describe('isSameStationShallow', () => {
  describe('when comparing defined stations', () => {
    it('should return true when all properties match', () => {
      const stationA = createMockStation({
        id: 1,
        name: '東京',
        nameRoman: 'Tokyo',
        line: { __typename: 'LineNested', id: 100 } as Station['line'],
      });
      const stationB = createMockStation({
        id: 1,
        name: '東京',
        nameRoman: 'Tokyo',
        line: { __typename: 'LineNested', id: 100 } as Station['line'],
      });
      expect(isSameStationShallow(stationA, stationB)).toBe(true);
    });

    it('should return false when ids differ', () => {
      const stationA = createMockStation({ id: 1 });
      const stationB = createMockStation({ id: 2 });
      expect(isSameStationShallow(stationA, stationB)).toBe(false);
    });

    it('should return false when line ids differ', () => {
      const stationA = createMockStation({
        line: { __typename: 'LineNested', id: 100 } as Station['line'],
      });
      const stationB = createMockStation({
        line: { __typename: 'LineNested', id: 200 } as Station['line'],
      });
      expect(isSameStationShallow(stationA, stationB)).toBe(false);
    });

    it('should return false when names differ', () => {
      const stationA = createMockStation({ name: '東京' });
      const stationB = createMockStation({ name: '渋谷' });
      expect(isSameStationShallow(stationA, stationB)).toBe(false);
    });

    it('should return false when nameRoman differs', () => {
      const stationA = createMockStation({ nameRoman: 'Tokyo' });
      const stationB = createMockStation({ nameRoman: 'Shibuya' });
      expect(isSameStationShallow(stationA, stationB)).toBe(false);
    });

    it('should return true when both stations have null line', () => {
      const stationA = createMockStation({ line: null });
      const stationB = createMockStation({ line: null });
      expect(isSameStationShallow(stationA, stationB)).toBe(true);
    });
  });

  describe('when comparing undefined/null stations', () => {
    it('should return true when both are undefined', () => {
      expect(isSameStationShallow(undefined, undefined)).toBe(true);
    });

    it('should return false when only first is undefined', () => {
      const station = createMockStation();
      expect(isSameStationShallow(undefined, station)).toBe(false);
    });

    it('should return false when only second is undefined', () => {
      const station = createMockStation();
      expect(isSameStationShallow(station, undefined)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle stations with null properties', () => {
      const stationA = createMockStation({
        id: null,
        name: null,
        nameRoman: null,
        line: null,
      });
      const stationB = createMockStation({
        id: null,
        name: null,
        nameRoman: null,
        line: null,
      });
      expect(isSameStationShallow(stationA, stationB)).toBe(true);
    });

    it('should return false when one has null id and other has value', () => {
      const stationA = createMockStation({ id: null });
      const stationB = createMockStation({ id: 1 });
      expect(isSameStationShallow(stationA, stationB)).toBe(false);
    });

    it('should return true for same station reference', () => {
      const station = createMockStation();
      expect(isSameStationShallow(station, station)).toBe(true);
    });
  });
});
