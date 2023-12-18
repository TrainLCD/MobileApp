import { selectorFamily } from 'recoil'
import { RECOIL_STATES } from '../../constants'
import { Station } from '../../gen/stationapi_pb'
import getIsPass from '../../utils/isPass'
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
      const { stations, station } = get(stationState)

      const { skipPassStation = false, withTrainTypes = false } = params

      if (skipPassStation || withTrainTypes) {
        return (
          stations
            .filter((s) => (skipPassStation ? !getIsPass(s) : true))
            .find((rs) => rs.id === station?.id) ?? null
        )
      }

      return station
    },
})
