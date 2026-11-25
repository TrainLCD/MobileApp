/** Experimental only. No access to the production location or arrival atoms. */
export type Vector = { x: number; y: number; z: number };
export type RouteStop = {
  stationId?: number | null;
  stationGroupId?: number | null;
  stopsHere?: boolean | null;
  cumulativeMinutes?: number | null;
  departureCumulativeMinutes?: number | null;
};
export type Leg = {
  fromId: number;
  toId: number;
  toAliases?: number[];
  distanceM: number | null;
  etaSeconds: number | null;
  missingPairs: [number | null, number | null][];
};

const samePhysicalStop = (a: RouteStop, b: RouteStop): boolean =>
  (a.stationId != null && a.stationId === b.stationId) ||
  (a.stationGroupId != null && a.stationGroupId === b.stationGroupId);

/** Use ETA's direction-ordered, unfiltered stops, including passing stations. */
export const buildLeg = (
  stops: readonly RouteStop[],
  fromIndex: number,
  getDistance: (a: number, b: number) => number | null
): { leg: Leg; nextIndex: number } | null => {
  const from = stops[fromIndex];
  if (from?.stationId == null || from.stopsHere !== true) {
    return null;
  }
  // A through-service or connected route can list both line-specific IDs of a
  // junction. The outgoing row owns the departure ETA and the next track pair.
  let departureIndex = fromIndex;
  while (
    departureIndex + 1 < stops.length &&
    samePhysicalStop(stops[departureIndex], stops[departureIndex + 1])
  ) {
    departureIndex += 1;
  }
  const nextIndex = stops.findIndex(
    (stop, i) => i > departureIndex && stop.stopsHere === true
  );
  const to = stops[nextIndex];
  if (to?.stationId == null) {
    return null;
  }
  const missingPairs: Leg['missingPairs'] = [];
  let sum = 0;
  for (let i = departureIndex + 1; i <= nextIndex; i += 1) {
    if (samePhysicalStop(stops[i - 1], stops[i])) {
      continue;
    }
    const a = stops[i - 1].stationId ?? null;
    const b = stops[i].stationId ?? null;
    const d = a != null && b != null ? getDistance(a, b) : null;
    if (d == null || !Number.isFinite(d) || d <= 0) {
      missingPairs.push([a, b]);
    } else {
      sum += d;
    }
  }
  const departure = stops[departureIndex];
  const minutes =
    to.cumulativeMinutes != null && departure.departureCumulativeMinutes != null
      ? to.cumulativeMinutes - departure.departureCumulativeMinutes
      : null;
  const toAliases: number[] = [];
  for (
    let i = nextIndex + 1;
    i < stops.length && samePhysicalStop(to, stops[i]);
    i += 1
  ) {
    const id = stops[i].stationId;
    if (id != null && id !== to.stationId && !toAliases.includes(id)) {
      toAliases.push(id);
    }
  }
  return {
    nextIndex,
    leg: {
      fromId: from.stationId,
      toId: to.stationId,
      ...(toAliases.length ? { toAliases } : {}),
      distanceM: missingPairs.length === 0 && sum > 0 ? sum : null,
      etaSeconds:
        minutes != null && Number.isFinite(minutes) && minutes > 0
          ? minutes * 60
          : null,
      missingPairs,
    },
  };
};

export type MotionSample = {
  timeMs: number;
  acceleration: Vector | null;
  accelerationIncludingGravity: Vector;
  rotationDegPerSecond: number | null;
  rotation?: { alpha: number; beta: number; gamma: number };
};
export type Phase =
  | 'waiting'
  | 'accelerating'
  | 'cruising'
  | 'braking'
  | 'stopped'
  | 'invalid';
export type Estimate = {
  phase: Phase;
  reason: string | null;
  distanceM: number;
  imuDistanceM: number;
  speedMps: number;
  imuSpeedMps: number;
  sigmaM: number;
  elapsedSeconds: number | null;
  arrivalCandidate: boolean;
};

const dot = (a: Vector, b: Vector): number => a.x * b.x + a.y * b.y + a.z * b.z;
const scale = (v: Vector, n: number): Vector => ({
  x: v.x * n,
  y: v.y * n,
  z: v.z * n,
});
const add = (a: Vector, b: Vector): Vector => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: a.z + b.z,
});
const magnitude = (v: Vector): number => Math.hypot(v.x, v.y, v.z);

