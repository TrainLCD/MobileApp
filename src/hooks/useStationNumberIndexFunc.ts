import { useCallback } from 'react'
import { Line, Station } from '../../gen/proto/stationapi_pb'

const useStationNumberIndexFunc = () => {
  const func = useCallback((station: Station | undefined, line?: Line) => {
    return (
      line?.lineSymbols?.findIndex(({ symbol }) =>
        station?.stationNumbers?.some(({ lineSymbol }) => symbol === lineSymbol)
      ) ?? 0
    )
  }, [])

  return func
}

export default useStationNumberIndexFunc
