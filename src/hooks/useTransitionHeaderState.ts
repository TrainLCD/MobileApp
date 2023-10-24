import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import { AvailableLanguage } from '../constants/languages'
import { HeaderTransitionState } from '../models/HeaderTransitionState'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import tuningState from '../store/atoms/tuning'
import getIsPass from '../utils/isPass'
import useIntervalEffect from './useIntervalEffect'
import { useIsLEDTheme } from './useIsLEDTheme'
import { useNextStation } from './useNextStation'
import useValueRef from './useValueRef'
import { isJapanese } from '../translation'

type HeaderState = 'CURRENT' | 'NEXT' | 'ARRIVING'
type HeaderLangState = 'JA' | 'KANA' | 'EN' | 'ZH' | 'KO'

const useTransitionHeaderState = (): void => {
  const { arrived, approaching, station } = useRecoilValue(stationState)
  const [{ headerState, enabledLanguages, stationForHeader }, setNavigation] =
    useRecoilState(navigationState)
  const { headerTransitionInterval } = useRecoilValue(tuningState)
  const isLEDTheme = useIsLEDTheme()

  const headerStateRef = useValueRef(headerState)
  const enabledLanguagesRef = useRef<AvailableLanguage[]>(
    isLEDTheme ? ['JA', 'EN'] : enabledLanguages
  )

  const nextStation = useNextStation()

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

  const showNextExpressionRef = useValueRef(showNextExpression)

  const isExtraLangAvailable = useMemo(
    () => !!station?.nameChinese || !!station?.nameKorean,
    [station?.nameChinese, station?.nameKorean]
  )
  const currentHeaderState = useMemo(
    () => headerStateRef.current.split('_')[0] as HeaderState,
    [headerStateRef]
  )
  const currentHeaderStateLang = useMemo(
    () => (headerStateRef.current.split('_')[1] as HeaderLangState) || 'JA',
    [headerStateRef]
  )
  const nextLang = useMemo(() => {
    const currentLangIndex = enabledLanguagesRef.current.indexOf(
      currentHeaderStateLang !== 'KANA' ? currentHeaderStateLang : 'JA'
    )
    return currentLangIndex !== -1
      ? enabledLanguagesRef.current[currentLangIndex + 1]
      : null
  }, [currentHeaderStateLang])

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

  useIntervalEffect(
    useCallback(() => {
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
      currentHeaderState,
      currentHeaderStateLang,
      isExtraLangAvailable,
      nextLang,
      nextStation,
      setNavigation,
    ]),
    headerTransitionInterval
  )

  useIntervalEffect(
    useCallback(() => {
      switch (currentHeaderState) {
        case 'CURRENT': {
          if (showNextExpressionRef.current) {
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
    }, [
      currentHeaderState,
      currentHeaderStateLang,
      nextLang,
      setNavigation,
      showNextExpressionRef,
    ]),
    headerTransitionInterval
  )
}

export default useTransitionHeaderState
