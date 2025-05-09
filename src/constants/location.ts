import * as Location from 'expo-location';

export const LOCATION_TASK_NAME = 'trainlcd-background-location-task';
export const LOCATION_ACCURACY = Location.Accuracy.BestForNavigation;
export const LOCATION_DISTANCE_INTERVAL = 50;

export const MAX_PERMIT_ACCURACY = 2000;

export const LOCATION_TASK_OPTIONS: Location.LocationOptions = {
  accuracy: LOCATION_ACCURACY,
  distanceInterval: LOCATION_DISTANCE_INTERVAL,
} as const;
