import * as Speech from 'expo-speech'
import { useEffect, useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import navigationState from '../store/atoms/navigation'
import speechState from '../store/atoms/speech'
import useSpeechText from './useSpeechText'
import useValueRef from './useValueRef'

const useSpeech = () => {
  const { headerState } = useRecoilValue(navigationState)
  const { enabled } = useRecoilValue(speechState)
  const prevStateText = useValueRef(headerState).current

  const prevStateIsDifferent = useMemo(
    () => prevStateText.split('_')[0] !== headerState.split('_')[0],
    [headerState, prevStateText]
  )
  const [jaSpeechText, enSpeechText] = useSpeechText()

  useEffect(() => {
    if (!enabled) {
      return
    }

    const playAsync = async () => {
      if (prevStateIsDifferent) {
        console.warn(await Speech.getAvailableVoicesAsync())
        Speech.speak(jaSpeechText, {
          language: 'ja',
          onError: console.error,
          onDone: () => {
            Speech.speak(enSpeechText, {
              language: 'en',
            })
          },
        })
      }
    }

    playAsync()
  }, [enSpeechText, enabled, jaSpeechText, prevStateIsDifferent])
}

export default useSpeech
