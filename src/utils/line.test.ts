import { TransportType } from '~/@types/graphql';
import { filterBusLinesForNonBusStation, isBusLine } from './line';

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
