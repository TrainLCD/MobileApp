export function generateTrainSpeedProfile({
  distance, // 駅間距離（m）
  maxSpeed, // 最大速度（m/s）
  accel = 1.0, // 加速度（m/s^2）
  decel = 1.5, // 減速度（m/s^2）
  interval = 0.1, // シミュレーション刻み秒数（小さめで滑らか）
}: {
  distance: number;
  maxSpeed: number;
  accel?: number;
  decel?: number;
  interval?: number;
}) {
  const tAccel = maxSpeed / accel;
  const dAccel = 0.5 * accel * tAccel ** 2;

  const tDecel = maxSpeed / decel;
  const dDecel = 0.5 * decel * tDecel ** 2;

  const dCruise = distance - (dAccel + dDecel);

  const speedProfile: number[] = [];

  if (dCruise > 0) {
    // 台形プロファイル：加速 → 巡航 → 減速
    const tCruise = dCruise / maxSpeed;

    for (let t = 0; t < tAccel; t += interval) {
      speedProfile.push(accel * t); // 加速フェーズ
    }

    for (let t = 0; t < tCruise; t += interval) {
      speedProfile.push(maxSpeed); // 巡航フェーズ
    }

    for (let t = 0; t < tDecel; t += interval) {
      speedProfile.push(maxSpeed - decel * t); // 減速フェーズ
    }

    speedProfile.push(0); // ← ここで停止を明示
  } else {
    // 三角プロファイル：加速してすぐ減速（maxSpeedに到達しない）
    const Vpeak = Math.sqrt((2 * accel * decel * distance) / (accel + decel));
    const tAccelPeak = Vpeak / accel;
    const tDecelPeak = Vpeak / decel;

    for (let t = 0; t < tAccelPeak; t += interval) {
      speedProfile.push(accel * t); // 加速
    }

    for (let t = 0; t < tDecelPeak; t += interval) {
      speedProfile.push(Vpeak - decel * t); // 減速
    }

    speedProfile.push(0); // ← ここで停止を明示
  }

  return speedProfile; // m/s 単位の速度のリスト
}
