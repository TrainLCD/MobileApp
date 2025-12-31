// __tests__/useSimulationMode.test.ts
import { generateTrainSpeedProfile } from '~/utils/trainSpeed';

describe('generateTrainSpeedProfile', () => {
  it('returns a non-empty array ending in 0', () => {
    const profile = generateTrainSpeedProfile({
      distance: 1500,
      maxSpeed: 25,
    });

    expect(profile.length).toBeGreaterThan(0);
    expect(typeof profile[0]).toBe('number');
    expect(profile[profile.length - 1]).toBeCloseTo(0, 1);
  });

  it('can generate profile without coasting if randomness disables it', () => {
    jest.spyOn(Math, 'random').mockImplementationOnce(() => 0.9); // no coasting
    const profile = generateTrainSpeedProfile({
      distance: 1500,
      maxSpeed: 25,
    });

    expect(profile.some((v) => v < 25)).toBe(true);
    expect(profile[profile.length - 1]).toBe(0);
  });

  it('can generate profile with coasting if randomness enables it', () => {
    const mockRandom = jest
      .spyOn(Math, 'random')
      .mockImplementationOnce(() => 0.3) // enable coasting
      .mockImplementationOnce(() => 0.1) // decel = 0.2
      .mockImplementationOnce(() => 0.5); // tCoast = 20

    const profile = generateTrainSpeedProfile({
      distance: 1500,
      maxSpeed: 25,
    });

    const start = profile.findIndex((v) => v === 25);
    const coastSegment = profile.slice(start, start + 5);
    expect(coastSegment).toEqual([...coastSegment].sort((a, b) => b - a));

    mockRandom.mockRestore();
  });

  it('does not throw with short distance', () => {
    const profile = generateTrainSpeedProfile({
      distance: 100,
      maxSpeed: 15,
    });

    expect(Array.isArray(profile)).toBe(true);
    expect(profile[profile.length - 1]).toBeCloseTo(0, 1);
  });

  it('ensures speed does not exceed maxSpeed during coasting', () => {
    const profile = generateTrainSpeedProfile({
      distance: 1000,
      maxSpeed: 30,
    });
    const overSpeed = profile.some((v) => v > 30);
    expect(overSpeed).toBe(false);
  });

  it('profile length differs with and without coasting', () => {
    jest
      .spyOn(Math, 'random')
      .mockImplementationOnce(() => 0.1)
      .mockImplementationOnce(() => 0.3)
      .mockImplementationOnce(() => 0.5);
    const withCoast = generateTrainSpeedProfile({
      distance: 1000,
      maxSpeed: 25,
    });

    jest.spyOn(Math, 'random').mockImplementation(() => 0.9);
    const withoutCoast = generateTrainSpeedProfile({
      distance: 1000,
      maxSpeed: 25,
    });

    expect(withCoast.length).not.toBe(withoutCoast.length);
  });

  it('gracefully handles tCoast = 0', () => {
    jest
      .spyOn(Math, 'random')
      .mockImplementationOnce(() => 0.1) // enable coasting
      .mockImplementationOnce(() => 0.2) // decel
      .mockImplementationOnce(() => 0.0); // tCoast = 10

    const profile = generateTrainSpeedProfile({
      distance: 1000,
      maxSpeed: 25,
    });

    expect(profile.length).toBeGreaterThan(0);
    expect(profile[profile.length - 1]).toBe(0);
  });
});
