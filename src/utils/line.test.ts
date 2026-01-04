import { TransportType } from '~/@types/graphql';
import { isBusLine } from './line';

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
