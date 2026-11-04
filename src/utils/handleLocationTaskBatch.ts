import type * as Location from 'expo-location';
import { handleTrackingLocation } from './handleTrackingLocation';
import { beginLocationDelivery } from './locationDeliveryDiagnostics';

/** Preserve the task's last-item-only policy and account for the other samples. */
export const handleLocationTaskBatch = (
  locations: Location.LocationObject[]
): void => {
  const latest = locations[locations.length - 1];
  for (const location of locations.slice(0, -1)) {
    beginLocationDelivery(location, 'task')('not-selected');
  }
  if (latest) handleTrackingLocation(latest, 'task');
};
