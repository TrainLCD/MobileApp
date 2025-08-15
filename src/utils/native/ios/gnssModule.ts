import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

const { GnssModule } = NativeModules;

export type GnssState = {
  usedInFix?: number;
  total?: number;
  meanCn0DbHz?: number;
  maxCn0DbHz?: number;
  constellations?: string[];
};

export function subscribeGnss(onUpdate: (g: GnssState) => void) {
  if (Platform.OS !== 'android' || !GnssModule) return () => {};
  const emitter = new NativeEventEmitter(GnssModule);
  GnssModule.startGnssUpdates();
  const sub = emitter.addListener('GnssStatus', onUpdate);
  return () => {
    sub.remove();
    GnssModule.stopGnssUpdates();
  };
}
