// __tests__/useSimulationMode.test.ts
import { generateTrainSpeedProfile } from '~/utils/trainSpeed';

describe('generateTrainSpeedProfile', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns a non-empty array with only non-negative speeds', () => {
    const profile = generateTrainSpeedProfile({
      distance: 1500,
      maxSpeed: 25,
      enableRandomCoast: false,
    });

    expect(profile.length).toBeGreaterThan(0);
    expect(typeof profile[0]).toBe('number');
    expect(profile.every((v) => v >= 0)).toBe(true);
  });

  it('短距離では maxSpeed に到達しない', () => {
    const profile = generateTrainSpeedProfile({
      distance: 100,
      maxSpeed: 30,
      accel: 1,
      decel: 1,
      enableRandomCoast: false,
    });

    expect(Math.max(...profile)).toBeLessThan(30);
  });

  it('enableRandomCoast=false なら惰行を入れない', () => {
    const profile = generateTrainSpeedProfile({
      distance: 1500,
      maxSpeed: 25,
      enableRandomCoast: false,
    });

    expect(profile[profile.length - 1]).toBeGreaterThan(0);
    expect(profile.some((v) => v === 25)).toBe(true);
  });

  it('惰行が有効な場合は最高速度以降で速度が低下する区間を作る', () => {
    jest
      .spyOn(Math, 'random')
      .mockImplementationOnce(() => 0.3) // enable coasting
      .mockImplementationOnce(() => 0.1) // coastingDecel
      .mockImplementationOnce(() => 0.5); // tCoast

    const profile = generateTrainSpeedProfile({
      distance: 1500,
      maxSpeed: 25,
      enableRandomCoast: true,
    });

    const start = profile.findIndex((v) => v === 25);
    const coastSegment = profile.slice(start, start + 5);
    expect(coastSegment).toEqual([...coastSegment].sort((a, b) => b - a));
  });

  it('does not throw with short distance', () => {
    const profile = generateTrainSpeedProfile({
      distance: 100,
      maxSpeed: 15,
      enableRandomCoast: false,
    });

    expect(Array.isArray(profile)).toBe(true);
    expect(profile.every((v) => v >= 0)).toBe(true);
  });

  it('ensures speed does not exceed maxSpeed during coasting', () => {
    const profile = generateTrainSpeedProfile({
      distance: 1000,
      maxSpeed: 30,
      enableRandomCoast: true,
    });
    const overSpeed = profile.some((v) => v > 30);
    expect(overSpeed).toBe(false);
  });

  it('不正な入力は停止状態のみを返す', () => {
    const profile = generateTrainSpeedProfile({
      distance: 0,
      maxSpeed: 25,
    });

    expect(profile).toEqual([0]);
  });

  it('距離に対して極端に乖離したプロファイルにならない', () => {
    const profile = generateTrainSpeedProfile({
      distance: 1500,
      maxSpeed: 25,
      enableRandomCoast: false,
    });
    const approxDistance = profile.reduce((sum, speed) => sum + speed, 0);

    expect(approxDistance).toBeGreaterThan(1000);
    expect(approxDistance).toBeLessThan(2000);
  });

  it('0km/h は速度プロファイルに含めない', () => {
    const profile = generateTrainSpeedProfile({
      distance: 1500,
      maxSpeed: 25,
      enableRandomCoast: false,
    });

    expect(profile.some((v) => v === 0)).toBe(false);
  });
});
