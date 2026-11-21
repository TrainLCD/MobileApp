import type * as Location from 'expo-location';
import { AppState } from 'react-native';
import { z } from 'zod';

export type LocationProcessingOutcome =
  | 'accepted'
  | 'rejectedByAccuracy'
  | 'rejectedAsDuplicate'
  | 'rejectedByEta'
  | 'rejectedBySpeed';

const nativeLocationSampleSchema = z.object({
  sessionId: z.string().max(64),
  sampleId: z.string().max(32),
  taskName: z.string().max(256),
  source: z.enum(['regular', 'recovery']),
  sampleTimestampMs: z.number().finite(),
  accuracy: z.number().finite().nullable(),
  receivedAtMs: z.number().finite(),
  receivedUptimeMs: z.number().finite(),
  receivedInBackground: z.boolean(),
  dispatchedAtMs: z.number().finite().optional(),
  dispatchedUptimeMs: z.number().finite().optional(),
  dispatchedInBackground: z.boolean().optional(),
  batchSize: z.number().int().nonnegative().optional(),
  batchIndex: z.number().int().nonnegative().optional(),
});
export type NativeLocationSample = z.infer<typeof nativeLocationSampleSchema>;

type DeliveryRecord = {
  sequence: number;
  sampleTimestampMs: number | null;
  receivedAtMs: number;
  completedAtMs: number | null;
  appState: string | null;
  source: 'task' | 'watch' | 'foreground-heartbeat';
  outcome:
    | LocationProcessingOutcome
    | 'received'
    | 'not-selected'
    | 'unreported'
    | 'error';
  native: NativeLocationSample | null;
};

const LIMIT = 40;
type TaskErrorRecord = { atMs: number; code: string | number | null };
let taskErrorCount = 0;
let taskErrors: TaskErrorRecord[] = [];
export const recordLocationTaskError = (error: { code?: unknown }): void => {
  taskErrorCount++;
  taskErrors.push({
    atMs: Date.now(),
    code:
      typeof error.code === 'string'
        ? error.code.slice(0, 128)
        : typeof error.code === 'number' && Number.isFinite(error.code)
          ? error.code
          : null,
  });
  if (taskErrors.length > LIMIT) taskErrors.shift();
};
let sequence = 0;
let records: DeliveryRecord[] = [];

// Whitelist fields so native extensions cannot leak coordinates into this history.
const readNativeSample = (
  location: Location.LocationObject
): NativeLocationSample | null => {
  const value = (
    location as Location.LocationObject & {
      trainLCDDiagnostic?: NativeLocationSample;
    }
  ).trainLCDDiagnostic;
  const parsed = nativeLocationSampleSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

export const beginLocationDelivery = (
  location: Location.LocationObject,
  source: DeliveryRecord['source']
): ((outcome: DeliveryRecord['outcome']) => void) => {
  const record: DeliveryRecord = {
    sequence: ++sequence,
    sampleTimestampMs: Number.isFinite(location.timestamp)
      ? location.timestamp
      : null,
    receivedAtMs: Date.now(),
    completedAtMs: null,
    appState: AppState?.currentState ?? null,
    source,
    outcome: 'received',
    native: readNativeSample(location),
  };
  records.push(record);
  if (records.length > LIMIT) records.shift();
  return (outcome) => {
    record.outcome = outcome;
    record.completedAtMs = Date.now();
  };
};

export const getLocationDeliveryDiagnostics = () => ({
  scope: 'js-runtime' as const,
  historyLimit: LIMIT,
  taskErrorCount,
  taskErrors: taskErrors.map((error) => ({ ...error })),
  received: sequence,
  recent: records.map((record) => ({
    ...record,
    native: record.native ? { ...record.native } : null,
  })),
});

export const resetLocationDeliveryDiagnostics = (): void => {
  taskErrorCount = 0;
  taskErrors = [];
  sequence = 0;
  records = [];
};
