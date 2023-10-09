import { useCallback, useEffect, useMemo } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import { HeaderTransitionState } from '../models/HeaderTransitionState'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import tuningState from '../store/atoms/tuning'
import { isJapanese } from '../translation'
import getIsPass from '../utils/isPass'
import useIntervalEffect from './useIntervalEffect'
import { useNextStation } from './useNextStation'
import useValueRef from './useValueRef'

type HeaderState = 'CURRENT' | 'NEXT' | 'ARRIVING'
type HeaderLangState = 'JA' | 'KANA' | 'EN' | 'ZH' | 'KO'

const useWatchApproaching = (): void => {
  const { arrived, approaching, station } = useRecoilValue(stationState)
  const [{ headerState, enabledLanguages }, setNavigation] =
    useRecoilState(navigationState)
  const { headerTransitionInterval } = useRecoilValue(tuningState)

  const headerStateRef = useValueRef(headerState)

  const nextStation = useNextStation()

  useEffect(() => {
    if (arrived) {
      switch (headerState) {
        case 'NEXT':
        case 'NEXT_KANA':
        case 'NEXT_EN':
        case 'NEXT_ZH':
        case 'NEXT_KO':
        case 'ARRIVING':
        case 'ARRIVING_KANA':
        case 'ARRIVING_EN':
        case 'ARRIVING_ZH':
        case 'ARRIVING_KO':
          if (station && !getIsPass(station)) {
            setNavigation((prev) => ({
              ...prev,
              headerState: isJapanese ? 'CURRENT' : 'CURRENT_EN',
            }))
          }
          break
        default:
          break
      }
    }
  }, [arrived, headerState, setNavigation, station])

  const isExtraLangAvailable = useMemo(
    () => !!station?.nameChinese || !!station?.nameKorean,
    [station?.nameChinese, station?.nameKorean]
  )

  useIntervalEffect(
    useCallback(() => {
      if (approaching && !arrived) {
        const currentHeaderState = headerStateRef.current.split(
          '_'
        )[0] as HeaderState
        const currentHeaderStateLang =
          (headerStateRef.current.split('_')[1] as HeaderLangState) || 'JA'
        const currentLangIndex = enabledLanguages.indexOf(
          currentHeaderStateLang !== 'KANA' ? currentHeaderStateLang : 'JA'
        )
        const nextLang =
          currentLangIndex !== -1
            ? enabledLanguages[currentLangIndex + 1]
            : null

        switch (currentHeaderState) {
          case 'CURRENT':
          case 'NEXT':
            if (nextStation) {
              setNavigation((prev) => ({
                ...prev,
                headerState: 'ARRIVING',
              }))
            }
            break
          case 'ARRIVING': {
            if (currentHeaderStateLang === 'JA') {
              setNavigation((prev) => ({
                ...prev,
                headerState: 'ARRIVING_KANA',
              }))
              break
            }

            if (!nextLang || (nextLang !== 'EN' && !isExtraLangAvailable)) {
              setNavigation((prev) => ({
                ...prev,
                headerState: 'ARRIVING',
              }))
              break
            }
            setNavigation((prev) => ({
              ...prev,
              headerState: `ARRIVING_${nextLang}` as HeaderTransitionState,
            }))
            break
          }
          default:
            break
        }
      }
    }, [
      approaching,
      arrived,
      enabledLanguages,
      headerStateRef,
      isExtraLangAvailable,
      nextStation,
      setNavigation,
    ]),
    headerTransitionInterval
  )
}

export default useWatchApproaching
