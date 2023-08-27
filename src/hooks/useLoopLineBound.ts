import { useCallback, useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { Station } from '../gen/stationapi_pb'
import { HeaderLangState } from '../models/HeaderTransitionState'
import { PreferredLanguage } from '../models/PreferredLanguage'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import { isJapanese } from '../translation'
import getCurrentStationIndex from '../utils/currentStationIndex'
import {
  getIsLoopLine,
  inboundStationsForLoopLine,
  outboundStationsForLoopLine,
} from '../utils/loopLine'
import useCurrentLine from './useCurrentLine'
import useCurrentStation from './useCurrentStation'
import useCurrentTrainType from './useCurrentTrainType'

const useLoopLineBound = (
  reflectHeaderLanguage = true,
  preferredLanguage?: PreferredLanguage
): { boundFor: string; stations: Station.AsObject[] } | null => {
  const { headerState } = useRecoilValue(navigationState)
  const { stations, selectedDirection } = useRecoilValue(stationState)

  const station = useCurrentStation()
  const currentLine = useCurrentLine()
  const trainType = useCurrentTrainType()

  const currentIndex = getCurrentStationIndex(stations, station)
  const headerLangState = headerState.split('_')[1] as HeaderLangState
  const fixedHeaderLangState: PreferredLanguage = isJapanese ? 'JA' : 'EN'

  const getBoundFor = useCallback(
    (boundStations: Station.AsObject[]) => {
      if (reflectHeaderLanguage) {
        switch (headerLangState) {
          case 'EN':
            return `${boundStations.map((s) => s.nameRoman).join(' & ')}`
          case 'ZH':
            return `${boundStations.map((s) => s.nameChinese).join('・')}`
          case 'KO':
            return `${boundStations.map((s) => s.nameKorean).join('・')}`
          default:
            return `${boundStations.map((s) => s.name).join('・')}`
        }
      }

      const overrideLanguage = preferredLanguage ?? fixedHeaderLangState

      switch (overrideLanguage) {
        case 'EN':
          return `${boundStations.map((s) => s.nameRoman).join(' & ')}`
        default:
          return `${boundStations.map((s) => s.name).join('・')}方面`
      }
    },
    [
      fixedHeaderLangState,
      headerLangState,
      preferredLanguage,
      reflectHeaderLanguage,
    ]
  )

  const bounds = useMemo(() => {
    switch (selectedDirection) {
      case 'INBOUND': {
        const inboundStations = inboundStationsForLoopLine(
          stations,
          stations[currentIndex],
          currentLine
        )
        return {
          stations: inboundStations,
          boundFor: getBoundFor(inboundStations),
        }
      }
      case 'OUTBOUND': {
        const outboundStations = outboundStationsForLoopLine(
          stations,
          stations[currentIndex],
          currentLine
        )
        return {
          stations: outboundStations,
          boundFor: getBoundFor(outboundStations),
        }
      }
      default:
        return null
    }
  }, [currentIndex, currentLine, getBoundFor, selectedDirection, stations])

  if (!getIsLoopLine(currentLine, trainType)) {
    return {
      stations: [],
      boundFor: '',
    }
  }

  return bounds
}

export default useLoopLineBound
