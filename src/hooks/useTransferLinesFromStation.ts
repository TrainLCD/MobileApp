import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { Line, Station } from '../gen/stationapi_pb'
import stationState from '../store/atoms/station'

const useTransferLinesFromStation = (
  station: Station.AsObject | null
): Line.AsObject[] => {
  const { stations } = useRecoilValue(stationState)

  const transferLines = useMemo(
    () =>
      station?.linesList
        .filter((line) => line.id !== station.line?.id)
        .filter((line) => {
          const currentStationIndex = stations.findIndex(
            (s) => s.id === station.id
          )
          const prevStation = stations[currentStationIndex - 1]
          const nextStation = stations[currentStationIndex + 1]
          if (!prevStation || !nextStation) {
            return true
          }
          const hasSameLineInPrevStationLine = prevStation.linesList.some(
            (pl) => pl.id === line.id
          )
          const hasSameLineInNextStationLine = nextStation.linesList.some(
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
