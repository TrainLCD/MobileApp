import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useCallback } from 'react';
import { useSetRecoilState } from 'recoil';
import { LOCATION_TASK_NAME } from '../constants/location';
import navigationState from '../store/atoms/navigation';
import speechState from '../store/atoms/speech';
import stationState from '../store/atoms/station';
import { isJapanese } from '../translation';
import useMirroringShare from './useMirroringShare';

const useResetMainState = (): (() => void) => {
  const setNavigation = useSetRecoilState(navigationState);
  const setStation = useSetRecoilState(stationState);
  const setSpeech = useSetRecoilState(speechState);
  const { unsubscribe: unsubscribeMirroringShare } = useMirroringShare();
  const navigation = useNavigation();

  const reset = useCallback(async () => {
    if (TaskManager.isTaskDefined(LOCATION_TASK_NAME)) {
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
    navigation.navigate('SelectBound');
  }, [
    navigation,
    setNavigation,
    setSpeech,
    setStation,
    unsubscribeMirroringShare,
  ]);

  return reset;
};

export default useResetMainState;
