import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useRecoilValue } from 'recoil'
import { Station } from '../gen/stationapi_pb'
import { APP_THEME, AppTheme } from '../models/Theme'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import themeState from '../store/atoms/theme'
import getIsPass from '../utils/isPass'
import omitJRLinesIfThresholdExceeded from '../utils/jr'
import { getIsLoopLine } from '../utils/loopLine'
import {
  getNextInboundStopStation,
  getNextOutboundStopStation,
} from '../utils/nextStation'
import getSlicedStations from '../utils/slicedStations'
import useConnectedLines from './useConnectedLines'
import useCurrentLine from './useCurrentLine'
import useCurrentStation from './useCurrentStation'
import useCurrentTrainType from './useCurrentTrainType'
import useLoopLineBound from './useLoopLineBound'
import useNextStation from './useNextStation'
import useNumbering from './useNumbering'
import useTransferLines from './useTransferLines'

type CompatibleState = 'NEXT' | 'ARRIVING'

const EMPTY_TTS_TEXT = {
  [APP_THEME.TOKYO_METRO]: { NEXT: '', ARRIVING: '' },
  [APP_THEME.TY]: { NEXT: '', ARRIVING: '' },
  [APP_THEME.YAMANOTE]: { NEXT: '', ARRIVING: '' },
  [APP_THEME.JR_WEST]: { NEXT: '', ARRIVING: '' },
  [APP_THEME.SAIKYO]: { NEXT: '', ARRIVING: '' },
  [APP_THEME.TOEI]: { NEXT: '', ARRIVING: '' },
}

