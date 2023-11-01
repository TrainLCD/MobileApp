import { useCallback } from 'react'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import navigationState from '../store/atoms/navigation'
import speechState from '../store/atoms/speech'
import stationState from '../store/atoms/station'
import { isJapanese } from '../translation'
import useMirroringShare from './useMirroringShare'
import mirroringShareState from '../store/atoms/mirroringShare'

const useResetMainState = (): (() => void) => {
  const setNavigationState = useSetRecoilState(navigationState)
  const setStationState = useSetRecoilState(stationState)
  const setSpeechState = useSetRecoilState(speechState)
  const { subscribing } = useRecoilValue(mirroringShareState)
  const { unsubscribe: unsubscribeMirroringShare } = useMirroringShare()

  const reset = useCallback(async () => {
    setNavigationState((prev) => ({
      ...prev,
      headerState: isJapanese ? 'CURRENT' : 'CURRENT_EN',
      bottomState: 'LINE',
      leftStations: [],
    }))
    setStationState((prev) => ({
      ...prev,
      selectedDirection: null,
      selectedBound: null,
      arrived: true,
    }))
    setSpeechState((prev) => ({
      ...prev,
      muted: true,
    }))
    if (subscribing) {
      unsubscribeMirroringShare()
    }
  }, [
    setNavigationState,
    setSpeechState,
    setStationState,
    subscribing,
    unsubscribeMirroringShare,
  ])

  return reset
}

export default useResetMainState
