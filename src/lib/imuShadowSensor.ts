import type { DeviceMotionMeasurement } from 'expo-sensors';
import { getMotionSampleTimeMs, type MotionSample } from './imuShadow';
// Keep the native dependency lazy for JS-only builds and baseline recordings.
export const loadImuShadowSensor = async () =>
  (await import('expo-sensors')).DeviceMotion;

export const readMotionSample = (
  data: DeviceMotionMeasurement
): MotionSample | null => {
  const timeMs = getMotionSampleTimeMs(data.acceleration?.timestamp);
  if (timeMs == null || !data.accelerationIncludingGravity) return null;
  return {
    timeMs,
    acceleration: data.acceleration,
    accelerationIncludingGravity: data.accelerationIncludingGravity,
    rotationDegPerSecond:
      data.rotationRate == null
        ? null
        : Math.hypot(
            data.rotationRate.alpha,
            data.rotationRate.beta,
            data.rotationRate.gamma
          ),
    rotation: data.rotation,
  };
};
