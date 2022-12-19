import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useCallback } from 'react';
import { useResetRecoilState, useSetRecoilState } from 'recoil';
import { LOCATION_TASK_NAME } from '../constants/location';
import navigationState, {
  initialNavigationState,
} from '../store/atoms/navigation';
import recordRouteState from '../store/atoms/record';
import speechState from '../store/atoms/speech';
import stationState, { initialStationState } from '../store/atoms/station';
import useMirroringShare from './useMirroringShare';
import useRecordRoute from './useRecordRoute';

const useResetMainState = (
  shouldUnsubscribeMirroringShare = true
): (() => void) => {
  const setNavigationState = useSetRecoilState(navigationState);
  const setStationState = useSetRecoilState(stationState);
  const resetSpeechState = useResetRecoilState(speechState);
  const resetRecordRouteState = useResetRecoilState(recordRouteState);
  const { unsubscribe: unsubscribeMirroringShare } = useMirroringShare();
  const navigation = useNavigation();
  const { dumpGPXFile } = useRecordRoute(true);

  const reset = useCallback(async () => {
    if (
      TaskManager.isTaskDefined(LOCATION_TASK_NAME) &&
      (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME))
    ) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
    setNavigationState({
      ...initialNavigationState,
      requiredPermissionGranted: true,
    });
    setStationState((prev) => ({
      ...initialStationState,
      station: prev.station,
    }));
    resetSpeechState();
    if (shouldUnsubscribeMirroringShare) {
      unsubscribeMirroringShare();
    }
    await dumpGPXFile();
    resetRecordRouteState();
    navigation.navigate('SelectBound');
  }, [
    setNavigationState,
    setStationState,
    resetSpeechState,
    shouldUnsubscribeMirroringShare,
    dumpGPXFile,
    resetRecordRouteState,
    navigation,
    unsubscribeMirroringShare,
  ]);

  return reset;
};

export default useResetMainState;
