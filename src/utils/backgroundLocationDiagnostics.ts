import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import type { NativeLocationSample } from './locationDeliveryDiagnostics';

export type BackgroundLocationDiagnosticEvent = {
  event: string;
  atMs: number;
  uptimeMs: number;
  [key: string]: string | number | boolean | null;
};

export type NativeBackgroundLocationDiagnostics = {
  schemaVersion: 1 | 2;
  scope: 'process';
  capturedAtMs: number;
  /** Event counts since process start; absent keys mean no such event. */
  counts: Record<string, number>;
  lastEvents: Record<string, BackgroundLocationDiagnosticEvent>;
  recentEvents: BackgroundLocationDiagnosticEvent[];
  /** Present in native schema 2; absent on the earlier diagnostic binary. */
  historyLimit?: number;
  currentConsumers?: Record<string, string | number | boolean | null>[];
  receivedSampleCount?: number;
  dispatchedSampleCount?: number;
  receivedSamples?: NativeLocationSample[];
  dispatchedSamples?: NativeLocationSample[];
};

export type BackgroundLocationDiagnostics =
  | { availability: 'available'; native: NativeBackgroundLocationDiagnostics }
  | {
      availability: 'unavailable';
      reason:
        | 'unsupported-platform'
        | 'native-method-missing'
        | 'read-failed'
        | 'read-timeout';
    };

type DiagnosticLocationModule = {
  getTrainLCDBackgroundDiagnosticsAsync?: () => Promise<NativeBackgroundLocationDiagnostics>;
};

/** Read on demand: no polling or additional location subscription. */
export const getBackgroundLocationDiagnostics =
  async (): Promise<BackgroundLocationDiagnostics> => {
    if (Platform.OS !== 'ios') {
      return { availability: 'unavailable', reason: 'unsupported-platform' };
    }
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const nativeModule =
        requireOptionalNativeModule<DiagnosticLocationModule>('ExpoLocation');
      // OTA updates may run on a binary without the new native bridge. Do not
      // present this as zero requests, or prevent the rest of the dump being copied.
      if (!nativeModule?.getTrainLCDBackgroundDiagnosticsAsync) {
        return { availability: 'unavailable', reason: 'native-method-missing' };
      }
      // Bound this optional read so a stalled native bridge cannot block the
      // entire diagnostic dump. Late settlement must not overwrite the copy.
      return await Promise.race<BackgroundLocationDiagnostics>([
        nativeModule.getTrainLCDBackgroundDiagnosticsAsync().then((native) => ({
          availability: 'available' as const,
          native,
        })),
        new Promise<BackgroundLocationDiagnostics>((resolve) => {
          timeout = setTimeout(() => {
            resolve({ availability: 'unavailable', reason: 'read-timeout' });
          }, 3000);
        }),
      ]);
    } catch {
      return { availability: 'unavailable', reason: 'read-failed' };
    } finally {
      if (timeout !== undefined) clearTimeout(timeout);
    }
  };
