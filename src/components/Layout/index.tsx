import React, { useCallback, useEffect, useState } from 'react';
import * as Permissions from 'expo-permissions';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { connectActionSheet } from '@expo/react-native-action-sheet';
import HMSLocation from '@hmscore/react-native-hms-location';
import Permitted from './Permitted';
import ErrorScreen from '../ErrorScreen';
import { translate } from '../../translation';
import navigationState from '../../store/atoms/navigation';
import useDispatchLocation from '../../hooks/useDispatchLocation';
import locationState from '../../store/atoms/location';
import gmsAvailability from '../../native/gmsAvailability';

type Props = {
  children: React.ReactNode;
};

const Layout: React.FC<Props> = ({ children }: Props) => {
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [navigation, setNavigation] = useRecoilState(navigationState);
  const setLocation = useSetRecoilState(locationState);
  const { requiredPermissionGranted } = navigation;
  const [fetchLocationFailed] = useDispatchLocation();

  useEffect(() => {
    const f = async (): Promise<void> => {
      const { granted } = await Permissions.getAsync(Permissions.LOCATION);
      setNavigation((prev) => ({
        ...prev,
        requiredPermissionGranted: granted,
      }));
      setIsPermissionGranted(granted);
    };
    f();
  }, [setNavigation]);

  const handleRefreshPress = useCallback(async () => {
    try {
      if (await gmsAvailability.isGMSAvailable()) {
        const locationFromGMS = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation((prev) => ({
          ...prev,
          location: locationFromGMS,
        }));
      } else {
        const locationFromHMS = await HMSLocation.FusedLocation.Native.getLastLocation();
        setLocation((prev) => ({
          ...prev,
          location: locationFromHMS,
        }));
      }
    } catch (err) {
      Alert.alert(translate('errorTitle'), translate('fetchLocationFailed'), [
        { text: 'OK' },
      ]);
    }
  }, [setLocation]);

  if (fetchLocationFailed) {
    return (
      <ErrorScreen
        title={translate('errorTitle')}
        text={translate('couldNotGetLocation')}
        onRetryPress={handleRefreshPress}
      />
    );
  }

  if (requiredPermissionGranted || isPermissionGranted) {
    return <Permitted>{children}</Permitted>;
  }

  return <>{children}</>;
};

export default connectActionSheet(Layout);
