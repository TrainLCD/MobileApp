// TODO: 都営地下鉄のTTSバリエーションの実装
import { AVPlaybackStatus, Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system'
import { useCallback, useEffect, useMemo } from 'react'
import { GOOGLE_API_KEY } from 'react-native-dotenv'
import { useRecoilValue } from 'recoil'
import { parenthesisRegexp } from '../constants/regexp'
import { Station } from '../gen/stationapi_pb'
import { directionToDirectionName } from '../models/Bound'
import { APP_THEME } from '../models/Theme'
import devState from '../store/atoms/dev'
import navigationState from '../store/atoms/navigation'
import speechState from '../store/atoms/speech'
import stationState from '../store/atoms/station'
import themeState from '../store/atoms/theme'
import capitalizeFirstLetter from '../utils/capitalizeFirstLetter'
import getIsPass from '../utils/isPass'
import omitJRLinesIfThresholdExceeded from '../utils/jr'
import { getIsLoopLine, getIsMeijoLine } from '../utils/loopLine'
import {
  getNextInboundStopStation,
  getNextOutboundStopStation,
} from '../utils/nextStation'
import replaceSpecialChar from '../utils/replaceSpecialChar'
import getSlicedStations from '../utils/slicedStations'
import SSMLBuilder from '../utils/ssml'
import getUniqueString from '../utils/uniqueString'
import useConnectedLines from './useConnectedLines'
import useConnectivity from './useConnectivity'
import useCurrentLine from './useCurrentLine'
import useCurrentStation from './useCurrentStation'
import useCurrentTrainType from './useCurrentTrainType'
import useLoopLineBound from './useLoopLineBound'
import useNextLine from './useNextLine'
import useNextStation from './useNextStation'
import useStationNumberIndexFunc from './useStationNumberIndexFunc'
import useTTSCache from './useTTSCache'
import useTransferLines from './useTransferLines'
import useValueRef from './useValueRef'

const useTTS = (): void => {
  const { headerState } = useRecoilValue(navigationState)
  const {
    selectedBound: selectedBoundOrigin,
    stations,
    selectedDirection,
    arrived,
  } = useRecoilValue(stationState)
  const { devMode } = useRecoilValue(devState)
  const { theme } = useRecoilValue(themeState)
  const { enabled, muted } = useRecoilValue(speechState)
  const prevStateText = useValueRef(headerState).current
  const firstSpeech = useValueRef(true)

  const soundJa = useMemo(() => new Audio.Sound(), [])
  const soundEn = useMemo(() => new Audio.Sound(), [])

  const isInternetAvailable = useConnectivity()
  const trainType = useCurrentTrainType()
  const currentLineOrigin = useCurrentLine()
  const nextLineOrigin = useNextLine()
  const station = useCurrentStation()
  const transferLinesOriginal = useTransferLines()

  const transferLines = useMemo(
    () =>
      omitJRLinesIfThresholdExceeded(transferLinesOriginal).map((l) => ({
        ...l,
        nameRoman: l.nameRoman.replace('JR', 'J-R'),
      })),
    [transferLinesOriginal]
  )

  const currentLine = useMemo(
    () =>
      currentLineOrigin && {
        ...currentLineOrigin,
        nameRoman: currentLineOrigin.nameRoman
          .replace('JR', 'J-R')
          .replace(parenthesisRegexp, ''),
      },
    [currentLineOrigin]
  )
  const nextLine = useMemo(
    () =>
      nextLineOrigin && {
        ...nextLineOrigin,
        nameRoman: nextLineOrigin.nameRoman
          .replace('JR', 'J-R')
          .replace(parenthesisRegexp, ''),
      },
    [nextLineOrigin]
  )
  const loopLineBoundJa = useLoopLineBound(false)
  const loopLineBoundEn = useLoopLineBound(false, 'EN')

  const getStationNumberIndex = useStationNumberIndexFunc()

  const currentTrainType = useCurrentTrainType()

  const isLoopLine = getIsLoopLine(currentLine, currentTrainType)

  const selectedBound = selectedBoundOrigin && {
    ...selectedBoundOrigin,
    nameRoman: selectedBoundOrigin.nameRoman
      ?.replace('JR', 'J-R')
      ?.replace(parenthesisRegexp, ''),
  }

  const connectedLinesOrigin = useConnectedLines()
  const connectedLines = useMemo(
    () =>
      connectedLinesOrigin &&
      connectedLinesOrigin.map((l) => ({
        ...l,
        nameRoman: l.nameRoman
          .replace('JR', 'J-R')
          .replace(parenthesisRegexp, ''),
      })),
    [connectedLinesOrigin]
  )

  const { store, getByText } = useTTSCache()

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
      const url = `https://texttospeech.googleapis.com/v1beta1/text:synthesize?key=${GOOGLE_API_KEY}`
      const bodyJa = {
        input: {
          ssml: `<speak>${textJa}</speak>`,
        },
        voice: {
          languageCode: 'ja-JP',
          name: devMode ? 'ja-JP-Neural2-B' : 'ja-JP-Standard-B',
        },
        audioConfig: {
          audioEncoding: devMode ? 'LINEAR16' : 'MP3',
          speakingRate: 1.15,
        },
      }
      const bodyEn = {
        input: {
          ssml: `<speak>${textEn}</speak>`,
        },
        voice: {
          languageCode: 'en-US',
          name: devMode ? 'en-US-Neural2-G' : 'en-US-Standard-E',
        },
        audioConfig: {
          audioEncoding: devMode ? 'LINEAR16' : 'MP3',
          speakingRate: devMode ? 1.15 : 1,
          pitch: devMode ? -6.0 : 1,
        },
      }

      try {
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

  const speech = useCallback(
    async ({
      textJa,
      textEn: textEnRaw,
    }: {
      textJa: string
      textEn: string
    }) => {
      const textEn = textEnRaw
        // 環状運転のときに入る可能性
        .replaceAll('&', 'and')
        // 明治神宮前駅等で入る
        .replaceAll('`', '')
      const cachedPathJa = getByText(textJa)?.path
      const cachedPathEn = getByText(textEn)?.path

      // キャッシュにある場合はキャッシュを再生する
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

      if (firstSpeech.current) {
        firstSpeech.current = false
      }
    },
    [fetchSpeech, firstSpeech, getByText, speakFromPath, store]
  )

  const actualNextStation = useNextStation(false)

  const nextOutboundStopStation =
    station &&
    actualNextStation &&
    getNextOutboundStopStation(stations, actualNextStation, station)
  const nextInboundStopStation =
    station &&
    actualNextStation &&
    getNextInboundStopStation(stations, actualNextStation, station)

  const nextStationOrigin =
    selectedDirection === 'INBOUND'
      ? nextInboundStopStation
      : nextOutboundStopStation
  const nextStation = useMemo(
    () =>
      nextStationOrigin && {
        ...nextStationOrigin,
        nameRoman: nextStationOrigin.nameRoman.replace('JR', 'J-R'),
      },
    [nextStationOrigin]
  )

  const nextStationNumberIndex = getStationNumberIndex(nextStation ?? undefined)

  const stationNumberRaw =
    nextStation?.stationNumbersList[nextStationNumberIndex]?.stationNumber
  const stationNumber = useMemo(() => {
    if (!stationNumberRaw) {
      return ''
    }
    if (!stationNumberRaw?.includes('-')) {
      // 基本的に英語でしかナンバリング放送はしないので日本語は考慮しなくてよい
      return `Station number ${stationNumberRaw}`
    }

    return stationNumberRaw
      ? `${stationNumberRaw.split('-')[0]?.split('')?.join('-') ?? ''}
        ${stationNumberRaw.split('-').slice(1).map(Number).join('-')}`
      : ''
  }, [stationNumberRaw])

  const prevStateIsDifferent =
    prevStateText.split('_')[0] !== headerState.split('_')[0]

  const slicedStationsOrigin = getSlicedStations({
    stations,
    currentStation: station,
    isInbound: selectedDirection === 'INBOUND',
    arrived,
    currentLine,
    trainType: currentTrainType,
  })

  // 直通時、同じGroupIDの駅が違う駅として扱われるのを防ぐ(ex. 渋谷の次は、渋谷に止まります)
  const slicedStations = Array.from(
    new Set(slicedStationsOrigin.map((s) => s.groupId))
  )
    .map((gid) => slicedStationsOrigin.find((s) => s.groupId === gid))
    .filter((s) => !!s) as Station.AsObject[]

  const allStops = slicedStations.filter((s) => {
    if (s.id === station?.id) {
      return false
    }
    return !getIsPass(s)
  })

  const getHasTerminus = useCallback(
    (hops: number) => allStops.slice(0, hops).length < hops,
    [allStops]
  )

  const afterNextStationIndex = useMemo(
    () =>
      slicedStations.findIndex((s) => {
        if (s.id === station?.id) {
          return false
        }
        if (s.id === nextStation?.id) {
          return false
        }
        return !getIsPass(s)
      }),
    [nextStation?.id, slicedStations, station?.id]
  )

  const afterNextStation = useMemo(() => {
    const afterNextStationOrigin = slicedStations[afterNextStationIndex]
    return (
      afterNextStationOrigin && {
        ...afterNextStationOrigin,
        nameRoman: afterNextStationOrigin.nameRoman.replace('JR', 'J-R'),
        lines: afterNextStationOrigin.linesList.map((l) => ({
          ...l,
          nameRoman: l.nameRoman
            .replace('JR', 'J-R')
            .replace(parenthesisRegexp, ''),
        })),
      }
    )
  }, [afterNextStationIndex, slicedStations])

  const nextStopStationIndex = useMemo(
    () =>
      slicedStations.findIndex((s) => {
        if (s.id === station?.id) {
          return false
        }
        return !getIsPass(s)
      }),
    [slicedStations, station?.id]
  )

  const shouldSpeakTerminus = useMemo(
    () => getHasTerminus(2) && !isLoopLine,
    [getHasTerminus, isLoopLine]
  )

  const betweenAfterNextStation = useMemo(
    () => slicedStations.slice(nextStopStationIndex + 1, afterNextStationIndex),
    [afterNextStationIndex, nextStopStationIndex, slicedStations]
  )

  const betweenNextStation = useMemo(
    () =>
      slicedStations
        .slice(0, nextStopStationIndex)
        .filter((s) => s.groupId !== station?.groupId),
    [nextStopStationIndex, slicedStations, station?.groupId]
  )

  const trainTypeName = useMemo(() => {
    const localJaNoun = theme === APP_THEME.JR_WEST ? '普通' : '各駅停車'

    return currentTrainType?.name?.replace(parenthesisRegexp, '') || localJaNoun
  }, [currentTrainType?.name, theme])

  const trainTypeNameEn = useMemo(
    () =>
      currentTrainType?.nameRoman
        ?.replace(parenthesisRegexp, '')
        // 基本的に種別にJRは入らないが念の為replace('JR', 'J-R')している
        ?.replace('JR', 'J-R') || 'Local',
    [currentTrainType?.nameRoman]
  )

  const getNextTextJaExpress = useCallback((): string => {
    const ssmlBuilder = new SSMLBuilder()

    const bounds = Array.from(new Set(allStops.map((s) => s.nameKatakana)))
      .slice(2, 5)
      .map((n, i, a) => (a.length - 1 !== i ? `${n}、` : n))

    switch (theme) {
      case APP_THEME.TOKYO_METRO:
      case APP_THEME.TOEI:
      case APP_THEME.TY: {
        if (firstSpeech.current) {
          ssmlBuilder
            .addSay(currentLine?.nameKatakana)
            .addSay(
              'をご利用くださいまして、ありがとうございます。この電車は、'
            )
            .addSay(bounds.length ? bounds.join('') : '')
            .addSay(bounds.length ? '方面、' : '')
            .addSay(
              connectedLines.length
                ? `${connectedLines
                    .map((nl) => nl.nameKatakana)
                    .join('、')}直通、`
                : ''
            )
            .addSay(`${trainTypeName}、`)
            .addSay(selectedBound?.nameKatakana)
            .addSay('ゆきです。')
        }

        if (shouldSpeakTerminus && !isLoopLine) {
          return ssmlBuilder
            .addSay('次は、')
            .addSay(nextStation?.nameKatakana)
            .addSay('終点です。')
            .addSay(
              transferLines.length
                ? `${transferLines
                    .map((l) => l.nameShort)
                    .join('、')}はお乗り換えください。`
                : ''
            )
            .get()
        }

        ssmlBuilder
          .addSay('次は、')
          .addSay(nextStation?.nameKatakana)
          .addSay(shouldSpeakTerminus ? '、終点' : '')
          .addSay('です。')

        if (!afterNextStation) {
          return ssmlBuilder
            .addSay(
              transferLines.length
                ? `${transferLines
                    .map((l) => l.nameShort)
                    .join('、')}はお乗り換えください。`
                : ''
            )
            .get()
        }
        return ssmlBuilder
          .addSay(nextStation?.nameKatakana)
          .addSay('の次は、')
          .addSay(getHasTerminus(3) && !isLoopLine ? '終点、' : '')
          .addSay(afterNextStation?.nameKatakana)
          .addSay('に停まります。')
          .addSay(
            betweenAfterNextStation.length
              ? `${betweenAfterNextStation
                  .map((sta) => sta.nameKatakana)
                  .join('、')}へおいでのお客様${
                  transferLines.length ? 'と、' : 'はお乗り換えください。'
                }`
              : ''
          )
          .addSay(
            transferLines.length
              ? `${transferLines
                  .map((l) => l.nameShort)
                  .join('、')}はお乗り換えください。`
              : ''
          )
          .get()
      }
      case APP_THEME.SAIKYO:
      case APP_THEME.YAMANOTE: {
        if (firstSpeech.current) {
          ssmlBuilder
            .addSay('本日も、')
            .addSay(currentLine?.company?.nameShort)
            .addSay(
              'をご利用くださいまして、ありがとうございます。この電車は、'
            )
            .addSay(
              connectedLines.length
                ? `${connectedLines
                    .map((nl) => nl.nameKatakana)
                    .join('、')}直通、`
                : ''
            )
            .addSay(`${trainTypeName}、`)
            .addSay(selectedBound?.nameKatakana)
            .addSay('ゆきです。')
        }

        return ssmlBuilder
          .addSay('次は、')
          .addSay(shouldSpeakTerminus ? '、終点' : '')
          .addSay(`${nextStation?.nameKatakana}、`)
          .addSay(nextStation?.nameKatakana)
          .addSay('。')
          .addSay(
            transferLines.length
              ? `${transferLines
                  .map((l) => l.nameShort)
                  .join('、')}はお乗り換えください。`
              : ''
          )
          .get()
      }
      case APP_THEME.JR_WEST: {
        if (firstSpeech.current) {
          ssmlBuilder
            .addSay('今日も、')
            .addSay(currentLine?.company?.nameShort)
            .addSay(
              'をご利用くださいまして、ありがとうございます。この電車は、'
            )
            .addSay(`${trainTypeName}、`)
            .addSay(selectedBound?.nameKatakana)
            .addSay('ゆきです。')
            .addSay('次は、')
            .addSay(`${nextStation?.nameKatakana}、`)
            .addSay(nextStation?.nameKatakana)
            .addSay('です。')
            .addSay(
              allStops
                .slice(0, 5)
                .map((s) =>
                  s.id === selectedBound?.id && !isLoopLine
                    ? `終点、${s.nameKatakana}`
                    : s.nameKatakana
                )
                .join('、')
            )
            .addSay('の順に止まります。')
            .addSay(
              getHasTerminus(6)
                ? ''
                : `${
                    allStops
                      .slice(0, 5)
                      .filter((s) => s)
                      .reverse()[0]?.nameKatakana
                  }から先は、後ほどご案内いたします。`
            )
            .get()
        }
        return ssmlBuilder
          .addSay('次は、')
          .addSay(`${nextStation?.nameKatakana}、`)
          .addSay(nextStation?.nameKatakana)
          .addSay('です。')
          .get()
      }
      default:
        return ''
    }
  }, [
    afterNextStation,
    allStops,
    betweenAfterNextStation,
    connectedLines,
    currentLine?.company?.nameShort,
    currentLine?.nameKatakana,
    firstSpeech,
    getHasTerminus,
    isLoopLine,
    transferLines,
    nextStation?.nameKatakana,
    selectedBound?.id,
    selectedBound?.nameKatakana,
    shouldSpeakTerminus,
    theme,
    trainTypeName,
  ])

  const nextStationNameR = useMemo(
    () =>
      nextStation &&
      replaceSpecialChar(nextStation.nameRoman)
        ?.split(/(\s+)/)
        .map((c) => capitalizeFirstLetter(c.toLowerCase()))
        .join(''),
    [nextStation]
  )

  const getNextTextEnExpress = useCallback((): string => {
    const ssmlBuilder = new SSMLBuilder()

    if (theme === APP_THEME.TY && connectedLines[0]) {
      return ssmlBuilder
        .addSay('This train will merge and continue traveling as a')
        .addSay(trainTypeNameEn)
        .addSay('train, on the')
        .addSay(connectedLines[0].nameRoman)
        .addBreak('100ms')
        .addSay('to')
        .addSay(selectedBound?.nameRoman)
        .addBreak('100ms')
        .addSay('The next station is')
        .addSay(nextStationNameR)
        .addBreak('100ms')
        .addSay(stationNumber)
        .addSay(shouldSpeakTerminus ? 'terminal.' : '.')
        .get()
    }

    switch (theme) {
      case APP_THEME.TOKYO_METRO:
      case APP_THEME.TOEI:
      case APP_THEME.TY: {
        if (firstSpeech.current) {
          ssmlBuilder
            .addSay('This train is bound for')
            .addSay(selectedBound?.nameRoman)
            .addBreak('100ms')
            .addSay('the')
            .addSay(trainTypeNameEn)
            .addSay('on the')
            .addSay(`${currentLine?.nameRoman}.`)
        }
        ssmlBuilder
          .addSay('The next station is')
          .addSay(nextStationNameR)
          .addBreak('100ms')
          .addSay(stationNumber)
          .addSay(shouldSpeakTerminus ? 'terminal.' : '.')

        if (!afterNextStation && transferLines.length) {
          return ssmlBuilder
            .addSay(
              transferLines.length
                ? `Please change here for ${transferLines
                    .map((l) => l.nameRoman)
                    .join('')}`
                : ''
            )
            .get()
        }
        return ssmlBuilder
          .addSay('The stop after')
          .addSay(nextStationNameR)
          .addSay('is')
          .addSay(afterNextStation?.nameRoman)
          .addSay(getHasTerminus(3) ? 'terminal.' : '.')
          .addSay(
            betweenAfterNextStation.length
              ? 'For stations in between, please change trains at the next stop,'
              : ''
          )
          .addSay(
            transferLines.length
              ? `and for ${transferLines.map((l) => l.nameRoman).join('')}`
              : ''
          )
          .get()
      }
      case APP_THEME.SAIKYO:
      case APP_THEME.YAMANOTE: {
        const isLocalType = trainTypeNameEn === 'Local'
        if (firstSpeech.current) {
          ssmlBuilder
            .addSay('This is a')
            .addSay(currentLine?.nameRoman)
            .addSay(isLocalType ? '' : trainTypeNameEn)
            .addSay(isLocalType ? 'train for' : 'service train for')
            .addSay(selectedBound?.nameRoman)
            .addSay(nextLine ? ', via the' : '.')
            .addSay(
              nextLine
                ? `${nextLine?.nameRoman?.replace(parenthesisRegexp, '')}.`
                : '  '
            )
        }
        return ssmlBuilder
          .addSay('The next station is')
          .addSay(nextStationNameR)
          .addSay(shouldSpeakTerminus ? 'terminal.' : '')
          .addSay(
            transferLines.length
              ? `Please change here for ${transferLines
                  .map((l) => l.nameRoman)
                  .join('')}`
              : ''
          )
          .get()
      }
      case APP_THEME.JR_WEST: {
        if (firstSpeech.current) {
          ssmlBuilder
            .addSay('Thank you for using')
            .addSay(
              currentLine?.company?.nameEnglishShort
                ?.replace(parenthesisRegexp, '')
                ?.replace('JR', 'J-R') ?? ''
            )
            .addSay('. This is the')
            .addSay(trainTypeNameEn)
            .addSay('service bound for')
            .addSay(`${selectedBound?.nameRoman}.`)
        }

        ssmlBuilder
          .addSay('The next stop is ')
          .addSay(nextStationNameR)
          .addSay(stationNumber)

        const prefix = ssmlBuilder.addSay('We will be stopping at ').get()
        const suffixBuilder = new SSMLBuilder()
        const suffix = suffixBuilder
          .addSay(getHasTerminus(6) ? 'terminal.' : '.')
          .addSay(
            getHasTerminus(6)
              ? ''
              : `After leaving ${
                  allStops
                    .slice(0, 5)
                    .filter((s) => s)
                    .reverse()[0]?.nameRoman
                }, will be announced later.`
          )
          .addSay('The next stop is')
          .addSay(nextStationNameR)
          .addSay(stationNumber)
          .get()

        return `${prefix} ${allStops
          .slice(0, 5)
          .map((s) => s.nameRoman)
          .join('、')} ${suffix}`
      }
      default:
        return ''
    }
  }, [
    afterNextStation,
    allStops,
    betweenAfterNextStation.length,
    connectedLines,
    currentLine?.company?.nameEnglishShort,
    currentLine?.nameRoman,
    firstSpeech,
    getHasTerminus,
    transferLines,
    nextLine,
    nextStationNameR,
    selectedBound?.nameRoman,
    shouldSpeakTerminus,
    stationNumber,
    theme,
    trainTypeNameEn,
  ])

  const getNextTextJaBase = useCallback((): string => {
    const ssmlBuilder = new SSMLBuilder()

    switch (theme) {
      case APP_THEME.TOKYO_METRO:
      case APP_THEME.TOEI:
        return ssmlBuilder
          .addSay('次は、')
          .addBreak('100ms')
          .addSay(nextStation?.nameKatakana)
          .addBreak(shouldSpeakTerminus ? '100ms' : '0s')
          .addSay(shouldSpeakTerminus ? '終点' : '')
          .addSay('です。')
          .get()
      case APP_THEME.JR_WEST:
        return ssmlBuilder
          .addSay('次は、')
          .addSay(shouldSpeakTerminus ? '終点' : '')
          .addBreak('100ms')
          .addSay(nextStation?.nameKatakana)
          .addBreak('100ms')
          .addSay(nextStation?.nameKatakana)
          .addSay('です。')
          .get()
      case APP_THEME.TY: {
        if (firstSpeech.current) {
          ssmlBuilder
            .addSay(currentLine?.nameKatakana)
            .addSay(
              'をご利用くださいまして、ありがとうございます。この電車は、'
            )
            .addSay(
              connectedLines.length
                ? `${connectedLines
                    .map((nl) => nl.nameKatakana)
                    .join('、')}直通、`
                : ''
            )
            .addSay(`${trainTypeName}、`)
            .addSay(selectedBound?.nameKatakana)
            .addSay('ゆきです。')
        }

        return ssmlBuilder
          .addSay('次は、')
          .addSay(nextStation?.nameKatakana)
          .addSay(shouldSpeakTerminus ? '、終点' : '')
          .addSay('です。')
          .get()
      }
      case APP_THEME.YAMANOTE:
      case APP_THEME.SAIKYO:
        return ssmlBuilder
          .addSay('次は、')
          .addBreak('100ms')
          .addSay(shouldSpeakTerminus ? '終点' : '')
          .addBreak(shouldSpeakTerminus ? '100ms' : '0s')
          .addSay(nextStation?.nameKatakana)
          .addBreak('100ms')
          .addSay(nextStation?.nameKatakana)
          .get()
      default:
        return ''
    }
  }, [
    connectedLines,
    currentLine?.nameKatakana,
    firstSpeech,
    nextStation?.nameKatakana,
    selectedBound?.nameKatakana,
    shouldSpeakTerminus,
    theme,
    trainTypeName,
  ])

  const getNextTextJaLoopLine = useCallback((): string => {
    const ssmlBuilder = new SSMLBuilder()

    if (!selectedDirection || !currentLine) {
      return ''
    }

    if (getIsMeijoLine(currentLine.id)) {
      if (firstSpeech.current) {
        ssmlBuilder
          .addSay('この電車は')
          .addBreak('100ms')
          .addSay(currentLine.nameShort)
          .addBreak('100ms')
          .addSay(directionToDirectionName(currentLine, selectedDirection))
          .addSay('です。')
      }
      return ssmlBuilder
        .addSay('次は、')
        .addSay(nextStation?.nameKatakana)
        .addBreak('200ms')
        .addSay(nextStation?.nameKatakana)
        .addBreak('200ms')
        .addSay(
          transferLines.length
            ? `${transferLines
                .map((l) => l.nameShort)
                .join('、')}はお乗り換えです。`
            : ''
        )
        .get()
    }

    if (firstSpeech.current) {
      ssmlBuilder
        .addSay('この電車は')
        .addBreak('100ms')
        .addSay(currentLine.nameShort)
        .addBreak('100ms')
        .addSay(directionToDirectionName(currentLine, selectedDirection))
        .addBreak('100ms')
        .addSay(loopLineBoundJa?.boundFor)
        .addSay('ゆきです。')
    }
    return ssmlBuilder
      .addSay('次は、')
      .addSay(nextStation?.nameKatakana)
      .addBreak('200ms')
      .addSay(nextStation?.nameKatakana)
      .addBreak('200ms')
      .addSay(
        transferLines.length
          ? `${transferLines
              .map((l) => l.nameShort)
              .join('、')}はお乗り換えです。`
          : ''
      )
      .get()
  }, [
    currentLine,
    firstSpeech,
    transferLines,
    loopLineBoundJa?.boundFor,
    nextStation?.nameKatakana,
    selectedDirection,
  ])

  // 次の駅のすべての路線に対して接続路線が存在する場合、次の鉄道会社に接続する判定にする
  const isNextStopOperatedAnotherCompany = useMemo(
    () =>
      nextStation?.linesList
        // 同じ会社の路線をすべてしばく
        ?.filter((l) => l.company?.id !== currentLine?.company?.id)
        ?.every((l) =>
          connectedLines.some((cl) => cl.company?.id === l.company?.id)
        ) ?? false,
    [connectedLines, currentLine?.company?.id, nextStation?.linesList]
  )

  useEffect(() => {
    // オートモードの折返しのためにshouldSpeakTerminusも確認している
    if (shouldSpeakTerminus || isNextStopOperatedAnotherCompany) {
      firstSpeech.current = true
    }
  }, [firstSpeech, isNextStopOperatedAnotherCompany, shouldSpeakTerminus])

  const getApproachingTextJaBase = useCallback((): string => {
    const ssmlBuilder = new SSMLBuilder()

    switch (theme) {
      case APP_THEME.TOKYO_METRO:
      case APP_THEME.TOEI: {
        ssmlBuilder
          .addSay('まもなく')
          .addBreak('100ms')
          .addSay(nextStation?.nameKatakana)
          .addSay(shouldSpeakTerminus ? 'この電車の終点' : '')
          .addSay('です。')
        if (shouldSpeakTerminus || isNextStopOperatedAnotherCompany) {
          ssmlBuilder
            .addSay(
              `${currentLine?.company?.nameShort}をご利用くださいまして、ありがとうございました。`
            )
            .get()
        }
        return ssmlBuilder.get()
      }
      case APP_THEME.TY: {
        ssmlBuilder
          .addSay('まもなく')
          .addBreak('100ms')
          .addSay(shouldSpeakTerminus ? 'この電車の終点' : '')
          .addBreak(shouldSpeakTerminus ? '100ms' : '0s')
          .addSay(nextStation?.nameKatakana)
          .addSay('に到着いたします。')

        if (shouldSpeakTerminus || isNextStopOperatedAnotherCompany) {
          ssmlBuilder
            .addSay(
              `${currentLine?.company?.nameShort}をご利用くださいまして、ありがとうございました。`
            )
            .get()
        }
        return ssmlBuilder.get()
      }
      case APP_THEME.YAMANOTE:
      case APP_THEME.SAIKYO: {
        ssmlBuilder
          .addSay('まもなく')
          .addSay(shouldSpeakTerminus ? '終点' : '')
          .addBreak('100ms')
          .addSay(nextStation?.nameKatakana)
          .addBreak('100ms')
          .addSay(nextStation?.nameKatakana)
        if (
          (shouldSpeakTerminus || isNextStopOperatedAnotherCompany) &&
          currentLine?.company?.nameShort
        ) {
          ssmlBuilder
            .addSay('本日も、')
            .addBreak('100ms')
            .addSay(currentLine?.company?.nameShort)
            .addSay('をご利用くださいまして、ありがとうございました。')
            .get()
        }
        return ssmlBuilder.get()
      }
      default:
        return ''
    }
  }, [
    currentLine?.company?.nameShort,
    isNextStopOperatedAnotherCompany,
    nextStation?.nameKatakana,
    shouldSpeakTerminus,
    theme,
  ])

  const getApproachingTextJaWithTransfers = useCallback((): string => {
    const ssmlBuilder = new SSMLBuilder()

    switch (theme) {
      case APP_THEME.TOKYO_METRO:
      case APP_THEME.TY:
      case APP_THEME.YAMANOTE:
      case APP_THEME.SAIKYO:
      case APP_THEME.JR_WEST:
      case APP_THEME.TOEI:
        return `${getApproachingTextJaBase()} ${ssmlBuilder
          .addBreak('100ms')
          .addSay(transferLines.map((l) => l.nameShort).join('、'))
          .addSay('は、お乗り換えです。')
          .get()}`
      default:
        return ''
    }
  }, [getApproachingTextJaBase, transferLines, theme])

  const getNextTextEnBase = useCallback((): string => {
    const ssmlBuilder = new SSMLBuilder()

    switch (theme) {
      case APP_THEME.TOKYO_METRO:
      case APP_THEME.JR_WEST:
      case APP_THEME.TOEI:
        return ssmlBuilder
          .addSay('The next stop is')
          .addBreak('100ms')
          .addSay(nextStationNameR)
          .addBreak('100ms')
          .addSay(stationNumber)
          .addSay(shouldSpeakTerminus ? 'terminal.' : '.')
          .get()
      case APP_THEME.TY:
      case APP_THEME.YAMANOTE:
      case APP_THEME.SAIKYO:
        return ssmlBuilder
          .addSay('The next station is')
          .addBreak('100ms')
          .addSay(nextStationNameR)
          .addBreak('100ms')
          .addSay(stationNumber)
          .addSay(shouldSpeakTerminus ? 'terminal.' : '.')
          .get()
      default:
        return ''
    }
  }, [nextStationNameR, shouldSpeakTerminus, stationNumber, theme])

  const getNextTextEnLoopLine = useCallback((): string => {
    const ssmlBuilder = new SSMLBuilder()

    if (!selectedDirection || !currentLine) {
      return ''
    }

    if (getIsMeijoLine(currentLine.id)) {
      ssmlBuilder
        .addSay('This is the')
        .addSay(currentLine.nameRoman)
        .addSay('train')
        .addSay(loopLineBoundEn?.boundFor)
        .addSay('The next station is')
        .addBreak('100ms')
        .addSay(nextStationNameR)
        .addBreak('100ms')
        .addSay(stationNumber)

      if (transferLines.length) {
        return ssmlBuilder
          .addBreak('200ms')
          .addSay('Please change here for')
          .addSay(
            `${transferLines.map((l, i, arr) =>
              arr.length !== i
                ? `the ${l.nameRoman},`
                : `and the ${l.nameRoman}.`
            )}`
          )
          .get()
      }
      return ssmlBuilder.get()
    }

    ssmlBuilder
      .addSay('This is the')
      .addSay(currentLine.nameRoman)
      .addSay('train bound for')
      .addSay(loopLineBoundEn?.boundFor)
      .addSay('The next station is')
      .addBreak('100ms')
      .addSay(nextStationNameR)
      .addBreak('100ms')
      .addSay(stationNumber)

    if (transferLines.length) {
      return ssmlBuilder
        .addBreak('200ms')
        .addSay('Please change here for')
        .addSay(
          `${transferLines.map((l, i, arr) =>
            arr.length !== i ? `the ${l.nameRoman},` : `and the ${l.nameRoman}.`
          )}`
        )
        .get()
    }

    return ssmlBuilder.get()
  }, [
    currentLine,
    transferLines,
    loopLineBoundEn?.boundFor,
    nextStationNameR,
    selectedDirection,
    stationNumber,
  ])

  const getApproachingTextEnBase = useCallback((): string => {
    const ssmlBuilder = new SSMLBuilder()

    switch (theme) {
      case APP_THEME.TOKYO_METRO:
      case APP_THEME.TOEI:
        return ssmlBuilder
          .addSay('Arriving at')
          .addBreak('100ms')
          .addSay(nextStationNameR)
          .addBreak('100ms')
          .addSay(stationNumber)
          .get()
      case APP_THEME.TY:
        return ssmlBuilder
          .addSay('We will soon make a brief stop at')
          .addBreak('100ms')
          .addSay(nextStationNameR)
          .addBreak('100ms')
          .addSay(stationNumber)
          .get()
      case APP_THEME.YAMANOTE:
      case APP_THEME.SAIKYO:
        return getNextTextEnBase()
      case APP_THEME.JR_WEST:
        return ssmlBuilder
          .addSay('We will soon be making a brief stop at')
          .addBreak('100ms')
          .addSay(nextStationNameR)
          .get()
      default:
        return ''
    }
  }, [getNextTextEnBase, nextStationNameR, stationNumber, theme])

  const getApproachingTextEnWithTransfers = useCallback((): string => {
    const ssmlBuilder = new SSMLBuilder()

    switch (theme) {
      case APP_THEME.TOKYO_METRO:
      case APP_THEME.JR_WEST:
      case APP_THEME.TOEI:
        return `${getApproachingTextEnBase()} ${ssmlBuilder
          .addBreak('100ms')
          .addSay('Please change here for')
          .addSay(transferLines.map((l) => l.nameRoman).join(''))
          .get()}`

      case APP_THEME.TY:
        return `${getApproachingTextEnBase()} ${ssmlBuilder
          .addBreak('100ms')
          .addSay('Passengers changing to the')
          .addSay(transferLines.map((l) => l.nameRoman).join(''))
          .addBreak('100ms')
          .addSay('Please transfer at this station.')
          .get()}`

      case APP_THEME.YAMANOTE:
      case APP_THEME.SAIKYO:
        return `${getApproachingTextEnBase()} ${ssmlBuilder
          .addBreak('100ms')
          .addSay('Please change here for')
          .addSay(transferLines.map((l) => l.nameRoman).join(''))
          .addBreak(shouldSpeakTerminus ? '100ms' : '0s')
          .addSay(
            shouldSpeakTerminus
              ? 'Thank you for traveling with us. And we look forward to serving you again!'
              : ''
          )
          .get()}`
      default:
        return ''
    }
  }, [getApproachingTextEnBase, transferLines, shouldSpeakTerminus, theme])

  useEffect(() => {
    if (!enabled || !isInternetAvailable) {
      return
    }

    const playAsync = async () => {
      if (prevStateIsDifferent) {
        switch (headerState.split('_')[0]) {
          case 'NEXT':
            if (isLoopLine && !trainType) {
              await speech({
                textJa: getNextTextJaLoopLine(),
                textEn: getNextTextEnLoopLine(),
              })
              return
            }
            if (betweenNextStation.length) {
              await speech({
                textJa: getNextTextJaExpress(),
                textEn: getNextTextEnExpress(),
              })
              return
            }
            await speech({
              textJa: getNextTextJaBase(),
              textEn: getNextTextEnBase(),
            })
            break
          case 'ARRIVING':
            if (isLoopLine) {
              return
            }

            if (transferLines.length) {
              await speech({
                textJa: getApproachingTextJaWithTransfers(),
                textEn: getApproachingTextEnWithTransfers(),
              })
              break
            }
            await speech({
              textJa: getApproachingTextJaBase(),
              textEn: getApproachingTextEnBase(),
            })
            break
          default:
            break
        }
      }
    }

    playAsync()
  }, [
    betweenNextStation.length,
    enabled,
    getApproachingTextEnBase,
    getApproachingTextEnWithTransfers,
    getApproachingTextJaBase,
    getApproachingTextJaWithTransfers,
    getNextTextEnBase,
    getNextTextEnExpress,
    getNextTextEnLoopLine,
    getNextTextJaBase,
    getNextTextJaExpress,
    getNextTextJaLoopLine,
    headerState,
    isInternetAvailable,
    isLoopLine,
    transferLines.length,
    prevStateIsDifferent,
    speech,
    trainType,
  ])
}

export default useTTS
