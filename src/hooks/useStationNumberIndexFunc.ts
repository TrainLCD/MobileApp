import { useCallback } from 'react'
import { Station } from '../gen/stationapi_pb'

const useStationNumberIndexFunc = (): ((
  station: Station.AsObject | undefined
) => number) => {
  const func = useCallback((station: Station.AsObject | undefined) => {
    if (!station?.stationNumbersList.length) {
      return 0
    }

    return (
      station?.stationNumbersList?.findIndex(({ lineSymbol }) =>
        station.line?.lineSymbolsList.some(
          ({ symbol }) => symbol === lineSymbol
        )
      ) ?? 0
    )
  }, [])

  return func
}

export default useStationNumberIndexFunc
