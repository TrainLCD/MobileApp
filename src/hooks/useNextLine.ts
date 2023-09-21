import { Line } from '../gen/stationapi_pb'
import useConnectedLines from './useConnectedLines'

const useNextLine = (): Line.AsObject | undefined => {
  const connectedLines = useConnectedLines()
  return connectedLines[0]
}

export default useNextLine
