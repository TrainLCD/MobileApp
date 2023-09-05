import { useRecoilValue } from 'recoil'
import { Station } from '../gen/stationapi_pb'
import stationState from '../store/atoms/station'
import { getIsLoopLine } from '../utils/loopLine'
import { useCurrentLine } from './useCurrentLine'
import useCurrentTrainType from './useCurrentTrainType'

const useIsTerminus = (station: Station.AsObject | undefined) => {
  const { stations } = useRecoilValue(stationState)
  const currentLine = useCurrentLine()
  const trainType = useCurrentTrainType()

  if (!station || getIsLoopLine(currentLine, trainType)) {
    return false
  }

  return (
    stations[0]?.id === station.id ||
    stations[stations.length - 1]?.id === station.id
  )
}

export default useIsTerminus
