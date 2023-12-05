import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av'
import * as FileSystem from 'expo-file-system'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { GOOGLE_API_KEY } from 'react-native-dotenv'
import { useRecoilValue } from 'recoil'
import speechState from '../store/atoms/speech'
import stationState from '../store/atoms/station'
import getIsPass from '../utils/isPass'
import getUniqueString from '../utils/uniqueString'
import useConnectivity from './useConnectivity'
import useCurrentStation from './useCurrentStation'
import { usePrevious } from './usePrevious'
import { useStoppingState } from './useStoppingState'
import useTTSCache from './useTTSCache'
import useTTSText from './useTTSText'

export const useTTS = (): void => {
  const {
    enabled,
    muted,
    losslessEnabled,
    backgroundEnabled,
    monetizedPlanEnabled,
  } = useRecoilValue(speechState)
  const { selectedBound } = useRecoilValue(stationState)

  const firstSpeech = useRef(true)

  const [textJa, textEn] = useTTSText(firstSpeech.current)
  const isInternetAvailable = useConnectivity()
  const { store, getByText } = useTTSCache()
  const stoppingState = useStoppingState()
  const currentStation = useCurrentStation()

  const prevStoppingState = usePrevious(stoppingState)

  const prevStateIsDifferent = useMemo(
    () => prevStoppingState !== stoppingState,
    [prevStoppingState, stoppingState]
  )

  const soundJaRef = useRef<Audio.Sound | null>(null)
  const soundEnRef = useRef<Audio.Sound | null>(null)

  useEffect(() => {
    const setAudioModeAsync = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: backgroundEnabled,
          interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
          playsInSilentModeIOS: backgroundEnabled,
          shouldDuckAndroid: true,
          interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
          playThroughEarpieceAndroid: false,
        })
      } catch (e) {
        console.error(e)
      }
    }
    setAudioModeAsync()
  }, [backgroundEnabled])

  const speakFromPath = useCallback(
    async (pathJa: string, pathEn: string) => {
      const { sound: soundJa } = await Audio.Sound.createAsync(
        { uri: pathJa },
        {
          isMuted: muted,
        }
      )

      soundJaRef.current = soundJa

      const { sound: soundEn } = await Audio.Sound.createAsync(
        { uri: pathEn },
        {
          isMuted: muted,
        }
      )

      soundEnRef.current = soundEn

      await soundJa.playAsync()

      soundJa._onPlaybackStatusUpdate = async (jaStatus) => {
        if (jaStatus.isLoaded && jaStatus.didJustFinish) {
          await soundJa.unloadAsync()
          soundJaRef.current = null

          await soundEn.playAsync()
        }
      }

      soundEn._onPlaybackStatusUpdate = async (enStatus) => {
        if (enStatus.isLoaded && enStatus.didJustFinish) {
          await soundEn.unloadAsync()
          soundEnRef.current = null
        }
      }
    },
    [muted]
  )

  const fetchSpeech = useCallback(
    async ({
      textJa,
      uniqueIdJa,
      textEn,
      uniqueIdEn,
    }: {
      textJa: string
      uniqueIdJa: string
      textEn: string
      uniqueIdEn: string
    }) => {
      if (!textJa.length || !textEn.length) {
        return
      }

      try {
        const url = `https://texttospeech.googleapis.com/v1beta1/text:synthesize?key=${GOOGLE_API_KEY}`
        const bodyJa = {
          input: {
            ssml: `<speak>${textJa}</speak>`,
          },
          voice: {
            languageCode: 'ja-JP',
            name:
              monetizedPlanEnabled && losslessEnabled
                ? 'ja-JP-Wavenet-B'
                : 'ja-JP-Standard-B',
          },
          audioConfig: {
            audioEncoding:
              monetizedPlanEnabled && losslessEnabled ? 'LINEAR16' : 'MP3',
          },
        }

        const bodyEn = {
          input: {
            ssml: `<speak>${textEn}</speak>`,
          },
          voice: {
            languageCode: 'en-US',
            name:
              monetizedPlanEnabled && losslessEnabled
                ? 'en-US-Wavenet-G'
                : 'en-US-Standard-G',
          },
          audioConfig: {
            audioEncoding:
              monetizedPlanEnabled && losslessEnabled ? 'LINEAR16' : 'MP3',
          },
        }

        const dataJa = await fetch(url, {
          headers: {
            'content-type': 'application/json; charset=UTF-8',
          },
          body: JSON.stringify(bodyJa),
          method: 'POST',
        })
        const resJa = await dataJa.json()
        const dataEn = await fetch(url, {
          headers: {
            'content-type': 'application/json; charset=UTF-8',
          },
          body: JSON.stringify(bodyEn),
          method: 'POST',
        })
        const resEn = await dataEn.json()
        const pathJa = `${FileSystem.cacheDirectory}/tts_${uniqueIdJa}.wav`
        if (resJa?.audioContent) {
          await FileSystem.writeAsStringAsync(pathJa, resJa.audioContent, {
            encoding: FileSystem.EncodingType.Base64,
          })
        }
        const pathEn = `${FileSystem.cacheDirectory}/tts_${uniqueIdEn}.wav`
        if (resEn?.audioContent) {
          await FileSystem.writeAsStringAsync(pathEn, resEn.audioContent, {
            encoding: FileSystem.EncodingType.Base64,
          })
        }

        return { pathJa, pathEn }
      } catch (err) {
        console.error(err)
      }

      return null
    },
    [losslessEnabled, monetizedPlanEnabled]
  )

  const speech = useCallback(
    async ({ textJa, textEn }: { textJa: string; textEn: string }) => {
      if (soundJaRef.current) {
        await soundJaRef.current?.unloadAsync()
      }
      if (soundEnRef.current) {
        await soundEnRef.current?.unloadAsync()
      }

      try {
        const cachedPathJa = getByText(textJa)?.path
        const cachedPathEn = getByText(textEn)?.path

        // キャッシュにある場合はキャッシュを再生する
        if (cachedPathJa && cachedPathEn) {
          firstSpeech.current = false
          await speakFromPath(cachedPathJa, cachedPathEn)
          return
        }

        // キャッシュにない場合はGoogle Cloud Text-to-Speech APIを叩く
        const uniqueIdJa = getUniqueString()
        const uniqueIdEn = getUniqueString()

        const paths = await fetchSpeech({
          textJa,
          uniqueIdJa,
          textEn,
          uniqueIdEn,
        })
        if (!paths) {
          return
        }
        const { pathJa, pathEn } = paths

        store(textJa, pathJa, uniqueIdJa)
        store(textEn, pathEn, uniqueIdEn)

        firstSpeech.current = false
        await speakFromPath(pathJa, pathEn)
      } catch (err) {
        console.error(err)
      }
    },
    [fetchSpeech, getByText, speakFromPath, store]
  )

  useEffect(() => {
    if (
      !enabled ||
      !isInternetAvailable ||
      getIsPass(currentStation) ||
      stoppingState === 'CURRENT'
    ) {
      return
    }

    if (prevStateIsDifferent) {
      speech({
        textJa,
        textEn,
      })
    }
  }, [
    currentStation,
    enabled,
    isInternetAvailable,
    prevStateIsDifferent,
    speech,
    stoppingState,
    textEn,
    textJa,
  ])

  useEffect(() => {
    if (!selectedBound) {
      soundJaRef.current?.unloadAsync()
      soundEnRef.current?.unloadAsync()
      firstSpeech.current = false
    }
  }, [selectedBound])
}
