import * as Location from 'expo-location'
import { useCallback } from 'react'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import { LOCATION_TASK_NAME } from '../constants'
import mirroringShareState from '../store/atoms/mirroringShare'
import navigationState from '../store/atoms/navigation'
import speechState from '../store/atoms/speech'
import stationState from '../store/atoms/station'
import { isJapanese } from '../translation'
import useMirroringShare from './useMirroringShare'

const useResetMainState = (): (() => void) => {
  const setNavigationState = useSetRecoilState(navigationState)
  const setStationState = useSetRecoilState(stationState)
  const setSpeechState = useSetRecoilState(speechState)
  const { subscribing } = useRecoilValue(mirroringShareState)
  const { unsubscribe: unsubscribeMirroringShare } = useMirroringShare()

  const reset = useCallback(async () => {
    setNavigationState((prev) => ({
      ...prev,
      headerState: isJapanese ? 'CURRENT' : 'CURRENT_EN',
      bottomState: 'LINE',
      leftStations: [],
    }))
    setStationState((prev) => ({
      ...prev,
      selectedDirection: null,
      selectedBound: null,
      arrived: true,
    }))
    setSpeechState((prev) => ({
      ...prev,
      muted: true,
    }))
    if (subscribing) {
      unsubscribeMirroringShare()
    }

    const isStarted = await Location.hasStartedLocationUpdatesAsync(
      LOCATION_TASK_NAME
    )
    if (isStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
    }
  }, [
    setNavigationState,
    setSpeechState,
    setStationState,
    subscribing,
    unsubscribeMirroringShare,
  ])

  return reset
}

export default useResetMainState
