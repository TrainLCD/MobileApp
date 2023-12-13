import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av'
import * as FileSystem from 'expo-file-system'
import { useCallback, useEffect, useRef } from 'react'
import { GOOGLE_API_KEY } from 'react-native-dotenv'
import { useRecoilValue } from 'recoil'
import speechState from '../store/atoms/speech'
import stationState from '../store/atoms/station'
import getIsPass from '../utils/isPass'
import getUniqueString from '../utils/uniqueString'
import useConnectivity from './useConnectivity'
import useCurrentStation from './useCurrentStation'
import { useStoppingState } from './useStoppingState'
import useTTSCache from './useTTSCache'
import useTTSText from './useTTSText'

export const useTTS = (): void => {
  const { enabled, losslessEnabled, backgroundEnabled, monetizedPlanEnabled } =
    useRecoilValue(speechState)
  const { selectedBound } = useRecoilValue(stationState)

  const firstSpeechRef = useRef(true)
  const playingRef = useRef(false)

  const [textJa, textEn] = useTTSText(firstSpeechRef.current)
  const isInternetAvailable = useConnectivity()
  const { store, getByText } = useTTSCache()
  const stoppingState = useStoppingState()
  const currentStation = useCurrentStation()

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
    const { sound: soundJa } = await Audio.Sound.createAsync({ uri: pathJa })
    const { sound: soundEn } = await Audio.Sound.createAsync({ uri: pathEn })

    playingRef.current = true
    await soundJa.playAsync()
    soundJaRef.current = soundJa

    soundJa._onPlaybackStatusUpdate = async (jaStatus) => {
      if (jaStatus.isLoaded && jaStatus.didJustFinish) {
        await soundJa.unloadAsync()
        await soundEn.playAsync()
        soundEnRef.current = soundEn
      }
    }

    soundEn._onPlaybackStatusUpdate = async (enStatus) => {
      if (enStatus.isLoaded && enStatus.didJustFinish) {
        await soundEn.unloadAsync()
        playingRef.current = false
      }
    }
  }, [])

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
    },
    [losslessEnabled, monetizedPlanEnabled]
  )

  const speech = useCallback(
    async ({ textJa, textEn }: { textJa: string; textEn: string }) => {
      const cachedPathJa = getByText(textJa)?.path
      const cachedPathEn = getByText(textEn)?.path

      // キャッシュにある場合はキャッシュを再生する
      if (cachedPathJa && cachedPathEn) {
        firstSpeechRef.current = false
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

      firstSpeechRef.current = false
      await speakFromPath(pathJa, pathEn)
    },
    [fetchSpeech, getByText, speakFromPath, store]
  )

  useEffect(() => {
    if (
      (playingRef.current && !firstSpeechRef.current) ||
      !enabled ||
      !isInternetAvailable ||
      getIsPass(currentStation) ||
      stoppingState === 'CURRENT'
    ) {
      return
    }

    speech({
      textJa,
      textEn,
    })
  }, [
    currentStation,
    enabled,
    isInternetAvailable,
    speech,
    stoppingState,
    textEn,
    textJa,
  ])

  useEffect(() => {
    const cleanup = async () => {
      if (!selectedBound) {
        firstSpeechRef.current = false
        playingRef.current = false
        await soundJaRef.current?.unloadAsync()
        await soundEnRef.current?.unloadAsync()
      }
    }

    cleanup()
    return () => {
      cleanup()
    }
  }, [selectedBound])
}
