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
  const errSub = emitter.addListener('GnssError', (e: { error?: string }) => {
    console.warn('[GNSS] Error event received:', e?.error);
  });
  const sub = emitter.addListener('GnssStatus', onUpdate);
  GnssModule.startGnssUpdates();
  return () => {
    sub.remove();
    errSub.remove();
    GnssModule.stopGnssUpdates();
  };
}
