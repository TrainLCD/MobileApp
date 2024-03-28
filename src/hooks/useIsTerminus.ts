import { useRecoilValue } from 'recoil'
import { Station } from '../../gen/proto/stationapi_pb'
import stationState from '../store/atoms/station'
import { useLoopLine } from './useLoopLine'

const useIsTerminus = (station: Station | undefined) => {
  const { stations } = useRecoilValue(stationState)
  const { isLoopLine } = useLoopLine()

  if (!station || isLoopLine) {
    return false
  }

  return (
    stations[0]?.id === station.id ||
    stations[stations.length - 1]?.id === station.id
  )
}

export default useIsTerminus
