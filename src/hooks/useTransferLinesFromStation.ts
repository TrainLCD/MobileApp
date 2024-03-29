import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { Line, Station } from '../../gen/proto/stationapi_pb'
import { parenthesisRegexp } from '../constants'
import stationState from '../store/atoms/station'

const useTransferLinesFromStation = (station: Station | null): Line[] => {
  const { stations } = useRecoilValue(stationState)

  const transferLines = useMemo(
    () =>
      station?.lines
        ?.filter((line) => line.id !== station.line?.id)
        // カッコを除いて路線名が同じということは、
        // データ上の都合で路線が分かれているだけなので除外する
        // ex. JR神戸線(大阪～神戸) と JR神戸線(神戸～姫路) は実質同じ路線
        .filter(
          (line) =>
            line.nameShort.replace(parenthesisRegexp, '') !==
            station.line?.nameShort.replace(parenthesisRegexp, '')
        )
        .filter((line) => {
          const currentStationIndex = stations.findIndex(
            (s) => s.id === station.id
          )
          const prevStation = stations[currentStationIndex - 1]
          const nextStation = stations[currentStationIndex + 1]
          if (!prevStation || !nextStation) {
            return true
          }
          const hasSameLineInPrevStationLine = prevStation.lines.some(
            (pl) => pl.id === line.id
          )
          const hasSameLineInNextStationLine = nextStation.lines.some(
            (nl) => nl.id === line.id
          )

          if (
            // 次の駅から違う路線に直通している場合並走路線を乗り換え路線として出す
            nextStation.line?.id !== station.line?.id
          ) {
            return true
          }
          if (hasSameLineInPrevStationLine && hasSameLineInNextStationLine) {
            return false
          }
          return true
        }),
    [station, stations]
  )

  return transferLines ?? []
}

export default useTransferLinesFromStation
