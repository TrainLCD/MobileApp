import forest from '../../assets/imu/stop-forest.json';
import { ImuShadowEstimator, type MotionSample } from './imuShadow';

export const STOP_MODEL_ID = forest.sourceSha256;
const FIELD_CUTOFF = 1.4281582368892662;
const featureWindows = [
  [2000, 0],
  [5000, 2000],
  [8000, 5000],
  [15000, 8000],
  [24000, 15000],
] as const;
const floors = [0.04, 0.04, 1, 0.04, 0.04, 0.04, 1, 0.04, 0.04];
type Frame = { t: number; signals: number[]; horizontal: number[] };
type Field = { timeMs: number; magnitude: number };
export type StopTrialPhase = 'waiting' | 'running' | 'stop';
export type StopTrialObservation = {
  timeMs: number;
  baseline: StopTrialPhase;
  magnetic: StopTrialPhase;
  stopProbability: number | null;
  magneticSd: number | null;
  vetoEvidence: boolean;
};

const mean = (values: number[]) =>
  values.reduce((sum, v) => sum + v, 0) / values.length;
const sd = (values: number[]) => {
  const center = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - center) ** 2)));
};
const quantile = (values: number[], fraction: number) => {
  values.sort((a, b) => a - b);
  const i = (values.length - 1) * fraction;
  return (
    values[Math.floor(i)] +
    (i % 1) * (values[Math.ceil(i)] - values[Math.floor(i)])
  );
};

function probability(frames: Frame[], now: number): number | null {
  const chunks: number[][] = [];
  for (const [far, near] of featureWindows) {
    const rows = frames.filter(
      (row) => row.t >= now - far && row.t <= now - near
    );
    if (rows.length < 2) return null;
    const columns = [0, 1, 2, 3].map((i) => rows.map((row) => row.signals[i]));
    chunks.push([
      ...columns.map((column) => quantile([...column], 0.5)),
      ...columns.map(sd),
      Math.hypot(
        ...[0, 1, 2].map((i) => mean(rows.map((row) => row.horizontal[i])))
      ),
    ]);
  }
  const reference = floors.map((_, i) =>
    mean(chunks.slice(2).map((row) => row[i]))
  );
  // sklearn casts the feature matrix to float32 before comparing with each split.
  const features = chunks.flatMap((row) =>
    row.map((value, i) =>
      Math.fround(Math.log((value + floors[i]) / (reference[i] + floors[i])))
    )
  );
  let sum = 0;
  for (const tree of forest.trees) {
    let index = 0;
    while (tree[index].length > 1) {
      const [feature, threshold, right] = tree[index];
      index = features[feature] <= threshold ? index + 1 : right;
    }
    sum += tree[index][0];
  }
  return sum / forest.trees.length;
}

// Only the accelerating phase is used. The distance is a placeholder required
// by the existing departure detector, matching the continuous replay.
const departureDetector = () =>
  new ImuShadowEstimator({
    distanceM: 1500,
    etaSeconds: null,
    fromId: 0,
    toId: 1,
    missingPairs: [],
  });

class ConfirmedStop {
  phase: StopTrialPhase = 'waiting';
  private detector = departureDetector();
  private runningSince = 0;
  private aboveSince: number | null = null;
  private lastScoreAt = Number.NEGATIVE_INFINITY;

  step(sample: MotionSample, p: number | null, veto: boolean) {
    const t = sample.timeMs;
    if (this.phase !== 'running') {
      const { phase } = this.detector.step(sample);
      if (phase === 'invalid') this.detector = departureDetector();
      if (phase === 'accelerating') {
        this.runningSince = t;
        this.phase = 'running';
      }
    }
    if (p == null) return;
    if (t - this.lastScoreAt > 800) this.aboveSince = null;
    this.lastScoreAt = t;
    if (
      this.phase !== 'running' ||
      p < 0.65 ||
      (veto && this.runningSince <= t - 2000)
    ) {
      this.aboveSince = null;
      return;
    }
    this.aboveSince ??= t;
    if (t - this.aboveSince >= 1000) {
      this.phase = 'stop';
      this.aboveSince = null;
      this.detector = departureDetector();
    }
  }
}

