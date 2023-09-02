import { AVPlaybackStatus, Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { GOOGLE_API_KEY } from 'react-native-dotenv'
import { useRecoilValue } from 'recoil'
import devState from '../store/atoms/dev'
import navigationState from '../store/atoms/navigation'
import speechState from '../store/atoms/speech'
import getUniqueString from '../utils/uniqueString'
import useConnectivity from './useConnectivity'
import useTTSCache from './useTTSCache'
import useTTSText from './useTTSText'
import useValueRef from './useValueRef'

const useTTS = (): void => {
  const { enabled, muted } = useRecoilValue(speechState)
  const { headerState } = useRecoilValue(navigationState)
  const { devMode } = useRecoilValue(devState)

  const firstSpeech = useRef(true)

  const [textJa, textEn] = useTTSText(firstSpeech.current)
  const isInternetAvailable = useConnectivity()
  const { store, getByText } = useTTSCache()

  const prevStateText = useValueRef(headerState).current

  const prevStateIsDifferent = useMemo(
    () => prevStateText.split('_')[0] !== headerState.split('_')[0],
    [headerState, prevStateText]
  )
  const soundJa = useMemo(() => new Audio.Sound(), [])
  const soundEn = useMemo(() => new Audio.Sound(), [])

  const speakFromPath = useCallback(
    async (pathJa: string, pathEn: string) => {
      await soundJa.loadAsync({
        uri: pathJa,
      })
      await soundJa.playAsync()
      soundJa.setOnPlaybackStatusUpdate(async (jaStatus: AVPlaybackStatus) => {
        if (
          (
            jaStatus as {
              didJustFinish: boolean
            }
          ).didJustFinish
        ) {
          await soundJa.unloadAsync()

          await soundEn.loadAsync({
            uri: pathEn,
          })
          await soundEn.playAsync()
          soundEn.setOnPlaybackStatusUpdate(
            async (enStatus: AVPlaybackStatus) => {
              if (
                (
                  enStatus as {
                    didJustFinish: boolean
                  }
                ).didJustFinish
              ) {
                await soundEn.unloadAsync()
              }
            }
          )
        }
      })
    },
    [soundEn, soundJa]
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
            name: 'ja-JP-Wavenet-B',
          },
          audioConfig: {
            audioEncoding: devMode ? 'MULAW' : 'MP3',
          },
        }

        const bodyEn = {
          input: {
            ssml: `<speak>${textEn}</speak>`,
          },
          voice: {
            languageCode: 'en-US',
            name: 'en-US-Wavenet-G',
          },
          audioConfig: {
            audioEncoding: devMode ? 'MULAW' : 'MP3',
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
        if (resJa) {
          await FileSystem.writeAsStringAsync(pathJa, resJa.audioContent, {
            encoding: FileSystem.EncodingType.Base64,
          })
        }
        const pathEn = `${FileSystem.cacheDirectory}/tts_${uniqueIdEn}.wav`
        if (resEn.audioContent) {
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
    [devMode]
  )

  const speech = useCallback(
    async ({
      textJa,
      textEn: textEnRaw,
    }: {
      textJa: string
      textEn: string
    }) => {
      if (!textJa || !textEnRaw) {
        return
      }

      firstSpeech.current = false

      try {
        const textEn = textEnRaw
          // 環状運転のときに入る可能性
          .replaceAll('&', 'and')
          // 明治神宮前駅等で入る
          .replaceAll('`', '')
        const cachedPathJa = getByText(textJa)?.path
        const cachedPathEn = getByText(textEn)?.path

        // // キャッシュにある場合はキャッシュを再生する
        if (cachedPathJa && cachedPathEn) {
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

        await speakFromPath(pathJa, pathEn)
      } catch (err) {
        console.error(err)
      }
    },
    [fetchSpeech, getByText, speakFromPath, store]
  )

  useEffect(() => {
    if (!enabled || !isInternetAvailable) {
      return
    }

    const playAsync = async () => {
      if (prevStateIsDifferent) {
        await speech({
          textJa,
          textEn,
        })
      }
    }

    playAsync()
  }, [
    enabled,
    isInternetAvailable,
    prevStateIsDifferent,
    speech,
    textEn,
    textJa,
  ])

  const unloadEnSpeech = useCallback(async () => {
    const enStatus = await soundEn.getStatusAsync()
    if (enStatus.isLoaded) {
      await soundEn.stopAsync()
      await soundEn.unloadAsync()
    }
  }, [soundEn])
  const unloadJaSpeech = useCallback(async () => {
    const jaStatus = await soundJa.getStatusAsync()

    if (jaStatus.isLoaded) {
      await soundJa.stopAsync()
      await soundJa.unloadAsync()
    }
  }, [soundJa])

  const unloadAllSpeech = useCallback(async () => {
    await unloadEnSpeech()
    await unloadJaSpeech()
  }, [unloadEnSpeech, unloadJaSpeech])

  useEffect(() => {
    const muteAsync = async () => {
      if (muted) {
        await unloadAllSpeech()
      }
    }
    muteAsync()
  }, [muted, unloadAllSpeech])
}

export default useTTS
