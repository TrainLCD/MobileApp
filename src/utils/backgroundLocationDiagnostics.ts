import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

export type BackgroundLocationDiagnosticEvent = {
  event: string;
  atMs: number;
  uptimeMs: number;
  [key: string]: string | number | boolean | null;
};

export type NativeBackgroundLocationDiagnostics = {
  schemaVersion: 1;
  scope: 'process';
  capturedAtMs: number;
  /** Event counts since process start; absent keys mean no such event. */
  counts: Record<string, number>;
  lastEvents: Record<string, BackgroundLocationDiagnosticEvent>;
  recentEvents: BackgroundLocationDiagnosticEvent[];
};

export type BackgroundLocationDiagnostics =
  | { availability: 'available'; native: NativeBackgroundLocationDiagnostics }
  | {
      availability: 'unavailable';
      reason: 'unsupported-platform' | 'native-method-missing' | 'read-failed';
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
    try {
      const nativeModule =
        requireOptionalNativeModule<DiagnosticLocationModule>('ExpoLocation');
      // OTA updates may run on a binary without the new native bridge. Do not
      // present this as zero requests, or prevent the rest of the dump being copied.
      if (!nativeModule?.getTrainLCDBackgroundDiagnosticsAsync) {
        return { availability: 'unavailable', reason: 'native-method-missing' };
      }
      const native = await nativeModule.getTrainLCDBackgroundDiagnosticsAsync();
      return { availability: 'available', native };
    } catch {
      return { availability: 'unavailable', reason: 'read-failed' };
    }
  };
