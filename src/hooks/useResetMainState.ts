import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useCallback } from 'react';
import { useResetRecoilState, useSetRecoilState } from 'recoil';
import { LOCATION_TASK_NAME } from '../constants/location';
import navigationState from '../store/atoms/navigation';
import recordRouteState from '../store/atoms/record';
import speechState from '../store/atoms/speech';
import stationState from '../store/atoms/station';
import { isJapanese } from '../translation';
import useMirroringShare from './useMirroringShare';
import useRecordRoute from './useRecordRoute';

const useResetMainState = (): (() => void) => {
  const setNavigation = useSetRecoilState(navigationState);
  const setStation = useSetRecoilState(stationState);
  const setSpeech = useSetRecoilState(speechState);
  const resetRecordRouteState = useResetRecoilState(recordRouteState);
  const { unsubscribe: unsubscribeMirroringShare } = useMirroringShare();
  const navigation = useNavigation();
  const { dumpGPXFile } = useRecordRoute(true);

  const reset = useCallback(async () => {
    if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
    setNavigation((prev) => ({
      ...prev,
      headerState: isJapanese ? 'CURRENT' : 'CURRENT_EN',
      bottomState: 'LINE',
      leftStations: [],
    }));
    setStation((prev) => ({
      ...prev,
      selectedDirection: null,
      selectedBound: null,
      arrived: true,
    }));
    setSpeech((prev) => ({
      ...prev,
      muted: true,
    }));
    unsubscribeMirroringShare();
    await dumpGPXFile();
    resetRecordRouteState();
    navigation.navigate('SelectBound');
  }, [
    dumpGPXFile,
    navigation,
    resetRecordRouteState,
    setNavigation,
    setSpeech,
    setStation,
    unsubscribeMirroringShare,
  ]);

  return reset;
};

export default useResetMainState;
