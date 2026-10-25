import type * as Location from 'expo-location';
import { storage } from '~/lib/storage';

// Recorded at the TaskManager entry point before accuracy/ETA/speed rejection.
// No coordinates are persisted. A bounded aggregate survives app backgrounding.
const KEY = '@TrainLCD:backgroundLocationDiagnostics';
export type BackgroundLocationStats = {
  batches: number;
  locations: number;
  lastDeliveredAtMs: number | null;
  lastFixAtMs: number | null;
  lastAccuracy: number | null;
  lastBatchSize: number;
};

const empty = (): BackgroundLocationStats => ({
  batches: 0,
  locations: 0,
  lastDeliveredAtMs: null,
  lastFixAtMs: null,
  lastAccuracy: null,
  lastBatchSize: 0,
});

export const getBackgroundLocationStats = (): BackgroundLocationStats => {
  const saved = storage.getString(KEY);
  if (!saved) return empty();
  try {
    const parsed: unknown = JSON.parse(saved);
    if (!parsed || typeof parsed !== 'object') return empty();
    const result = parsed as BackgroundLocationStats;
    return typeof result.batches === 'number' &&
      typeof result.locations === 'number'
      ? result
      : empty();
  } catch {
    return empty();
  }
};

export const recordBackgroundLocationBatch = (
  locations: Location.LocationObject[]
): void => {
  const previous = getBackgroundLocationStats();
  const latest = locations[locations.length - 1];
  storage.set(
    KEY,
    JSON.stringify({
      batches: previous.batches + 1,
      locations: previous.locations + locations.length,
      lastDeliveredAtMs: Date.now(),
      lastFixAtMs: latest?.timestamp ?? previous.lastFixAtMs,
      lastAccuracy: latest?.coords.accuracy ?? previous.lastAccuracy,
      lastBatchSize: locations.length,
    } satisfies BackgroundLocationStats)
  );
};
