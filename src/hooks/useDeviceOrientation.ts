import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect, useState } from 'react';

export const useDeviceOrientation = () => {
  const [orientation, setOrientation] =
    useState<ScreenOrientation.Orientation | null>(null);

  useEffect(() => {
    const subscription = ScreenOrientation.addOrientationChangeListener(
      (event) => {
        setOrientation(event.orientationInfo.orientation);
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  return orientation;
};
