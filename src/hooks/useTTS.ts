import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av'
import * as Crypto from 'expo-crypto'
import * as FileSystem from 'expo-file-system'
import { useCallback, useEffect, useRef } from 'react'
import { GOOGLE_TTS_API_KEY } from 'react-native-dotenv'
import { useRecoilValue } from 'recoil'
import { TTS_CACHE_DIR } from '../constants'
import speechState from '../store/atoms/speech'
import stationState from '../store/atoms/station'
import { currentStationSelector } from '../store/selectors/currentStation'
import getIsPass from '../utils/isPass'
import useConnectivity from './useConnectivity'
import { usePrevious } from './usePrevious'
import { useStoppingState } from './useStoppingState'
import useTTSCache from './useTTSCache'
import useTTSText from './useTTSText'

export const useTTS = (): void => {
  const { enabled, losslessEnabled, backgroundEnabled, monetizedPlanEnabled } =
    useRecoilValue(speechState)
  const { selectedBound } = useRecoilValue(stationState)
  const currentStation = useRecoilValue(currentStationSelector({}))

  const firstSpeechRef = useRef(true)
  const playingRef = useRef(false)

  const ttsText = useTTSText(firstSpeechRef.current)
  const prevTTSText = usePrevious(ttsText)

  const [textJa, textEn] = ttsText

  const isInternetAvailable = useConnectivity()
  const { store, getByText } = useTTSCache()
  const stoppingState = useStoppingState()

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

  const fetchSpeech = useCallback(
    async ({
      textJa,
      jaId,
      textEn,
      enId,
    }: {
      textJa: string
      jaId: string
      textEn: string
      enId: string
    }) => {
      if (!textJa.length || !textEn.length) {
        return
      }

      const url = `https://texttospeech.googleapis.com/v1beta1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`
      const bodyJa = {
        input: {
          ssml: `<speak>${textJa.trim()}</speak>`,
        },
        voice: {
          languageCode: 'ja-JP',
          name:
            monetizedPlanEnabled && losslessEnabled
              ? 'ja-JP-Neural2-B'
              : 'ja-JP-Standard-B',
        },
        audioConfig: {
          audioEncoding:
            monetizedPlanEnabled && losslessEnabled ? 'LINEAR16' : 'MP3',
          effectsProfileId: ['handset-class-device'],
        },
      }

      const bodyEn = {
        input: {
          ssml: `<speak>${textEn.trim()}</speak>`,
        },
        voice: {
          languageCode: 'en-US',
          name:
            monetizedPlanEnabled && losslessEnabled
              ? 'en-US-Neural2-G'
              : 'en-US-Standard-G',
        },
        audioConfig: {
          audioEncoding:
            monetizedPlanEnabled && losslessEnabled ? 'LINEAR16' : 'MP3',
          effectsProfileId: ['handset-class-device'],
        },
      }

      const dataJa = await fetch(url, {
        headers: {
          'content-type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(bodyJa),
        method: 'POST',
      })
      const dataEn = await fetch(url, {
        headers: {
          'content-type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(bodyEn),
        method: 'POST',
      })

      const baseDir = `${FileSystem.documentDirectory}${TTS_CACHE_DIR}`

      const baseDirInfo = await FileSystem.getInfoAsync(baseDir)
      if (!baseDirInfo.exists) {
        await FileSystem.makeDirectoryAsync(baseDir)
      }

      const extension =
        monetizedPlanEnabled && losslessEnabled ? '.wav' : '.mp3'

      const pathJa = `${baseDir}/${jaId}${extension}`
      const resJa = await dataJa.json()
      if (resJa?.audioContent) {
        await FileSystem.writeAsStringAsync(pathJa, resJa.audioContent, {
          encoding: FileSystem.EncodingType.Base64,
        })
      }
      const pathEn = `${baseDir}/${enId}${extension}`
      const resEn = await dataEn.json()
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
    async ({
      textJa: textJaReq,
      textEn: textEnReq,
    }: {
      textJa: string
      textEn: string
    }) => {
      const [prevTextJa, prevTextEn] = prevTTSText

      if (prevTextJa === textJaReq || prevTextEn === textEnReq) {
        return
      }

      const cachedPathJa = (await getByText(textJaReq))?.path
      const cachedPathEn = (await getByText(textEnReq))?.path

      // キャッシュにある場合はキャッシュを再生する
      if (cachedPathJa && cachedPathEn) {
        await speakFromPath(cachedPathJa, cachedPathEn)
        return
      }

      // キャッシュにない場合はGoogle Cloud Text-to-Speech APIを叩く
      const jaId = Crypto.randomUUID()
      const enId = Crypto.randomUUID()
      const paths = await fetchSpeech({
        textJa: textJaReq,
        jaId,
        textEn: textEnReq,
        enId,
      })
      if (!paths) {
        return
      }
      const { pathJa, pathEn } = paths

      await speakFromPath(pathJa, pathEn)
      await store(jaId, textJaReq, pathJa)
      await store(enId, textEnReq, pathEn)
    },
    [fetchSpeech, getByText, prevTTSText, speakFromPath, store]
  )

  useEffect(() => {
    const speechAsync = async () => {
      if (
        (playingRef.current && !firstSpeechRef.current) ||
        !enabled ||
        !isInternetAvailable ||
        getIsPass(currentStation) ||
        stoppingState === 'CURRENT'
      ) {
        return
      }

      await speech({
        textJa,
        textEn,
      })
    }
    speechAsync()
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
        firstSpeechRef.current = true
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
