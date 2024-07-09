import { useEffect, useRef } from 'react'
import BackgroundGeolocation from 'react-native-background-geolocation'
import { useRecoilValue } from 'recoil'
import { accuracySelector } from '../store/selectors/accuracy'
import { autoModeEnabledSelector } from '../store/selectors/autoMode'
import { distanceFilterSelector } from '../store/selectors/distanceFilter'
import { useLocationStore } from './useLocationStore'

export const useStartBackgroundLocationUpdates = () => {
  const setLocation = useLocationStore((state) => state.setLocation)

  const autoModeEnabled = useRecoilValue(autoModeEnabledSelector)
  const locationServiceAccuracy = useRecoilValue(accuracySelector)
  const distanceFilter = useRecoilValue(distanceFilterSelector)

  const autoModeEnabledRef = useRef(autoModeEnabled)
  const locationServiceAccuracyRef = useRef(locationServiceAccuracy)
  const distanceFilterRef = useRef(distanceFilter)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    ;(async () => {
      if (!autoModeEnabledRef.current) {
        BackgroundGeolocation.onLocation((location) => {
          setLocation(location)
        })

        await BackgroundGeolocation.ready({
          desiredAccuracy: locationServiceAccuracyRef.current,
          distanceFilter: distanceFilterRef.current,
          stopOnTerminate: false,
          startOnBoot: false,
        })
        await BackgroundGeolocation.start()
      }
    })()
    return () => {
      BackgroundGeolocation.stop()
    }
  }, [])
}
