import { useEffect } from 'react'
import { useRecoilState } from 'recoil'
import locationState from '../store/atoms/location'
import { getArrivedThreshold } from '../utils/threshold'
import useAverageDistance from './useAverageDistance'
import { useCurrentLine } from './useCurrentLine'

const useDetectBadAccuracy = (): void => {
  const [{ location }, setLocation] = useRecoilState(locationState)

  const currentLine = useCurrentLine()
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
