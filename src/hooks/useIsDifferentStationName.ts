import { useCallback } from 'react'
import { Line, Station } from '../gen/stationapi_pb'
import useIsEn from './useIsEn'

const useIsDifferentStationName = () => {
  const isEn = useIsEn()

  const isDifferentStationName = useCallback(
    (station: Station.AsObject, line: Line.AsObject) => {
      if (
        // line.id === 0: 新幹線モック
        line.id === 0 ||
        // line.id === 1: JR線モック
        line.id === 1
      ) {
        return false
      }
      if (!line.station) {
        return false
      }

      if (isEn) {
        return station.nameRoman !== line.station.nameRoman
      }

      // nameだと市ヶ谷と市ケ谷の違い程度でも違うものとなってしまうのでよみがなで判別する
      return station.nameKatakana !== line.station.nameKatakana
    },
    [isEn]
  )
  return isDifferentStationName
}

export default useIsDifferentStationName
