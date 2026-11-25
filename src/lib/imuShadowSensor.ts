// Keep the native dependency lazy for JS-only builds and baseline recordings.
export const loadImuShadowSensor = async () =>
  (await import('expo-sensors')).DeviceMotion;
