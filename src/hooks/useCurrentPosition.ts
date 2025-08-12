import { useLocationStore } from './useLocationStore';

interface Position {
  coords: {
    latitude: number;
    longitude: number;
    altitude: number | null;
    accuracy: number;
    altitudeAccuracy: number | null;
    heading: number | null;
    speed: number | null;
  };
  timestamp: number;
}

export const useCurrentPosition = (): Position | null => {
  const location = useLocationStore((state) => state.location);
  
  if (!location) {
    return null;
  }

  return {
    coords: {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      altitude: location.coords.altitude,
      accuracy: location.coords.accuracy,
      altitudeAccuracy: location.coords.altitudeAccuracy,
      heading: location.coords.heading,
      speed: location.coords.speed,
    },
    timestamp: location.timestamp,
  };
};