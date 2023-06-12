import { useEffect, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { Station } from '../models/StationAPI'
import stationState from '../store/atoms/station'
import getIsPass from '../utils/isPass'

const useCurrentStation = ({
  withTrainTypes = false,
  skipPassStation = false,
} = {}): Station | null => {
  const { stations, station, stationsWithTrainTypes } =
    useRecoilValue(stationState)
  // stationには通過駅も入るので、通過駅を無視したい時には不都合なのでstateでキャッシュしている
  const [stationCache, setStationCache] = useState<Station | null>(station)

  useEffect(() => {
    if (skipPassStation || withTrainTypes) {
      const current = (withTrainTypes ? stationsWithTrainTypes : stations)
        .filter((s) => (skipPassStation ? !getIsPass(s) : true))
        .find((rs) => rs.groupId === station?.groupId)

      if (current) {
        setStationCache(current)
      }
      return
    }

    // 種別設定がない場合は通過駅がない(skipPassStationがtrueの時点で種別が設定されている必要がある)ため、
    // そのままステートの駅を返す
    setStationCache(station)
  }, [
    skipPassStation,
    station,
    stations,
    stationsWithTrainTypes,
    withTrainTypes,
  ])

  return stationCache
}

export default useCurrentStation
