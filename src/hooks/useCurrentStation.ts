import { useEffect, useMemo, useRef } from 'react'
import { useRecoilValue } from 'recoil'
import { Station } from '../gen/stationapi_pb'
import lineState from '../store/atoms/line'
import stationState from '../store/atoms/station'
import getIsPass from '../utils/isPass'

const useCurrentStation = ({
  withTrainTypes = false,
  skipPassStation = false,
} = {}): Station.AsObject | null => {
  const { stations, station: stationFromState } = useRecoilValue(stationState)
  const { selectedLine } = useRecoilValue(lineState)

  // NOTE: 行先が選択されていない場合、位置情報でヒットした路線の駅が使われてしまうので、
  // 路線が選択されたあと駅のグループIDで選択された路線の駅データを判定する
  const station = useMemo(() => {
    if (!selectedLine) {
      return stationFromState
    }
    return (
      stations.find((s) => s.groupId === stationFromState?.groupId) ??
      stationFromState
    )
  }, [selectedLine, stationFromState, stations])

  // stationには通過駅も入るので、通過駅を無視したい時には不都合なのでstateでキャッシュしている
  const stationCacheRef = useRef<Station.AsObject | null>(station)

  useEffect(() => {
    if (skipPassStation || withTrainTypes) {
      const current = stations
        .filter((s) => (skipPassStation ? !getIsPass(s) : true))
        .find((rs) => rs.id === station?.id)

      if (current) {
        stationCacheRef.current = current
      }
      return
    }

    // 種別設定がない場合は通過駅がない(skipPassStationがtrueの時点で種別が設定されている必要がある)ため、
    // そのままステートの駅を返す
    stationCacheRef.current = station
  }, [skipPassStation, station, stations, withTrainTypes])

  return stationCacheRef.current
}

export default useCurrentStation
