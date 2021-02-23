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
        if (await gmsAvailability.isGMSAvailable()) {
          const { granted } = await Permissions.getAsync(Permissions.LOCATION);
          if (granted) {
            const locationFromGMS = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            setLocation((prev) => ({
              ...prev,
              location: locationFromGMS,
            }));
          }
        } else {
          const locationRequest = {
            priority:
              HMSLocation.FusedLocation.PriorityConstants.PRIORITY_HD_ACCURACY,
            interval: 5000,
            numUpdates: Number.MAX_VALUE,
            fastestInterval: 5000,
            expirationTime: 0,
            expirationTimeDuration: 0,
            smallestDisplacement: 0,
            maxWaitTime: 1000.0,
            needAddress: false,
            language: '',
            countryCode: '',
          };
          const locationSettingsRequest = {
            locationRequests: [locationRequest],
            alwaysShow: true,
            needBle: true,
          };

          await HMSLocation.FusedLocation.Native.checkLocationSettings(
            locationSettingsRequest
          );

          await HMSLocation.FusedLocation.Native.requestLocationUpdatesWithCallbackEx(
            locationRequest
          );

          HMSLocation.FusedLocation.Events.addFusedLocationEventListener(
            (result) => {
              console.log('addFusedLocationEventListener', result.lastLocation);
              setLocation((prev) => ({
                ...prev,
                location: result.lastLocation,
              }));
            }
          );
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
