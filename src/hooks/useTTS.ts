import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av'
import * as FileSystem from 'expo-file-system'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { GOOGLE_API_KEY } from 'react-native-dotenv'
import { useRecoilValue } from 'recoil'
import navigationState from '../store/atoms/navigation'
import speechState from '../store/atoms/speech'
import stationState from '../store/atoms/station'
import { isDevApp } from '../utils/isDevApp'
import getUniqueString from '../utils/uniqueString'
import useConnectivity from './useConnectivity'
import useTTSCache from './useTTSCache'
import useTTSText from './useTTSText'
import useValueRef from './useValueRef'

const useTTS = (): void => {
  const { enabled, muted, losslessEnabled } = useRecoilValue(speechState)
  const { headerState } = useRecoilValue(navigationState)
  const { selectedBound } = useRecoilValue(stationState)

  const firstSpeech = useRef(true)

  const [textJa, textEn] = useTTSText(firstSpeech.current)
  const isInternetAvailable = useConnectivity()
  const { store, getByText } = useTTSCache()

  const prevStateText = useValueRef(headerState).current

  const prevStateIsDifferent = useMemo(
    () => prevStateText.split('_')[0] !== headerState.split('_')[0],
    [headerState, prevStateText]
  )

  const soundJaRef = useRef<Audio.Sound | null>(null)
  const soundEnRef = useRef<Audio.Sound | null>(null)

  useEffect(() => {
    const setAudioModeAsync = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
          playThroughEarpieceAndroid: false,
        })
      } catch (e) {
        console.error(e)
      }
    }
    setAudioModeAsync()
  }, [])

  const speakFromPath = useCallback(
    async (pathJa: string, pathEn: string) => {
      if (!isDevApp || !selectedBound) {
        return
      }

      const { sound: soundJa } = await Audio.Sound.createAsync(
        { uri: pathJa },
        {
          shouldPlay: true,
          isMuted: muted,
        }
      )

      soundJaRef.current = soundJa

      await soundJa.playAsync()
      soundJa._onPlaybackStatusUpdate = async (jaStatus) => {
        if (jaStatus.isLoaded && jaStatus.didJustFinish) {
          await soundJa.unloadAsync()
          const { sound: soundEn } = await Audio.Sound.createAsync(
            { uri: pathEn },
            {
              shouldPlay: true,
              isMuted: muted,
            },
            async (enStatus) => {
              if (enStatus.isLoaded && enStatus.didJustFinish) {
                await soundEn.unloadAsync()
              }
            }
          )

          soundEnRef.current = soundEn

          await soundEn.playAsync()
        }
      }
    },
    [muted, selectedBound]
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
      if (!textJa.length || !textEn.length || !selectedBound) {
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
            audioEncoding: losslessEnabled ? 'LINEAR16' : 'MP3',
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
            audioEncoding: losslessEnabled ? 'LINEAR16' : 'MP3',
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
    [losslessEnabled, selectedBound]
  )

  const speech = useCallback(
    async ({ textJa, textEn }: { textJa: string; textEn: string }) => {
      if (!textJa || !textEn || !selectedBound) {
        return
      }

      const jaPlaybackStatus = await soundJaRef.current?.getStatusAsync()
      if (jaPlaybackStatus?.isLoaded && jaPlaybackStatus.isPlaying) {
        return
      }

      const enPlaybackStatus = await soundEnRef.current?.getStatusAsync()
      if (enPlaybackStatus?.isLoaded && enPlaybackStatus.isPlaying) {
        return
      }

      firstSpeech.current = false

      try {
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
    [fetchSpeech, getByText, selectedBound, speakFromPath, store]
  )

  useEffect(() => {
    if (!enabled || !isInternetAvailable || !selectedBound) {
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
    selectedBound,
    speech,
    textEn,
    textJa,
  ])

  useEffect(() => {
    if (!selectedBound) {
      const stopAsync = async () => {
        firstSpeech.current = true
        await soundJaRef.current?.stopAsync()
        await soundEnRef.current?.stopAsync()
        await soundJaRef.current?.unloadAsync()
        await soundEnRef.current?.unloadAsync()
      }
      stopAsync()
    }
  }, [selectedBound])
}

export default useTTS
