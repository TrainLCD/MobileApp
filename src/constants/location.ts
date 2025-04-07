import * as Location from 'expo-location';

export const LOCATION_TASK_NAME = 'trainlcd-background-location-task';
export const LOCATION_ACCURACY = Location.Accuracy.High;
export const LOCATION_TIME_INTERVAL = 5000;
export const LOCATION_DISTANCE_INTERVAL = 50;

export const LOCATION_TASK_OPTIONS: Location.LocationOptions = {
  accuracy: LOCATION_ACCURACY,
  timeInterval: LOCATION_TIME_INTERVAL,
  distanceInterval: LOCATION_DISTANCE_INTERVAL,
};
