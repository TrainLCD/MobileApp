import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av'
import * as FileSystem from 'expo-file-system'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { DEV_TTS_API_URL, PRODUCTION_TTS_API_URL } from 'react-native-dotenv'
import { useRecoilValue } from 'recoil'
import speechState from '../store/atoms/speech'
import { isDevApp } from '../utils/isDevApp'
import useAnonymousUser from './useAnonymousUser'
import { usePrevious } from './usePrevious'
import { useTTSCache } from './useTTSCache'
import useTTSText from './useTTSText'

export const useTTS = (): void => {
  const { enabled, losslessEnabled, backgroundEnabled, monetizedPlanEnabled } =
    useRecoilValue(speechState)

  const firstSpeechRef = useRef(true)
  const playingRef = useRef(false)
  const { store, getByText } = useTTSCache()
  const ttsText = useTTSText(firstSpeechRef.current)
  const [prevTextJa, prevTextEn] = usePrevious(ttsText)
  const [textJa, textEn] = ttsText

  const user = useAnonymousUser()

  const soundJaRef = useRef<Audio.Sound | null>(null)
  const soundEnRef = useRef<Audio.Sound | null>(null)

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: backgroundEnabled,
      interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
      playsInSilentModeIOS: backgroundEnabled,
      shouldDuckAndroid: true,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      playThroughEarpieceAndroid: false,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const speakFromPath = useCallback(async (pathJa: string, pathEn: string) => {
    firstSpeechRef.current = false

    if (!soundJaRef.current) {
      const { sound: soundJa } = await Audio.Sound.createAsync({ uri: pathJa })
      soundJaRef.current = soundJa
    } else {
      await soundJaRef.current?.loadAsync({ uri: pathJa })
    }
    if (!soundEnRef.current) {
      const { sound: soundEn } = await Audio.Sound.createAsync({ uri: pathEn })
      soundEnRef.current = soundEn
    } else {
      await soundEnRef.current?.loadAsync({ uri: pathEn })
    }

    await soundJaRef.current?.playAsync()
    playingRef.current = true

    soundJaRef.current._onPlaybackStatusUpdate = async (jaStatus) => {
      if (jaStatus.isLoaded && jaStatus.didJustFinish) {
        await soundJaRef.current?.unloadAsync()
        await soundEnRef.current?.playAsync()
      }
    }

    soundEnRef.current._onPlaybackStatusUpdate = async (enStatus) => {
      if (enStatus.isLoaded && enStatus.didJustFinish) {
        await soundEnRef.current?.unloadAsync()
        playingRef.current = false
      }
    }
  }, [])

  const ttsApiUrl = useMemo(() => {
    return isDevApp ? DEV_TTS_API_URL : PRODUCTION_TTS_API_URL
  }, [])

  const fetchSpeech = useCallback(
    async ({ textJa, textEn }: { textJa: string; textEn: string }) => {
      if (!textJa.length || !textEn.length) {
        return
      }

      const reqBody = {
        data: {
          ssmlJa: `<speak>${textJa.trim()}</speak>`,
          ssmlEn: `<speak>${textEn.trim()}</speak>`,
          premium: monetizedPlanEnabled && losslessEnabled,
        },
      }

      const idToken = await user?.getIdToken()

      const ttsJson = await (
        await fetch(ttsApiUrl, {
          headers: {
            'content-type': 'application/json; charset=UTF-8',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(reqBody),
          method: 'POST',
        })
      ).json()

      const baseDir = FileSystem.cacheDirectory

      const pathJa = `${baseDir}${ttsJson.result.id}_ja.mp3`
      if (ttsJson?.result?.jaAudioContent) {
        await FileSystem.writeAsStringAsync(
          pathJa,
          ttsJson.result.jaAudioContent,
          {
            encoding: FileSystem.EncodingType.Base64,
          }
        )
      }
      const pathEn = `${baseDir}/${ttsJson.result.id}_en.mp3`
      if (ttsJson?.result?.enAudioContent) {
        await FileSystem.writeAsStringAsync(
          pathEn,
          ttsJson.result.enAudioContent,
          {
            encoding: FileSystem.EncodingType.Base64,
          }
        )
      }

      return { id: ttsJson.result.id, pathJa, pathEn }
    },
    [losslessEnabled, monetizedPlanEnabled, ttsApiUrl, user]
  )

  const speech = useCallback(
    async ({ textJa, textEn }: { textJa: string; textEn: string }) => {
      const cache = getByText(textJa)

      if (cache) {
        await speakFromPath(cache.ja.path, cache.en.path)
        return
      }

      const fetched = await fetchSpeech({
        textJa,
        textEn,
      })
      if (!fetched) {
        return
      }

      const { id, pathJa, pathEn } = fetched

      store(
        id,
        { text: textJa, path: fetched.pathJa },
        { text: textEn, path: fetched.pathEn }
      )

      await speakFromPath(pathJa, pathEn)
    },
    [fetchSpeech, getByText, speakFromPath, store]
  )

  useEffect(() => {
    if (
      !enabled ||
      playingRef.current ||
      prevTextJa === textJa ||
      prevTextEn === textEn
    ) {
      return
    }

    speech({
      textJa,
      textEn,
    })
  }, [enabled, prevTextEn, prevTextJa, speech, textEn, textJa])

  useEffect(() => {
    return () => {
      soundJaRef.current?.unloadAsync()
      soundEnRef.current?.unloadAsync()
    }
  }, [])
}
