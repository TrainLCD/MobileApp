import * as Location from 'expo-location'
import { useCallback } from 'react'
import { useSetRecoilState } from 'recoil'
import { LOCATION_TASK_NAME } from '../constants'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import { isJapanese } from '../translation'

const useResetMainState = (): (() => void) => {
  const setNavigationState = useSetRecoilState(navigationState)
  const setStationState = useSetRecoilState(stationState)

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

    const isStarted = await Location.hasStartedLocationUpdatesAsync(
      LOCATION_TASK_NAME
    )
    if (isStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
    }
  }, [setNavigationState, setStationState])

  return reset
}

export default useResetMainState
