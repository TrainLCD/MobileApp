import { useCallback } from 'react'
import { Line } from '../gen/stationapi_pb'

const useStationNumberIndexFunc = (): ((
  line: Line.AsObject | undefined
) => number) => {
  const func = useCallback(
    (line: Line.AsObject | undefined) =>
      line?.lineSymbolsList?.findIndex(
        ({ symbol }) =>
          line?.station?.stationNumbersList[0]?.lineSymbol === symbol
      ) ?? 0,
    []
  )

  return func
}

export default useStationNumberIndexFunc