/** DeviceMotion provides gravity-free acceleration in m/s². Remove its vertical component. */
export const horizontalAcceleration = (sample: MotionSample): Vector | null => {
  const a = sample.acceleration;
  if (!a) {
    return null;
  }
  const g = add(sample.accelerationIncludingGravity, scale(a, -1));
  const norm = magnitude(g);
  if (
    !Number.isFinite(magnitude(a)) ||
    !Number.isFinite(norm) ||
    norm < 7 ||
    norm > 12
  ) {
    return null;
  }
  const vertical = scale(g, 1 / norm);
  return add(a, scale(vertical, -dot(a, vertical)));
};

// These are deliberately conservative, uncalibrated PoC parameters, not vehicle specifications.
const MAX_GAP_SECONDS = 0.5;
const MAX_ROTATION_DEG_PER_SECOND = 15;
const MAX_HORIZONTAL_ACCEL = 2.5;
const DEPARTURE_ACCEL = 0.3;
const DEPARTURE_SECONDS = 1;
const STOP_SECONDS = 2;
const ETA_UPDATE_SECONDS = 10;

/**
 * One-dimensional constant-acceleration Kalman prediction with a deliberately weak ETA
 * position observation. The separate IMU-only distance is never corrected by ETA.
 * A confirmed physical stop is required to construct a new estimator.
 */
export class ImuShadowEstimator {
  private lastMs: number | null = null;
  private startMs: number | null = null;
  private phase: Phase = 'waiting';
  private reason: string | null = null;
  private axis: Vector | null = null;
  private calibration: Vector = { x: 0, y: 0, z: 0 };
  private calibrationSeconds = 0;
  private filteredAccel = 0;
  private x = 0;
  private v = 0;
  private imuX = 0;
  private imuV = 0;
  private p00 = 4;
  private p01 = 0;
  private p11 = 0.04;
  private stoppedSeconds = 0;
  private sawBraking = false;
  private sawMovement = false;
  private lastEtaSeconds = 0;

  constructor(readonly leg: Leg) {
    if (
      leg.distanceM == null ||
      !Number.isFinite(leg.distanceM) ||
      leg.distanceM <= 0
    ) {
      this.invalidate('missing-distance');
    }
  }

  invalidate(reason: string): Estimate {
    this.phase = 'invalid';
    this.reason = reason;
    return this.snapshot();
  }

  snapshot(): Estimate {
    const elapsedSeconds =
      this.startMs != null && this.lastMs != null
        ? Math.max(0, (this.lastMs - this.startMs) / 1000)
        : null;
    // A low-frequency bias can accumulate much faster than white sensor noise.
    // This explicit, heuristic floor prevents the filter reporting false precision.
    const biasSigma = elapsedSeconds == null ? 0 : 0.005 * elapsedSeconds ** 2;
    const sigmaM = Math.hypot(Math.sqrt(Math.max(0, this.p00)), biasSigma);
    const length = this.leg.distanceM;
    const eta = this.leg.etaSeconds;
    const tolerance =
      length == null ? 0 : Math.min(70, Math.max(20, length * 0.08));
    return {
      phase: this.phase,
      reason: this.reason,
      distanceM: this.x,
      imuDistanceM: this.imuX,
      speedMps: this.v,
      imuSpeedMps: this.imuV,
      sigmaM,
      elapsedSeconds,
      arrivalCandidate:
        this.phase === 'stopped' &&
        this.sawMovement &&
        this.sawBraking &&
        length != null &&
        sigmaM <= tolerance &&
        Math.abs(length - this.x) <= tolerance &&
        Math.abs(length - this.imuX) <= tolerance &&
        (eta == null ||
          (elapsedSeconds != null && elapsedSeconds >= eta * 0.6)),
    };
  }

