import { ImuStopTrial } from './imuStopTrial';

const sample = (i: number) => {
  const x = i < 40 ? 0 : i < 60 ? 0.5 : Math.sin(i * 1.1) * 0.7;
  return {
    timeMs: i * 100,
    acceleration: { x, y: 0, z: 0 },
    accelerationIncludingGravity: { x, y: 0, z: 9.81 },
    rotationDegPerSecond: 0,
  };
};

test('frozen stop score uses only trailing samples and keeps the missing-field reference', () => {
  const trial = new ImuStopTrial();
  for (let i = 0; i < 240; i++) trial.step(sample(i));
  trial.addField(24500, 50); // Delivered before the motion callback but acquired later.
  const score = trial.step(sample(240));
  expect(score?.stopProbability).toBeCloseTo(0.1337398884185849, 12);
  expect(score).toMatchObject({
    baseline: 'running',
    magnetic: 'running',
    magneticSd: null,
    vetoEvidence: false,
  });
  expect(trial.step(sample(240))).toBeNull();
  expect(trial.step(sample(251))).toBeNull(); // missing 1 s of motion
});

test('sustained stop evidence changes only the reference while the field is active', () => {
  jest.isolateModules(() => {
    jest.doMock('../../assets/imu/stop-forest.json', () => ({
      sourceSha256: 'test',
      trees: [[[1]]],
    }));
    try {
      const { ImuStopTrial: Trial } =
        jest.requireActual<typeof import('./imuStopTrial')>('./imuStopTrial');
      const trial = new Trial();
      for (let i = 0; i < 250; i++) {
        trial.addField(i * 100, 20 + 12 * (i % 2));
        trial.step(sample(i));
      }
      trial.addField(25000, 20);
      expect(trial.step(sample(250))).toMatchObject({
        baseline: 'stop',
        magnetic: 'running',
        vetoEvidence: true,
      });
      // After field updates cease, the same frozen score can confirm both arms.
      let last: ReturnType<ImuStopTrial['step']> = null;
      for (let i = 251; i <= 275; i++) last = trial.step(sample(i)) ?? last;
      expect(last).toMatchObject({
        magnetic: 'stop',
        magneticSd: null,
        vetoEvidence: false,
      });
    } finally {
      jest.dontMock('../../assets/imu/stop-forest.json');
    }
  });
});

test('a sample just beyond the upper edge of a feature window follows the training clock', () => {
  const trial = new ImuStopTrial();
  let last: ReturnType<ImuStopTrial['step']> = null;
  const now = 260.371803;
  for (let i = 0; i <= 240; i++) {
    // Multiplying the observation and the cutoff by 1000 before subtracting
    // rounds them onto the same side of the five-second boundary.
    const seconds = i === 190 ? 255.37180300000003 : now + (i - 240) * 0.1;
    const amplitude = i <= 190 ? 1 : 0.2;
    const x = i === 190 ? 2 : (((i * 13) % 17) / 17) * amplitude;
    last = trial.step({
      timeMs: seconds * 1000,
      acceleration: { x, y: 0, z: 0 },
      accelerationIncludingGravity: { x, y: 0, z: 9.81 },
      rotationDegPerSecond: 0,
    });
  }
  // Frozen scikit-learn forest applied to the same native timestamps.
  expect(last?.stopProbability).toBeCloseTo(0.19436220501187185, 12);
});

test.each([
  { quietUntil: 250, referenceAt: 26200, guardedAt: 28100 },
  { quietUntil: 262, referenceAt: 27300, guardedAt: 27300 },
])(
  'restart after a stop with the phone quiet until tick $quietUntil',
  ({ quietUntil, referenceAt, guardedAt }) => {
    jest.isolateModules(() => {
      jest.doMock('../../assets/imu/stop-forest.json', () => ({
        sourceSha256: 'test',
        trees: [[[1]]],
      }));
      try {
        const { ImuStopTrial: Trial } =
          jest.requireActual<typeof import('./imuStopTrial')>('./imuStopTrial');
        const trial = new Trial();
        let referenceRestart: number | null = null;
        let guardedRestart: number | null = null;
        for (let i = 0; i <= 285; i++) {
          const x = (i >= 5 && i <= 22) || i > quietUntil ? 0.6 : 0;
          const outcome = trial.step({
            ...sample(i),
            acceleration: { x, y: 0, z: 0 },
            accelerationIncludingGravity: { x, y: 0, z: 9.81 },
          });
          if (i === 250)
            expect(outcome).toMatchObject({
              baseline: 'stop',
              guardedRestart: 'stop',
            });
          if (i <= 250 || !outcome) continue;
          if (outcome.baseline === 'running')
            referenceRestart ??= outcome.timeMs;
          if (outcome.guardedRestart === 'running')
            guardedRestart ??= outcome.timeMs;
        }
        expect(referenceRestart).toBe(referenceAt);
        expect(guardedRestart).toBe(guardedAt);
      } finally {
        jest.dontMock('../../assets/imu/stop-forest.json');
      }
    });
  }
);