export class ImuStopTrial {
  private frames: Frame[] = [];
  private field: Field[] = [];
  private previous: MotionSample | null = null;
  private nextScore = Number.NEGATIVE_INFINITY;
  private baseline = new ConfirmedStop();
  private magnetic = new ConfirmedStop();

  addField(timeMs: number, magnitude: number) {
    if (
      !Number.isFinite(timeMs) ||
      !Number.isFinite(magnitude) ||
      timeMs <= (this.field.at(-1)?.timeMs ?? Number.NEGATIVE_INFINITY)
    )
      return false;
    this.field.push({ timeMs, magnitude });
    while (this.field.length && this.field[0].timeMs < timeMs - 3000)
      this.field.shift();
    return true;
  }

  step(sample: MotionSample): StopTrialObservation | null {
    const t = sample.timeMs;
    if (!Number.isFinite(t) || (this.previous && t <= this.previous.timeMs))
      return null;
    const a = sample.acceleration;
    const total = sample.accelerationIncludingGravity;
    const rotation = sample.rotationDegPerSecond;
    const gravity = a && [total.x - a.x, total.y - a.y, total.z - a.z];
    const norm = gravity && Math.hypot(...gravity);
    if (
      !a ||
      !gravity ||
      !norm ||
      rotation == null ||
      ![norm, rotation, a.x, a.y, a.z].every(Number.isFinite)
    ) {
      this.frames = [];
      this.previous = null;
      this.nextScore = Number.NEGATIVE_INFINITY;
      return null;
    }
    if (!this.previous) {
      this.nextScore = t + 24000;
    }
    const up = gravity.map((v) => v / norm);
    const vertical = a.x * up[0] + a.y * up[1] + a.z * up[2];
    const horizontal = [a.x, a.y, a.z].map((v, i) => v - vertical * up[i]);
    const last = this.previous?.acceleration ?? a;
    const change = Math.hypot(a.x - last.x, a.y - last.y, a.z - last.z);
    this.frames.push({
      t,
      horizontal,
      signals: [
        Math.hypot(...horizontal),
        Math.abs(vertical),
        rotation,
        change,
      ],
    });
    this.previous = sample;
    while (this.frames.length && this.frames[0].t < t - 24000)
      this.frames.shift();

    let p: number | null = null;
    let magneticSd: number | null = null;
    let veto = false;
    if (t >= this.nextScore) {
      this.nextScore = t + 450;
      // Follow the frozen replay cadence across gaps. A feature window is
      // usable again once it no longer spans a gap between observations.
      if (
        this.frames.every(
          (frame, i) => i === 0 || frame.t - this.frames[i - 1].t <= 500
        )
      ) {
        p = probability(this.frames, t);
      }
      const field = this.field.filter(
        (f) => f.timeMs >= t - 2000 && f.timeMs <= t
      );
      if (
        field.length >= 4 &&
        t - field[field.length - 1].timeMs <= 500 &&
        field.every(
          (f, i) => f.timeMs - (i ? field[i - 1].timeMs : t - 2000) <= 500
        )
      ) {
        magneticSd = sd(field.map((f) => f.magnitude));
        const recent = this.frames.filter((row) => row.t >= t - 2000);
        veto =
          magneticSd > FIELD_CUTOFF &&
          recent.length >= 8 &&
          quantile(
            recent.map((row) => row.signals[2]),
            0.9
          ) <= 15;
      }
    }
    const baseline = this.baseline.phase;
    const magnetic = this.magnetic.phase;
    this.baseline.step(sample, p, false);
    this.magnetic.step(sample, p, veto);
    if (
      p == null &&
      baseline === this.baseline.phase &&
      magnetic === this.magnetic.phase
    )
      return null;
    return {
      timeMs: t,
      baseline: this.baseline.phase,
      magnetic: this.magnetic.phase,
      stopProbability: p,
      magneticSd,
      vetoEvidence: veto,
    };
  }
}
