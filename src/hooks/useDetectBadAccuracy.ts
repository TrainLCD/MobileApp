import { useEffect } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import locationState from '../store/atoms/location'
import { currentLineSelector } from '../store/selectors/currentLine'
import { getArrivedThreshold } from '../utils/threshold'
import useAverageDistance from './useAverageDistance'

const useDetectBadAccuracy = (): void => {
  const [{ location }, setLocation] = useRecoilState(locationState)

  const currentLine = useRecoilValue(currentLineSelector)
  const avgDistance = useAverageDistance()

  useEffect(() => {
    if (!location?.coords?.accuracy) {
      return
    }
    const maximumAccuracy = getArrivedThreshold(
      currentLine?.lineType,
      avgDistance
    )
    if ((location.coords.accuracy || 0) > maximumAccuracy) {
      setLocation((prev) => ({
        ...prev,
        badAccuracy: true,
      }))
    } else {
      setLocation((prev) => ({
        ...prev,
        badAccuracy: false,
      }))
    }
  }, [
    avgDistance,
    currentLine?.lineType,
    location?.coords.accuracy,
    setLocation,
  ])
}

export default useDetectBadAccuracy
