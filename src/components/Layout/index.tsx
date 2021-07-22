import React, { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { connectActionSheet } from '@expo/react-native-action-sheet';
import { useNavigation } from '@react-navigation/native';
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
  const [{ requiredPermissionGranted }, setNavigation] =
    useRecoilState(navigationState);
  const setLocation = useSetRecoilState(locationState);
  const [fetchLocationFailed] = useDispatchLocation();
  const [locationErrorDismissed, setLocationErrorDismissed] = useState(false);
  const { navigate } = useNavigation();

  useEffect(() => {
    const f = async (): Promise<void> => {
      const { granted } = await Location.getForegroundPermissionsAsync();
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

  const handleRecoverLocationError = () => {
    navigate('FakeStation');
    setLocationErrorDismissed(true);
  };

  if (fetchLocationFailed && !locationErrorDismissed) {
    return (
      <ErrorScreen
        title={translate('errorTitle')}
        text={translate('couldNotGetLocation')}
        onRetryPress={handleRefreshPress}
        onRecoverErrorPress={handleRecoverLocationError}
        recoverable
      />
    );
  }

  if (requiredPermissionGranted || isPermissionGranted) {
    return <Permitted>{children}</Permitted>;
  }

  return <>{children}</>;
};

export default connectActionSheet(Layout);
