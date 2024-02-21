import { selectorFamily } from 'recoil'
import { Station } from '../../../gen/proto/stationapi_pb'
import { RECOIL_STATES } from '../../constants'
import getIsPass from '../../utils/isPass'
import stationState from '../atoms/station'

type Params = { skipPassStation?: boolean; withTrainTypes?: boolean }

export const currentStationSelector = selectorFamily<Station | null, Params>({
  key: RECOIL_STATES.currentStationSelector,
  get:
    (params) =>
    ({ get }) => {
      const { stations, station, selectedDirection } = get(stationState)

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

      return station
    },
})
