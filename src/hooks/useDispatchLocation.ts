import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import * as Permissions from 'expo-permissions';
import { useSetRecoilState } from 'recoil';
import HMSLocation from '@hmscore/react-native-hms-location';
import locationState from '../store/atoms/location';
import gmsAvailability from '../native/gmsAvailability';

const useDispatchLocation = (): [Error] => {
  const [error, setError] = useState<Error>();
  const setLocation = useSetRecoilState(locationState);

  useEffect(() => {
    const f = async (): Promise<void> => {
      try {
        const { granted } = await Permissions.getAsync(Permissions.LOCATION);
        if (granted) {
          if (await gmsAvailability.isGMSAvailable()) {
            const locationFromGMS = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            setLocation((prev) => ({
              ...prev,
              location: locationFromGMS,
            }));
          } else {
            const requestId = 20;
            const locationRequest = {
              priority:
                HMSLocation.FusedLocation.PriorityConstants
                  .PRIORITY_HIGH_ACCURACY,
              interval: 3,
              numUpdates: 10,
              fastestInterval: 1000.0,
              expirationTime: 200000.0,
              expirationTimeDuration: 200000.0,
              smallestDisplacement: 0.0,
              maxWaitTime: 2000000.0,
              needAddress: false,
              language: 'ja',
              countryCode: 'ja',
            };
            await HMSLocation.FusedLocation.Native.requestLocationUpdates(
              requestId,
              locationRequest
            );

            const locationFromHMS = await HMSLocation.FusedLocation.Native.getLastLocation();
            setLocation((prev) => ({
              ...prev,
              location: locationFromHMS,
            }));
          }
        }
      } catch (e) {
        setError(e);
      }
    };
    f();
  }, [setLocation]);
  return [error];
};

export default useDispatchLocation;