  step(sample: MotionSample): Estimate {
    if (this.phase === 'invalid') {
      return this.snapshot();
    }
    if (!Number.isFinite(sample.timeMs)) {
      return this.invalidate('invalid-time');
    }
    const previous = this.lastMs;
    if (previous != null && sample.timeMs <= previous) {
      return this.snapshot();
    }
    this.lastMs = sample.timeMs;
    if (previous == null) {
      return this.snapshot();
    }
    const dt = (sample.timeMs - previous) / 1000;
    if (dt > MAX_GAP_SECONDS) {
      return this.invalidate('sample-gap');
    }
    const a = horizontalAcceleration(sample);
    const rotation = sample.rotationDegPerSecond;
    if (!a || rotation == null || !Number.isFinite(rotation)) {
      return this.invalidate('missing-motion');
    }
    if (
      rotation > MAX_ROTATION_DEG_PER_SECOND ||
      magnitude(a) > MAX_HORIZONTAL_ACCEL
    ) {
      if (this.axis == null) {
        this.calibration = { x: 0, y: 0, z: 0 };
        this.calibrationSeconds = 0;
        return this.snapshot();
      }
      return this.invalidate('device-motion');
    }
    if (this.axis == null) {
      const norm = magnitude(a);
      // Only a sustained, consistently directed departure acceleration defines the sign.
      if (
        norm < DEPARTURE_ACCEL ||
        (this.calibrationSeconds > 0 &&
          dot(a, this.calibration) < 0.85 * norm * magnitude(this.calibration))
      ) {
        this.calibration = { x: 0, y: 0, z: 0 };
        this.calibrationSeconds = 0;
        return this.snapshot();
      }
      this.calibration = add(this.calibration, scale(a, dt));
      this.calibrationSeconds += dt;
      if (this.calibrationSeconds < DEPARTURE_SECONDS) {
        return this.snapshot();
      }
      this.axis = scale(this.calibration, 1 / magnitude(this.calibration));
      this.startMs = sample.timeMs - this.calibrationSeconds * 1000;
      this.v = magnitude(this.calibration);
      this.imuV = this.v;
      this.x = (this.v * this.calibrationSeconds) / 2;
      this.imuX = this.x;
      this.filteredAccel = this.v / this.calibrationSeconds;
      this.phase = 'accelerating';
      return this.snapshot();
    }
    const longitudinal = dot(a, this.axis);
    // Lateral movement or a change in phone orientation destroys the calibrated axis.
    if (magnitude(add(a, scale(this.axis, -longitudinal))) > 1.5) {
      return this.invalidate('transverse-motion');
    }
    this.filteredAccel +=
      (longitudinal - this.filteredAccel) * (1 - Math.exp(-dt / 0.35));
    const accel = Math.abs(this.filteredAccel) < 0.04 ? 0 : this.filteredAccel;
    // Filtering the control input delays braking relative to the calibrated departure.
    // Use the measured projection for integration and the smoothed value for phase.
    const control = Math.abs(longitudinal) < 0.04 ? 0 : longitudinal;
    const previousV = this.v;
    const previousImuV = this.imuV;
    this.v = Math.max(0, this.v + control * dt);
    this.imuV = Math.max(0, this.imuV + control * dt);
    this.x += ((previousV + this.v) * dt) / 2;
    this.imuX += ((previousImuV + this.imuV) * dt) / 2;
    // F P Fᵀ + G Q Gᵀ; acceleration noise is a tentative 0.25 m/s².
    const q = 0.25 ** 2;
    this.p00 += 2 * dt * this.p01 + dt ** 2 * this.p11 + (q * dt ** 4) / 4;
    this.p01 += dt * this.p11 + (q * dt ** 3) / 2;
    this.p11 += q * dt ** 2;
    this.sawMovement ||= this.imuV > 3;
    this.sawBraking ||= this.sawMovement && accel < -0.2;
    if (this.imuV < 0.6 && Math.abs(accel) < 0.15 && this.sawBraking) {
      this.stoppedSeconds += dt;
    } else {
      this.stoppedSeconds = 0;
    }
    this.phase =
      this.stoppedSeconds >= STOP_SECONDS
        ? 'stopped'
        : accel > 0.15
          ? 'accelerating'
          : accel < -0.15
            ? 'braking'
            : 'cruising';
    if (this.phase === 'stopped') {
      this.v = 0;
      this.imuV = 0;
    }
    const elapsed = (sample.timeMs - (this.startMs ?? sample.timeMs)) / 1000;
    const length = this.leg.distanceM;
    const eta = this.leg.etaSeconds;
    // Never move the estimate on ETA alone while waiting or stopped. ETA is not a timetable.
    if (
      length != null &&
      eta != null &&
      elapsed < eta &&
      this.imuV > 2 &&
      elapsed - this.lastEtaSeconds >= ETA_UPDATE_SECONDS
    ) {
      this.lastEtaSeconds = elapsed;
      const r = Math.max(100, length * 0.4) ** 2;
      const innovation = (length * elapsed) / eta - this.x;
      const p00 = this.p00;
      const p01 = this.p01;
      const k0 = p00 / (p00 + r);
      const k1 = p01 / (p00 + r);
      this.x = Math.max(0, this.x + k0 * innovation);
      this.v = Math.max(0, this.v + k1 * innovation);
      this.p00 = (1 - k0) * p00;
      this.p01 = (1 - k0) * p01;
      this.p11 -= k1 * p01;
    }
    return this.snapshot();
  }
}
