import { createStation } from '~/utils/test/factories';
import { findNearestByCoord } from './findNearestByCoord';

describe('findNearestByCoord', () => {
  it('returns undefined when lat is null', () => {
    const candidates = [createStation(1, { latitude: 35.0, longitude: 139.0 })];
    expect(findNearestByCoord(null, 139.0, candidates)).toBeUndefined();
  });

  it('returns undefined when lon is null', () => {
    const candidates = [createStation(1, { latitude: 35.0, longitude: 139.0 })];
    expect(findNearestByCoord(35.0, null, candidates)).toBeUndefined();
  });

  it('returns undefined for empty candidates', () => {
    expect(findNearestByCoord(35.0, 139.0, [])).toBeUndefined();
  });

  it('returns the single candidate', () => {
    const s = createStation(1, { latitude: 35.0, longitude: 139.0 });
    expect(findNearestByCoord(35.1, 139.1, [s])).toBe(s);
  });

  it('returns nearest station by squared distance', () => {
    const far = createStation(1, { latitude: 36.0, longitude: 140.0 });
    const near = createStation(2, { latitude: 35.01, longitude: 139.01 });
    const mid = createStation(3, { latitude: 35.5, longitude: 139.5 });
    expect(findNearestByCoord(35.0, 139.0, [far, near, mid])).toBe(near);
  });

  it('skips candidates with null coordinates', () => {
    const noCoord = createStation(1, { latitude: null, longitude: null });
    const valid = createStation(2, { latitude: 35.0, longitude: 139.0 });
    expect(findNearestByCoord(35.0, 139.0, [noCoord, valid])).toBe(valid);
  });

  it('returns undefined if all candidates lack coordinates', () => {
    const a = createStation(1, { latitude: null, longitude: null });
    const b = createStation(2, { latitude: null, longitude: null });
    expect(findNearestByCoord(35.0, 139.0, [a, b])).toBeUndefined();
  });
});
