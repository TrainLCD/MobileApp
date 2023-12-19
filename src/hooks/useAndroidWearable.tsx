import { useEffect, useMemo } from 'react'
import { Platform } from 'react-native'
import { useRecoilValue } from 'recoil'
import locationState from '../store/atoms/location'
import stationState from '../store/atoms/station'
import { currentStationSelector } from '../store/selectors/currentStation'
import getIsPass from '../utils/isPass'
import sendStationInfoToWatch from '../utils/native/android/wearableModule'
import useIsNextLastStop from './useIsNextLastStop'
import { useNextStation } from './useNextStation'
import { useNumbering } from './useNumbering'
import { useStoppingState } from './useStoppingState'

const useAndroidWearable = (): void => {
  const { arrived } = useRecoilValue(stationState)
  const { badAccuracy } = useRecoilValue(locationState)
  const currentStation = useRecoilValue(currentStationSelector({}))

  const nextStation = useNextStation()
  const stoppingState = useStoppingState()
  const [currentNumbering] = useNumbering()
  const isNextLastStop = useIsNextLastStop()

  const station = useMemo(
    () =>
      arrived && currentStation && !getIsPass(currentStation)
        ? currentStation
        : nextStation,
    [arrived, currentStation, nextStation]
  )

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    ;(async () => {
      if (!station || Platform.OS !== 'android') {
        return
      }
      try {
        await sendStationInfoToWatch({
          stationName: station.name,
          stationNameRoman: station.nameRoman ?? '',
          currentStateKey: stoppingState ?? 'CURRENT',
          stationNumber: currentNumbering?.stationNumber ?? '',
          badAccuracy,
          isNextLastStop,
        })
      } catch (err) {
        console.error(err)
      }
    })()
  }, [
    station,
    currentNumbering?.stationNumber,
    badAccuracy,
    isNextLastStop,
    stoppingState,
  ])
}

export default useAndroidWearable
