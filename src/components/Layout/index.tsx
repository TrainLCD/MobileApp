import React, { memo, useEffect, useState } from 'react';
import * as Permissions from 'expo-permissions';
import { useDispatch, useSelector } from 'react-redux';
import Permitted from './Permitted';
import LocationErrorScreen from '../LocationErrorScreen';
import { TrainLCDAppState } from '../../store';
import { updateGrantedRequiredPermission } from '../../store/actions/navigation';
import useDispatchLocation from '../../hooks/useDispatchLocation';

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

  if (fetchLocationFailed) {
    return <LocationErrorScreen />;
  }

  if (requiredPermissionGranted || isPermissionGranted) {
    return <Permitted>{children}</Permitted>;
  }

  return <>{children}</>;
};

export default memo(Layout);
