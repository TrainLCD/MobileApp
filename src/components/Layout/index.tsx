import React, { memo, useCallback, useEffect, useState } from 'react';
import * as Permissions from 'expo-permissions';
import { useDispatch, useSelector } from 'react-redux';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import Permitted from './Permitted';
import ErrorScreen from '../ErrorScreen';
import { TrainLCDAppState } from '../../store';
import { updateGrantedRequiredPermission } from '../../store/actions/navigation';
import useDispatchLocation from '../../hooks/useDispatchLocation';
import { updateLocationSuccess } from '../../store/actions/location';
import { translate } from '../../translation';

type Props = {
  children: React.ReactNode;
};

const Layout: React.FC<Props> = ({ children }: Props) => {
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const { requiredPermissionGranted } = useSelector(
    (state: TrainLCDAppState) => state.navigation
  );
  const dispatch = useDispatch();
  const [fetchLocationFailed] = useDispatchLocation();

  useEffect(() => {
    const f = async (): Promise<void> => {
      const { granted } = await Permissions.getAsync(Permissions.LOCATION);
      dispatch(updateGrantedRequiredPermission(granted));
      setIsPermissionGranted(granted);
    };
    f();
  }, [dispatch]);

  const handleRefreshPress = useCallback(async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      dispatch(updateLocationSuccess(loc));
    } catch (err) {
      Alert.alert(translate('errorTitle'), translate('fetchLocationFailed'), [
        { text: 'OK' },
      ]);
    }
  }, [dispatch]);

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
