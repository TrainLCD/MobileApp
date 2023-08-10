import { useCallback } from 'react'
import { Line, Station } from '../gen/stationapi_pb'

const useStationNumberIndexFunc = () => {
  const func = useCallback(
    (station: Station.AsObject | undefined, line?: Line.AsObject) => {
      return (
        line?.lineSymbolsList?.findIndex(({ symbol }) =>
          station?.stationNumbersList.some(
            ({ lineSymbol }) => symbol === lineSymbol
          )
        ) ?? 0
      )
    },
    []
  )

  return func
}

export default useStationNumberIndexFunc
