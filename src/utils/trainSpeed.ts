export function generateTrainSpeedProfile({
  distance,
  maxSpeed,
  accel = 1.0,
  decel = 1.5,
  interval = 1,
  enableRandomCoast = true,
}: {
  distance: number;
  maxSpeed: number;
  accel?: number;
  decel?: number;
  interval?: number;
  enableRandomCoast?: boolean;
}) {
  if (distance <= 0 || maxSpeed <= 0 || accel <= 0 || decel <= 0) {
    return [0];
  }

  const safeInterval = interval > 0 ? interval : 1;

  // まず到達可能なピーク速度を求める（短距離では maxSpeed に到達しない）
  const reachablePeakSpeed = Math.sqrt(
    (2 * distance * accel * decel) / (accel + decel)
  );
  const peakSpeed = Math.min(maxSpeed, reachablePeakSpeed);

  const dAccel = peakSpeed ** 2 / (2 * accel);
  const tAccel = peakSpeed / accel;

  const minCoastSpeedRatio = 0.85;
  const canUseCoast = peakSpeed === maxSpeed;
  const hasCoast =
    canUseCoast &&
    enableRandomCoast &&
    (distance > 800 ? Math.random() < 0.9 : Math.random() < 0.3);

  const coastingDecel = hasCoast ? 0.1 + Math.random() * 0.2 : 0;
  const tCoast = hasCoast ? 10 + Math.floor(Math.random() * 10) : 0;
  const coastEndSpeed = hasCoast
    ? Math.max(
        peakSpeed - coastingDecel * tCoast,
        peakSpeed * minCoastSpeedRatio
      )
    : peakSpeed;

  const dCoast = hasCoast ? ((peakSpeed + coastEndSpeed) / 2) * tCoast : 0;
  const dDecelAfterCoast = coastEndSpeed ** 2 / (2 * decel);
  const dDecelNoCoast = peakSpeed ** 2 / (2 * decel);

  // 惰行を入れても距離制約を満たせない場合は惰行なしへフォールバック
  const useCoast = hasCoast && dAccel + dCoast + dDecelAfterCoast <= distance;
  const decelStartSpeed = useCoast ? coastEndSpeed : peakSpeed;
  const tDecel = decelStartSpeed / decel;
  const dDecel = useCoast ? dDecelAfterCoast : dDecelNoCoast;

  const cruiseSpeed = decelStartSpeed;
  const dCruise = Math.max(
    0,
    distance - (dAccel + (useCoast ? dCoast : 0) + dDecel)
  );
  const tCruise = cruiseSpeed > 0 ? dCruise / cruiseSpeed : 0;

  const speedProfile: number[] = [];

  for (let t = safeInterval; t <= tAccel; t += safeInterval) {
    speedProfile.push(Math.min(peakSpeed, accel * t));
  }

  if (useCoast) {
    for (let t = 0; t < tCoast; t += safeInterval) {
      speedProfile.push(Math.max(0, peakSpeed - coastingDecel * t));
    }
  }

  for (let t = 0; t < tCruise; t += safeInterval) {
    speedProfile.push(cruiseSpeed);
  }

  for (let t = 0; t < tDecel; t += safeInterval) {
    const v = Math.max(0, decelStartSpeed - decel * t);
    if (v > 0) {
      speedProfile.push(v);
    }
  }

  if (speedProfile.length === 0) {
    speedProfile.push(Math.min(peakSpeed, maxSpeed));
  }

  return speedProfile;
}
