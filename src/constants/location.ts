import * as Location from 'expo-location';

export const LOCATION_TASK_NAME = 'trainlcd-background-location-task';
export const LOCATION_ACCURACY = Location.Accuracy.Highest;
export const LOCATION_DISTANCE_INTERVAL = 0;
export const LOCATION_TIME_INTERVAL = 5000;

export const MAX_PERMIT_ACCURACY = 4000;

export const LOCATION_TASK_OPTIONS: Location.LocationTaskOptions = {
  accuracy: LOCATION_ACCURACY,
  distanceInterval: LOCATION_DISTANCE_INTERVAL,
  timeInterval: LOCATION_TIME_INTERVAL,
  deferredUpdatesInterval: LOCATION_TIME_INTERVAL,
  deferredUpdatesDistance: LOCATION_DISTANCE_INTERVAL,
  pausesUpdatesAutomatically: false,
} as const;
