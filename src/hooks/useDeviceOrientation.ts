import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect, useState } from 'react';

export const useDeviceOrientation =
  (): ScreenOrientation.Orientation | null => {
    const [orientation, setOrientation] =
      useState<ScreenOrientation.Orientation | null>(null);

    useEffect(() => {
      let mounted = true;
      (async () => {
        try {
          const initialOrientation =
            await ScreenOrientation.getOrientationAsync();
          if (mounted) {
            setOrientation(initialOrientation);
          }
        } catch {
          // no-op
        }
      })();

      const subscription = ScreenOrientation.addOrientationChangeListener(
        (event) => {
          const nextOrientation = event.orientationInfo.orientation;
          setOrientation((prev) =>
            prev === nextOrientation ? prev : nextOrientation
          );
        }
      );

      return () => {
        mounted = false;
        subscription.remove();
      };
    }, []);

    return orientation;
  };
