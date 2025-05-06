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
  const rng = Math.random();

  // 惰行の有無とパラメータをランダムで決定
  const hasCoast = enableRandomCoast && rng < 0.5; // 50%の確率で惰行
  const coastingDecel = hasCoast ? 0.2 + Math.random() * 0.3 : 0;
  const tCoast = hasCoast ? 10 + Math.floor(Math.random() * 20) : 0;
  const vAfterCoast = maxSpeed - coastingDecel * tCoast;
  const dCoast = hasCoast ? ((maxSpeed + vAfterCoast) / 2) * tCoast : 0;

  const tAccel = maxSpeed / accel;
  const dAccel = 0.5 * accel * tAccel ** 2;

  const tDecel = vAfterCoast / decel;
  const dDecel = 0.5 * decel * tDecel ** 2;

  const dCruise = distance - (dAccel + dCoast + dDecel);
  const tCruise = dCruise > 0 ? dCruise / vAfterCoast : 0;

  const speedProfile: number[] = [];

  for (let t = 0; t < tAccel; t += interval) {
    speedProfile.push(accel * t);
  }

  if (hasCoast) {
    for (let t = 0; t < tCoast; t += interval) {
      speedProfile.push(maxSpeed - coastingDecel * t);
    }
  }

  for (let t = 0; t < tCruise; t += interval) {
    speedProfile.push(vAfterCoast);
  }

  for (let t = 0; t < tDecel; t += interval) {
    speedProfile.push(Math.max(0, vAfterCoast - decel * t));
  }

  speedProfile.push(0);

  return speedProfile;
}
