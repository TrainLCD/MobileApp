import { generateTrainSpeedProfile } from '~/utils/trainSpeed';

describe('generateTrainSpeedProfile', () => {
  it('should return a non-empty array of numbers', () => {
    const profile = generateTrainSpeedProfile({
      distance: 1000,
      maxSpeed: 25, // 90km/h
    });

    expect(profile.length).toBeGreaterThan(0);
    expect(profile.every((v) => typeof v === 'number')).toBe(true);
  });

  it('should reach maxSpeed in the middle for long distances (trapezoidal)', () => {
    const maxSpeed = 20;
    const profile = generateTrainSpeedProfile({
      distance: 2000,
      maxSpeed,
      accel: 1,
      decel: 1,
      interval: 1,
    });

    expect(profile.includes(maxSpeed)).toBe(true);
    const max = Math.max(...profile);
    expect(max).toBeCloseTo(maxSpeed, 1);
  });

  it('should never reach maxSpeed for short distances (triangular)', () => {
    const profile = generateTrainSpeedProfile({
      distance: 100,
      maxSpeed: 25,
      accel: 1,
      decel: 1,
      interval: 1,
    });

    const max = Math.max(...profile);
    expect(max).toBeLessThan(25);
  });

  it('should end with speed ≈ 0', () => {
    const profile = generateTrainSpeedProfile({
      distance: 500,
      maxSpeed: 20,
      accel: 2,
      decel: 2,
      interval: 1,
    });

    const last = profile[profile.length - 1];
    expect(last).toBeLessThanOrEqual(0.1);
  });

  it('should simulate smoothly with smaller intervals', () => {
    const profileFine = generateTrainSpeedProfile({
      distance: 1000,
      maxSpeed: 25,
      interval: 0.1,
    });

    const profileCoarse = generateTrainSpeedProfile({
      distance: 1000,
      maxSpeed: 25,
      interval: 1,
    });

    expect(profileFine.length).toBeGreaterThan(profileCoarse.length);
  });
});
