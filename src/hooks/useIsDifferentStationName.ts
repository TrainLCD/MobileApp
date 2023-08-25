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
        return (
          encodeURIComponent(station.nameRoman.toLowerCase().normalize('NFD'))
            .replaceAll('%CC%84', '')
            .replaceAll('%E2%80%99', '')
            .replaceAll('%20', ' ') !==
          encodeURIComponent(
            line.station.nameRoman.toLowerCase().normalize('NFD')
          )
            .replaceAll('%CC%84', '')
            .replaceAll('%E2%80%99', '')
            .replaceAll('%20', ' ')
        )
      }

      // nameだと市ヶ谷と市ケ谷の違い程度でも違うものとなってしまうのでよみがなで判別する
      return station.nameKatakana !== line.station.nameKatakana
    },
    [isEn]
  )
  return isDifferentStationName
}

export default useIsDifferentStationName
