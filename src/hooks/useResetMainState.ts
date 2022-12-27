import { useCallback } from 'react';
import { useResetRecoilState, useSetRecoilState } from 'recoil';
import navigationState from '../store/atoms/navigation';
import recordRouteState from '../store/atoms/record';
import speechState from '../store/atoms/speech';
import stationState from '../store/atoms/station';
import { isJapanese } from '../translation';
import useMirroringShare from './useMirroringShare';
import useRecordRoute from './useRecordRoute';

const useResetMainState = (
  shouldUnsubscribeMirroringShare = true
): (() => void) => {
  const setNavigationState = useSetRecoilState(navigationState);
  const setStationState = useSetRecoilState(stationState);
  const setSpeechState = useSetRecoilState(speechState);
  const resetRecordRouteState = useResetRecoilState(recordRouteState);
  const { unsubscribe: unsubscribeMirroringShare } = useMirroringShare();
  const { dumpGPXFile } = useRecordRoute(true);

  const reset = useCallback(async () => {
    setNavigationState((prev) => ({
      ...prev,
      headerState: isJapanese ? 'CURRENT' : 'CURRENT_EN',
      bottomState: 'LINE',
      leftStations: [],
    }));
    setStationState((prev) => ({
      ...prev,
      selectedDirection: null,
      selectedBound: null,
      arrived: true,
    }));
    setSpeechState((prev) => ({
      ...prev,
      muted: true,
    }));
    if (shouldUnsubscribeMirroringShare) {
      unsubscribeMirroringShare();
    }
    await dumpGPXFile();
    resetRecordRouteState();
  }, [
    setNavigationState,
    setStationState,
    setSpeechState,
    shouldUnsubscribeMirroringShare,
    dumpGPXFile,
    resetRecordRouteState,
    unsubscribeMirroringShare,
  ]);

  return reset;
};

export default useResetMainState;
