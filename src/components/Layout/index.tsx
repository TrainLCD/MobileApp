import React, { memo, useCallback, useEffect, useState } from 'react';
import * as Permissions from 'expo-permissions';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { useRecoilState, useSetRecoilState } from 'recoil';
import Permitted from './Permitted';
import ErrorScreen from '../ErrorScreen';
import { translate } from '../../translation';
import navigationState from '../../store/atoms/navigation';
import useDispatchLocation from '../../hooks/useDispatchLocation';
import locationState from '../../store/atoms/location';

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
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation((prev) => ({
        ...prev,
        location,
      }));
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

export default memo(Layout);
