import { useCallback, useEffect, useRef } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import navigationState from '../store/atoms/navigation'
import tuningState from '../store/atoms/tuning'
import { isLEDSelector } from '../store/selectors/isLED'
import useIntervalEffect from './useIntervalEffect'
import useNextOperatorTrainTypeIsDifferent from './useNextOperatorTrainTypeIsDifferent'
import useShouldHideTypeChange from './useShouldHideTypeChange'
import useTransferLines from './useTransferLines'
import useValueRef from './useValueRef'

const useUpdateBottomState = (): { pause: () => void } => {
  const [{ bottomState }, setNavigation] = useRecoilState(navigationState)
  const { bottomTransitionInterval } = useRecoilValue(tuningState)
  const bottomStateRef = useValueRef(bottomState)
  const isLEDTheme = useRecoilValue(isLEDSelector)

  const nextOperatorTrainTypeIsDifferent = useNextOperatorTrainTypeIsDifferent()
  const nextOperatorTrainTypeIsDifferentRef = useValueRef(
    nextOperatorTrainTypeIsDifferent
  )
  const transferLines = useTransferLines()
  const isLEDThemeRef = useRef(isLEDTheme)
  const shouldHideTypeChange = useShouldHideTypeChange()
  const shouldHideTypeChangeRef = useRef(shouldHideTypeChange)

  useEffect(() => {
    if (!transferLines.length) {
      setNavigation((prev) => ({ ...prev, bottomState: 'LINE' }))
    }
  }, [setNavigation, transferLines.length])

  const { pause } = useIntervalEffect(
    useCallback(() => {
      if (isLEDThemeRef.current) {
        return
      }

      switch (bottomStateRef.current) {
        case 'LINE':
          if (transferLines.length) {
            setNavigation((prev) => ({ ...prev, bottomState: 'TRANSFER' }))
            return
          }
          if (
            nextOperatorTrainTypeIsDifferentRef.current &&
            !shouldHideTypeChangeRef.current
          ) {
            setNavigation((prev) => ({
              ...prev,
              bottomState: 'TYPE_CHANGE',
            }))
          }
          break
        case 'TRANSFER':
          if (
            nextOperatorTrainTypeIsDifferentRef.current &&
            !shouldHideTypeChangeRef.current
          ) {
            setNavigation((prev) => ({
              ...prev,
              bottomState: 'TYPE_CHANGE',
            }))
          } else {
            setNavigation((prev) => ({ ...prev, bottomState: 'LINE' }))
          }
          break
        case 'TYPE_CHANGE':
          setNavigation((prev) => ({
            ...prev,
            bottomState: 'LINE',
          }))
          break
        default:
          break
      }
    }, [
      bottomStateRef,
      nextOperatorTrainTypeIsDifferentRef,
      setNavigation,
      transferLines.length,
    ]),
    bottomTransitionInterval
  )
  return { pause }
}

export default useUpdateBottomState
