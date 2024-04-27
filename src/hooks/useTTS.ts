import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av'
import * as FileSystem from 'expo-file-system'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import DeviceInfo from 'react-native-device-info'
import {
  DEV_TTS_API_URL,
  LOCAL_TTS_API_URL,
  PRODUCTION_TTS_API_URL,
} from 'react-native-dotenv'
import { useRecoilValue } from 'recoil'
import speechState from '../store/atoms/speech'
import stationState from '../store/atoms/station'
import { isDevApp } from '../utils/isDevApp'
import useAnonymousUser from './useAnonymousUser'
import useConnectivity from './useConnectivity'
import { usePrevious } from './usePrevious'
import { useTTSCache } from './useTTSCache'
import useTTSText from './useTTSText'

export const useTTS = (): void => {
  const { enabled, losslessEnabled, backgroundEnabled, monetizedPlanEnabled } =
    useRecoilValue(speechState)
  const { selectedBound } = useRecoilValue(stationState)

  const firstSpeechRef = useRef(true)
  const playingRef = useRef(false)
  const { store, getByText } = useTTSCache()

  const ttsText = useTTSText(firstSpeechRef.current)
  const prevTTSText = usePrevious(ttsText)

  const [textJa, textEn] = ttsText

  const isInternetAvailable = useConnectivity()
  const user = useAnonymousUser()

  const soundJaRef = useRef<Audio.Sound | null>(null)
  const soundEnRef = useRef<Audio.Sound | null>(null)

  useEffect(() => {
    const setAudioModeAsync = async () => {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: backgroundEnabled,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        playsInSilentModeIOS: backgroundEnabled,
        shouldDuckAndroid: true,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        playThroughEarpieceAndroid: false,
      })
    }
    setAudioModeAsync()
  }, [backgroundEnabled])

  const speakFromPath = useCallback(async (pathJa: string, pathEn: string) => {
    firstSpeechRef.current = false

    await soundJaRef.current?.unloadAsync()
    await soundEnRef.current?.unloadAsync()

    const { sound: soundJa } = await Audio.Sound.createAsync({ uri: pathJa })
    soundJaRef.current = soundJa
    const { sound: soundEn } = await Audio.Sound.createAsync({ uri: pathEn })
    soundEnRef.current = soundEn

    await soundJa.playAsync()
    playingRef.current = true

    soundJa._onPlaybackStatusUpdate = async (jaStatus) => {
      if (jaStatus.isLoaded && jaStatus.didJustFinish) {
        await soundEn.playAsync()
      }
    }

    soundEn._onPlaybackStatusUpdate = async (enStatus) => {
      if (enStatus.isLoaded && enStatus.didJustFinish) {
        playingRef.current = false
      }
    }
  }, [])

  const ttsApiUrl = useMemo(() => {
    if (__DEV__ && DeviceInfo.isEmulatorSync()) {
      return LOCAL_TTS_API_URL
    }
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

      const extension =
        monetizedPlanEnabled && losslessEnabled ? '.wav' : '.mp3'

      const pathJa = `${baseDir}${ttsJson.result.id}_ja${extension}`
      if (ttsJson?.result?.jaAudioContent) {
        await FileSystem.writeAsStringAsync(
          pathJa,
          ttsJson.result.jaAudioContent,
          {
            encoding: FileSystem.EncodingType.Base64,
          }
        )
      }
      const pathEn = `${baseDir}/${ttsJson.result.id}_en${extension}`
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
    const speechAsync = async () => {
      const [prevTextJa, prevTextEn] = prevTTSText

      if (
        playingRef.current ||
        !enabled ||
        !isInternetAvailable ||
        prevTextJa === textJa ||
        prevTextEn === textEn
      ) {
        return
      }

      await speech({
        textJa,
        textEn,
      })
    }
    speechAsync()
  }, [enabled, isInternetAvailable, prevTTSText, speech, textEn, textJa])

  useEffect(() => {
    const cleanup = async () => {
      if (!selectedBound) {
        firstSpeechRef.current = true
        playingRef.current = false
        await soundJaRef.current?.unloadAsync()
        await soundEnRef.current?.unloadAsync()
      }
    }

    return () => {
      cleanup()
    }
  }, [selectedBound])
}