const useTTSText = (): string[] => {
  const { headerState } = useRecoilValue(navigationState)
  const { theme } = useRecoilValue(themeState)
  const {
    selectedBound: selectedBoundOrigin,
    stations,
    selectedDirection,
    arrived,
  } = useRecoilValue(stationState)

  const station = useCurrentStation()
  const currentLineOrigin = useCurrentLine()
  const connectedLinesOrigin = useConnectedLines()
  const actualNextStation = useNextStation(false)
  const transferLinesOriginal = useTransferLines()
  const [nextStationNumber] = useNumbering()
  const trainType = useCurrentTrainType()
  const loopLineBoundJa = useLoopLineBound(false)
  const loopLineBoundEn = useLoopLineBound(false, 'EN')

  const replaceRomanText = useCallback(
    (str: string) =>
      str
        .replace('JR', 'J-R')
        // 赤嶺駅のように「mine」が入ると「マイン」と呼んでしまうので置き換える
        .replaceAll('mine', '<phoneme alphabet="ipa" ph="mine">mine</phoneme>')
        // 芳賀・宇都宮LRTの峰駅のように「Mine」は「マイン」と呼ばれてしまうので置き換える
        .replace('Mine', '<phoneme alphabet="ipa" ph="mine">Mine</phoneme>')
        // 宇部駅などの「うべ」を「ゆべ」等
        .replace('Ube', '<phoneme alphabet="ipa" ph="ube">Ube</phoneme>')
        // 丁目
        .replace('chome', '<phoneme alphabet="ipa" ph="tyome">chome</phoneme>')
        // 明大前駅等
        .replace('Mei', '<phoneme alphabet="ipa" ph="mei">Mei</phoneme>')
        // ~前駅等
        .replace('mae', '<phoneme alphabet="ipa" ph="mae">mae</phoneme>')
        // 伊勢崎駅等
        .replace('Ise', '<phoneme alphabet="ipa" ph="ise">Ise</phoneme>')
        .replace('ise', '<phoneme alphabet="ipa" ph="ise">ise</phoneme>')
        .replace('saki', '<phoneme alphabet="ipa" ph="saki">saki</phoneme>')
        // 京成等
        .replace('Kei', '<phoneme alphabet="ipa" ph="kei">Kei</phoneme>')
        // 押上駅の「あげ」等
        .replace('age', '<phoneme alphabet="ipa" ph="age">age</phoneme>')
        // せんげん台駅等
        .replace('gen', '<phoneme alphabet="ipa" ph="gen">gen</phoneme>'),
    []
  )

  const currentLine = useMemo(
    () =>
      currentLineOrigin && {
        ...currentLineOrigin,
        nameRoman: replaceRomanText(currentLineOrigin.nameRoman),
      },
    [currentLineOrigin, replaceRomanText]
  )

  const selectedBound = useMemo(
    () =>
      selectedBoundOrigin && {
        ...selectedBoundOrigin,
        nameRoman: replaceRomanText(selectedBoundOrigin.nameRoman),
      },
    [replaceRomanText, selectedBoundOrigin]
  )

  const boundForJa = useMemo(
    () =>
      getIsLoopLine(currentLine, trainType)
        ? loopLineBoundJa?.boundFor
        : selectedBound?.nameKatakana,
    [
      currentLine,
      loopLineBoundJa?.boundFor,
      selectedBound?.nameKatakana,
      trainType,
    ]
  )

  const boundForEn = useMemo(
    () =>
      getIsLoopLine(currentLine, trainType)
        ? loopLineBoundEn?.boundFor.replaceAll('&', ' and ')
        : selectedBound?.nameRoman.replaceAll('&', ' and '),
    [
      currentLine,
      loopLineBoundEn?.boundFor,
      selectedBound?.nameRoman,
      trainType,
    ]
  )

  const nextStationNumberText = useMemo(
    () =>
      nextStationNumber
        ? `${
            nextStationNumber?.lineSymbol.length || theme === APP_THEME.JR_WEST
              ? ''
              : 'Station Number '
          }${nextStationNumber?.stationNumber ?? ''}`
        : '',
    [nextStationNumber, theme]
  )

  const firstSpeech = useRef(true)

  const transferLines = useMemo(
    () =>
      omitJRLinesIfThresholdExceeded(transferLinesOriginal).map((l) => ({
        ...l,
        nameRoman: replaceRomanText(l.nameRoman),
        nameShort: l.nameShort,
      })),
    [replaceRomanText, transferLinesOriginal]
  )

  const connectedLines = useMemo(
    () =>
      connectedLinesOrigin &&
      connectedLinesOrigin.map((l) => ({
        ...l,
        nameShort: l.nameShort,
        nameRoman: replaceRomanText(l.nameRoman),
      })),
    [connectedLinesOrigin, replaceRomanText]
  )

  const slicedStationsOrigin = useMemo(
    () =>
      getSlicedStations({
        stations,
        currentStation: station,
        isInbound: selectedDirection === 'INBOUND',
        arrived,
        currentLine,
        trainType,
      }),
    [arrived, currentLine, selectedDirection, station, stations, trainType]
  )

  const nextOutboundStopStation = useMemo(
    () =>
      station &&
      actualNextStation &&
      getNextOutboundStopStation(stations, actualNextStation, station),
    [actualNextStation, station, stations]
  )
  const nextInboundStopStation = useMemo(
    () =>
      station &&
      actualNextStation &&
      getNextInboundStopStation(stations, actualNextStation, station),
    [actualNextStation, station, stations]
  )
  const nextStationOrigin = useMemo(
    () =>
      selectedDirection === 'INBOUND'
        ? nextInboundStopStation
        : nextOutboundStopStation,
    [nextInboundStopStation, nextOutboundStopStation, selectedDirection]
  )
  const nextStation = useMemo(
    () =>
      nextStationOrigin && {
        ...nextStationOrigin,
        nameRoman: replaceRomanText(nextStationOrigin.nameRoman),
      },
    [nextStationOrigin, replaceRomanText]
  )

  // 直通時、同じGroupIDの駅が違う駅として扱われるのを防ぐ(ex. 渋谷の次は、渋谷に止まります)
  const slicedStations = Array.from(
    new Set(slicedStationsOrigin.map((s) => s.groupId))
  )
    .map((gid) => slicedStationsOrigin.find((s) => s.groupId === gid))
    .filter((s) => !!s) as Station.AsObject[]

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

  const betweenAfterNextStation = useMemo(
    () => slicedStations.slice(nextStopStationIndex + 1, afterNextStationIndex),
    [afterNextStationIndex, nextStopStationIndex, slicedStations]
  )

  const afterNextStation = useMemo(() => {
    const afterNextStationOrigin = slicedStations[afterNextStationIndex]
    return (
      afterNextStationOrigin && {
        ...afterNextStationOrigin,
        nameRoman: replaceRomanText(afterNextStationOrigin.nameRoman),
        lines: afterNextStationOrigin.linesList.map((l) => ({
          ...l,
          nameShort: l.nameShort,
          nameRoman: replaceRomanText(l.nameRoman),
        })),
      }
    )
  }, [afterNextStationIndex, replaceRomanText, slicedStations])

  const allStops = slicedStations.filter((s) => {
    if (s.id === station?.id) {
      return false
    }
    return !getIsPass(s)
  })

  const japaneseTemplate: Record<
    AppTheme,
    Record<CompatibleState, string>
  > | null = useMemo(() => {
    if (!currentLine || !selectedBound || !selectedDirection) {
      return EMPTY_TTS_TEXT
    }

    const map = {
      [APP_THEME.TOKYO_METRO]: {
        NEXT: `${
          firstSpeech.current
            ? `${currentLine.nameShort}をご利用くださいまして、ありがとうございます。`
            : ''
        }次は${nextStation?.nameKatakana ?? ''}です。この電車は、${
          connectedLines.length
            ? `${connectedLines.map((l) => l.nameShort).join('、')}直通、`
            : ''
        }${trainType ? trainType.name : '各駅停車'}、${
          boundForJa ?? ''
        }ゆきです。${
          trainType
            ? `${nextStation?.nameKatakana ?? ''}の次は、${
                afterNextStation?.nameKatakana ?? ''
              }に停まります。`
            : ''
        }${
          betweenAfterNextStation.length
            ? `${betweenAfterNextStation
                .map((s) => s.nameKatakana)
                .join('、')}へおいでのお客様はお乗り換えです。`
            : ''
        }`,
        ARRIVING: '',
      },
      [APP_THEME.TY]: {
        NEXT: `${
          firstSpeech.current
            ? `${
                currentLine.nameShort
              }をご利用くださいまして、ありがとうございます。この電車は${
                connectedLines.length
                  ? `${connectedLines.map((l) => l.nameShort).join('、')}直通、`
                  : ''
              }${trainType ? trainType.name : '各駅停車'}、${
                boundForJa ?? ''
              }ゆきです。`
            : ''
        }次は${nextStation?.nameKatakana ?? ''}です。${
          transferLines.length
            ? `${transferLines
                .map((l) => l.nameShort)
                .join('、')}をご利用のお客様はお乗り換えです。`
            : ''
        }`,
        ARRIVING: '',
      },
      [APP_THEME.YAMANOTE]: {
        NEXT: `${
          firstSpeech.current
            ? `今日も、${
                currentLine.company?.name ?? ''
              }をご利用くださいまして、ありがとうございます。この電車は、${
                boundForJa ?? ''
              }ゆきです。`
            : ''
        }次は${nextStation?.nameKatakana ?? ''}、${
          nextStation?.nameKatakana ?? ''
        }。${
          transferLines.length
            ? `${transferLines
                .map((l) => l.nameShort)
                .join('、')}はお乗り換えです。`
            : ''
        }`,
        ARRIVING: '',
      },
      [APP_THEME.SAIKYO]: {
        NEXT: `${
          firstSpeech.current
            ? `今日も、${
                currentLine.company?.name ?? ''
              }をご利用くださいまして、ありがとうございます。この電車は、${
                boundForJa ?? ''
              }ゆきです。`
            : ''
        }次は${nextStation?.nameKatakana ?? ''}、${
          nextStation?.nameKatakana ?? ''
        }。${
          transferLines.length
            ? `${transferLines
                .map((l) => l.nameShort)
                .join('、')}はお乗り換えです。`
            : ''
        }`,
        ARRIVING: '',
      },
      [APP_THEME.JR_WEST]: {
        NEXT: `${
          firstSpeech.current
            ? `今日も、${
                currentLine.company?.name ?? ''
              }をご利用くださいまして、ありがとうございます。この電車は、${
                trainType?.name ?? ''
              }、${
                allStops[2] ? `${allStops[2]?.nameKatakana}方面、` ?? '' : ''
              }${selectedBound.nameKatakana}ゆきです。${allStops
                .slice(0, 5)
                .map((s) =>
                  s.id === selectedBound?.id &&
                  !getIsLoopLine(currentLine, trainType)
                    ? `終点、${s.nameKatakana}`
                    : s.nameKatakana
                )
                .join('、')}の順に停まります。${
                allStops
                  .slice(0, 5)
                  .filter((s) => s)
                  .reverse()[0]?.id === selectedBound?.id
                  ? ''
                  : `
                ${
                  allStops
                    .slice(0, 5)
                    .filter((s) => s)
                    .reverse()[0]?.nameKatakana
                }
              }から先は、後ほどご案内いたします。`
              }`
            : ''
        }次は${nextStation?.nameKatakana ?? ''}、${
          nextStation?.nameKatakana ?? ''
        }です。`,
        ARRIVING: '',
      },
      [APP_THEME.TOEI]: {
        NEXT: `${
          firstSpeech.current
            ? `${currentLine.nameShort}をご利用くださいまして、ありがとうございます。`
            : ''
        }次は${nextStation?.nameKatakana ?? ''}です。この電車は、${
          connectedLines.length
            ? `${connectedLines.map((l) => l.nameShort).join('、')}直通、`
            : ''
        }${trainType ? trainType.name : '各駅停車'}、${
          boundForJa ?? ''
        }ゆきです。${
          trainType
            ? `${nextStation?.nameKatakana ?? ''}の次は、${
                afterNextStation?.nameKatakana ?? ''
              }に停まります。`
            : ''
        }${
          betweenAfterNextStation.length
            ? `${betweenAfterNextStation
                .map((s) => s.nameKatakana)
                .join('、')}へおいでのお客様はお乗り換えです。`
            : ''
        }`,
        ARRIVING: '',
      },
    }
    return map
  }, [
    afterNextStation?.nameKatakana,
    allStops,
    betweenAfterNextStation,
    boundForJa,
    connectedLines,
    currentLine,
    nextStation?.nameKatakana,
    selectedBound,
    selectedDirection,
    trainType,
    transferLines,
  ])

  const englishTemplate: Record<
    AppTheme,
    Record<CompatibleState, string>
  > | null = useMemo(() => {
    if (!currentLine || !selectedBound || !selectedDirection) {
      return EMPTY_TTS_TEXT
    }

    const map = {
      [APP_THEME.TOKYO_METRO]: {
        NEXT: `The next stop is ${
          nextStation?.nameRoman
        } ${nextStationNumberText}. ${
          firstSpeech.current
            ? `This train is the ${
                trainType ? trainType.nameRoman : 'Local'
              } Service on the ${
                currentLine.nameRoman
              } bound for ${boundForEn} ${
                trainType
                  ? `The next stop after ${nextStation?.nameRoman ?? ''} is ${
                      afterNextStation?.nameRoman ?? ''
                    }`
                  : ''
              }. For stations in between, please change trains at the next stop.`
            : ''
        }`,
        ARRIVING: '',
      },
      [APP_THEME.TY]: {
        NEXT: `${
          firstSpeech.current
            ? `Thank you for using the ${
                currentLine.nameRoman
              }. This train will merge and continue traveling at the ${
                replaceRomanText(trainType?.nameRoman ?? '') ?? 'Local'
              } Train on the ${connectedLines[0]?.nameRoman ?? ''} to ${
                selectedBound?.nameRoman
              }. `
            : ''
        }The next station is ${nextStation?.nameRoman}. ${
          transferLines.length
            ? `Passengers changing to the ${transferLines
                .map((l) => l.nameRoman)
                .join(', ')}, please transfer at this station.`
            : ''
        }`,
        ARRIVING: '',
      },
      [APP_THEME.YAMANOTE]: {
        NEXT: `This is the ${
          currentLine.nameRoman
        } train bound for ${boundForEn}. The next station is ${
          nextStation?.nameRoman
        }. ${nextStationNumberText ?? ''} ${
          transferLines.length
            ? `Please change here for ${transferLines
                .map((l, i, a) =>
                  a.length > 1 && a.length - 1 === i
                    ? `and the ${l.nameRoman}`
                    : `the ${l.nameRoman}`
                )
                .join(' ')}.`
            : ''
        }`,
        ARRIVING: '',
      },
      [APP_THEME.SAIKYO]: {
        NEXT: `This is the ${
          currentLine.nameRoman
        } train bound for ${boundForEn}. The next station is ${
          nextStation?.nameRoman
        }. ${nextStationNumberText ?? ''} ${
          transferLines.length
            ? `Please change here for ${transferLines
                .map((l, i, a) =>
                  a.length > 1 && a.length - 1 === i
                    ? `and the ${l.nameRoman}`
                    : `the ${l.nameRoman}`
                )
                .join(' ')}.`
            : ''
        }`,
        ARRIVING: '',
      },
      [APP_THEME.JR_WEST]: {
        NEXT: `${
          firstSpeech.current
            ? `Thank you for using ${replaceRomanText(
                currentLine?.company?.nameEnglishFull ?? ''
              )}. This is the ${
                replaceRomanText(trainType?.nameRoman ?? '') ?? 'Local'
              } Service bound for ${boundForEn} ${
                allStops[2]
                  ? `via ${replaceRomanText(allStops[2]?.nameRoman ?? '')}`
                  : ''
              }. We will be stopping at ${allStops
                .slice(0, 5)
                .map((s) =>
                  s.id === selectedBound?.id &&
                  !getIsLoopLine(currentLine, trainType)
                    ? `${replaceRomanText(s.nameRoman)} terminal`
                    : replaceRomanText(s.nameRoman)
                )
                .join(', ')}. ${
                allStops
                  .slice(0, 5)
                  .filter((s) => s)
                  .reverse()[0]?.id === selectedBound?.id
                  ? ''
                  : `Stops after ${replaceRomanText(
                      allStops
                        .slice(0, 5)
                        .filter((s) => s)
                        .reverse()[0]?.nameRoman ?? ''
                    )} will be announced later.`
              }`
            : ''
        } The next stop is ${
          nextStation?.nameRoman ?? ''
        }, station number ${nextStationNumberText}.`,
        ARRIVING: '',
      },
      [APP_THEME.TOEI]: {
        NEXT: `The next stop is ${
          nextStation?.nameRoman
        } ${nextStationNumberText}. ${
          firstSpeech.current
            ? `This train is the ${
                trainType ? trainType.nameRoman : 'Local'
              } Service on the ${
                currentLine.nameRoman
              } bound for ${boundForEn} ${
                trainType
                  ? `The next stop after ${nextStation?.nameRoman ?? ''} is ${
                      afterNextStation?.nameRoman ?? ''
                    }`
                  : ''
              }. For stations in between, please change trains at the next stop.`
            : ''
        }`,
        ARRIVING: '',
      },
    }
    return map
  }, [
    afterNextStation?.nameRoman,
    allStops,
    boundForEn,
    connectedLines,
    currentLine,
    nextStation?.nameRoman,
    nextStationNumberText,
    replaceRomanText,
    selectedBound,
    selectedDirection,
    trainType,
    transferLines,
  ])

  const jaText = useMemo(() => {
    const tmpl =
      japaneseTemplate?.[theme]?.[headerState.split('_')[0] as CompatibleState]
    if (!tmpl) {
      return ''
    }
    return tmpl
  }, [headerState, japaneseTemplate, theme])
  const enText = useMemo(() => {
    const tmpl =
      englishTemplate?.[theme]?.[headerState.split('_')[0] as CompatibleState]
    if (!tmpl) {
      return ''
    }
    return tmpl
  }, [englishTemplate, headerState, theme])

  useEffect(() => {
    if (jaText && enText) {
      firstSpeech.current = false
    }
  }, [enText, jaText])

  return [jaText, enText]
}

export default useTTSText
