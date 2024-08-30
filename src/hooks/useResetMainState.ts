import { useFocusEffect } from '@react-navigation/native'
import { useCallback } from 'react'
import { useSetRecoilState } from 'recoil'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import { isJapanese } from '../translation'

export const useResetMainState = () => {
  const setNavigationState = useSetRecoilState(navigationState)
  const setStationState = useSetRecoilState(stationState)

  useFocusEffect(
    useCallback(() => {
      return () => {
        setNavigationState((prev) => ({
          ...prev,
          headerState: isJapanese ? 'CURRENT' : 'CURRENT_EN',
          bottomState: 'LINE',
          leftStations: [],
          stationForHeader: null,
        }))
        setStationState((prev) => ({
          ...prev,
          selectedDirection: null,
          selectedBound: null,
          arrived: true,
          approaching: false,
          averageDistance: null,
        }))
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  )
}
