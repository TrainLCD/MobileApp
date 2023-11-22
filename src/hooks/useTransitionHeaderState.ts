import { useCallback, useMemo, useRef } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import { AvailableLanguage } from '../constants'
import { HeaderTransitionState } from '../models/HeaderTransitionState'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import tuningState from '../store/atoms/tuning'
import { isJapanese } from '../translation'
import getIsPass from '../utils/isPass'
import useCurrentStation from './useCurrentStation'
import useIntervalEffect from './useIntervalEffect'
import { useIsLEDTheme } from './useIsLEDTheme'
import useIsPassing from './useIsPassing'
import { useNextStation } from './useNextStation'
import useValueRef from './useValueRef'

type HeaderState = 'CURRENT' | 'NEXT' | 'ARRIVING'
type HeaderLangState = 'JA' | 'KANA' | 'EN' | 'ZH' | 'KO'

const useTransitionHeaderState = (): void => {
  const { arrived, approaching } = useRecoilValue(stationState)
  const [{ headerState, enabledLanguages, stationForHeader }, setNavigation] =
    useRecoilState(navigationState)
  const { headerTransitionInterval } = useRecoilValue(tuningState)
  const isLEDTheme = useIsLEDTheme()

  const headerStateRef = useValueRef(headerState)
  const enabledLanguagesRef = useRef<AvailableLanguage[]>(
    isLEDTheme ? ['JA', 'EN'] : enabledLanguages
  )

  const station = useCurrentStation()
  const nextStation = useNextStation()
  const isPassing = useIsPassing()

  const showNextExpression = useMemo(() => {
    // 次の停車駅が存在しない場合無条件でfalse
    if (!nextStation) {
      return false
    }
    // 最寄駅が通過駅の場合は無条件でtrue
    if (station && getIsPass(station)) {
      return true
    }
    // 急行停車駅発車直後trueにする
    if (stationForHeader?.id === station?.id && !arrived) {
      return true
    }
    // 地理的な最寄り駅と次の停車駅が違う場合場合 かつ 次の停車駅に近づいていなければtrue
    if (stationForHeader?.id !== station?.id && !approaching) {
      return true
    }
    // 地理的な最寄り駅と次の停車駅が同じ場合に到着していない かつ 接近もしていない場合true
    return !arrived && !approaching
  }, [approaching, arrived, nextStation, station, stationForHeader?.id])

  const isExtraLangAvailable = useMemo(
    () => !!station?.nameChinese || !!station?.nameKorean,
    [station?.nameChinese, station?.nameKorean]
  )

  useIntervalEffect(
    useCallback(() => {
      const currentHeaderState = headerStateRef.current.split(
        '_'
      )[0] as HeaderState
      const currentHeaderStateLang =
        (headerStateRef.current.split('_')[1] as HeaderLangState) || 'JA'
      const currentLangIndex = enabledLanguagesRef.current.indexOf(
        currentHeaderStateLang !== 'KANA' ? currentHeaderStateLang : 'JA'
      )
      const nextLang =
        currentLangIndex !== -1
          ? enabledLanguagesRef.current[currentLangIndex + 1]
          : null

      switch (currentHeaderState) {
        case 'ARRIVING': {
          switch (currentHeaderStateLang) {
            case 'JA':
              setNavigation((prev) => ({
                ...prev,
                headerState: 'ARRIVING_KANA',
              }))
              break
            default:
              if (!nextLang) {
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
          break
        }
        case 'CURRENT': {
          if (showNextExpression) {
            setNavigation((prev) => ({
              ...prev,
              headerState: 'NEXT',
            }))
            break
          }
          switch (currentHeaderStateLang) {
            case 'JA':
              setNavigation((prev) => ({
                ...prev,
                headerState: 'CURRENT_KANA',
              }))
              break
            default:
              if (isPassing) {
                break
              }
              if (!nextLang) {
                setNavigation((prev) => ({
                  ...prev,
                  headerState: 'CURRENT',
                }))
                break
              }
              setNavigation((prev) => ({
                ...prev,
                headerState: `CURRENT_${nextLang}` as HeaderTransitionState,
              }))
              break
          }
          break
        }
        case 'NEXT': {
          switch (currentHeaderStateLang) {
            case 'JA':
              setNavigation((prev) => ({
                ...prev,
                headerState: 'NEXT_KANA',
              }))
              break
            default:
              if (!nextLang) {
                setNavigation((prev) => ({
                  ...prev,
                  headerState: 'NEXT',
                }))
                break
              }
              setNavigation((prev) => ({
                ...prev,
                headerState: `NEXT_${nextLang}` as HeaderTransitionState,
              }))
              break
          }
          break
        }
        default:
          break
      }

      if (arrived && !getIsPass(station)) {
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
            setNavigation((prev) => ({
              ...prev,
              headerState: isJapanese ? 'CURRENT' : 'CURRENT_EN',
            }))

            break
          default:
            break
        }
      }

      if (approaching && !arrived) {
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
      headerState,
      headerStateRef,
      isExtraLangAvailable,
      isPassing,
      nextStation,
      setNavigation,
      showNextExpression,
      station,
    ]),
    headerTransitionInterval
  )
}

export default useTransitionHeaderState
