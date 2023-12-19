import { selector } from 'recoil'
import { RECOIL_STATES } from '../../constants'
import lineState from '../atoms/line'
import stationState from '../atoms/station'
import { currentStationSelector } from './currentStation'

export const currentLineSelector = selector({
  key: RECOIL_STATES.currentLineSelector,
  get: ({ get }) => {
    const { stations, selectedDirection } = get(stationState)
    const { selectedLine } = get(lineState)
    const currentStation = get(currentStationSelector({}))

    const actualCurrentStation = (
      selectedDirection === 'INBOUND' ? stations.slice().reverse() : stations
    ).find((rs) => rs.id === currentStation?.id)

    return actualCurrentStation?.line || selectedLine
  },
})
