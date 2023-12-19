import { selectorFamily } from 'recoil'
import { RECOIL_STATES } from '../../constants'
import { Station } from '../../gen/stationapi_pb'
import getIsPass from '../../utils/isPass'
import lineState from '../atoms/line'
import stationState from '../atoms/station'

type Params = { skipPassStation?: boolean; withTrainTypes?: boolean }

export const currentStationSelector = selectorFamily<
  Station.AsObject | null,
  Params
>({
  key: RECOIL_STATES.currentStationSelector,
  get:
    (params) =>
    ({ get }) => {
      const {
        stations,
        station: stationFromState,
        selectedDirection,
      } = get(stationState)
      const { selectedLine } = get(lineState)

      // NOTE: 選択した路線と現在の駅の路線を一致させる
      const station = stations.find(
        (s) =>
          s.line?.id === selectedLine?.id &&
          s.groupId === stationFromState?.groupId
      )

      const { skipPassStation = false, withTrainTypes = false } = params

      if (skipPassStation || withTrainTypes) {
        const foundStation = stations
          .filter((s) => (skipPassStation ? !getIsPass(s) : true))
          .find((rs) => rs.id === station?.id)
        if (foundStation) {
          return foundStation
        }

        const reversedStations =
          selectedDirection === 'INBOUND'
            ? stations
            : stations.slice().reverse()

        const curIndex = reversedStations.findIndex((s) => s.id === station?.id)
        const stationsFromRange = reversedStations
          .slice(0, curIndex)
          .filter((s) => (skipPassStation ? !getIsPass(s) : true))
        return stationsFromRange[stationsFromRange.length - 1] ?? null
      }

      // NOTE: 路線が選択されていない場合stationはnullishになる
      return station ?? stationFromState
    },
})
