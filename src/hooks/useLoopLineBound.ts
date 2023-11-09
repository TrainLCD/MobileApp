import { useCallback, useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { Station } from '../gen/stationapi_pb'
import { HeaderLangState } from '../models/HeaderTransitionState'
import { PreferredLanguage } from '../models/PreferredLanguage'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import { isJapanese } from '../translation'
import { useLoopLine } from './useLoopLine'

const useLoopLineBound = (
  reflectHeaderLanguage = true,
  preferredLanguage?: PreferredLanguage
): {
  boundFor: string
  boundForKatakana: string
  stations: Station.AsObject[]
} | null => {
  const { headerState } = useRecoilValue(navigationState)
  const { selectedDirection } = useRecoilValue(stationState)

  const {
    isLoopLine,
    outboundStationsForLoopLine,
    inboundStationsForLoopLine,
  } = useLoopLine()

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
  const getBoundForKatakana = useCallback(
    (boundStations: Station.AsObject[]) => {
      return `${boundStations.map((s) => s.nameKatakana).join('・')}ホウメン`
    },
    []
  )

  const bounds = useMemo(() => {
    switch (selectedDirection) {
      case 'INBOUND': {
        return {
          stations: inboundStationsForLoopLine,
          boundForKatakana: getBoundForKatakana(inboundStationsForLoopLine),
          boundFor: getBoundFor(inboundStationsForLoopLine),
        }
      }
      case 'OUTBOUND': {
        return {
          stations: outboundStationsForLoopLine,
          boundForKatakana: getBoundForKatakana(outboundStationsForLoopLine),
          boundFor: getBoundFor(outboundStationsForLoopLine),
        }
      }
      default:
        return null
    }
  }, [
    getBoundFor,
    getBoundForKatakana,
    inboundStationsForLoopLine,
    outboundStationsForLoopLine,
    selectedDirection,
  ])

  if (!isLoopLine) {
    return {
      stations: [],
      boundForKatakana: '',
      boundFor: '',
    }
  }

  return bounds
}

export default useLoopLineBound
