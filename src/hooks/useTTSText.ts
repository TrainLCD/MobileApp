import { useCallback, useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { Station } from '../../gen/proto/stationapi_pb'
import { parenthesisRegexp } from '../constants'
import { APP_THEME, AppTheme } from '../models/Theme'
import stationState from '../store/atoms/station'
import themeState from '../store/atoms/theme'
import { currentLineSelector } from '../store/selectors/currentLine'
import { currentStationSelector } from '../store/selectors/currentStation'
import getIsPass from '../utils/isPass'
import omitJRLinesIfThresholdExceeded from '../utils/jr'
import { useAfterNextStation } from './useAfterNextStation'
import useConnectedLines from './useConnectedLines'
import useCurrentTrainType from './useCurrentTrainType'
import useIsTerminus from './useIsTerminus'
import { useLoopLine } from './useLoopLine'
import useLoopLineBound from './useLoopLineBound'
import { useNextStation } from './useNextStation'
import { useNumbering } from './useNumbering'
import { useSlicedStations } from './useSlicedStations'
import { useStoppingState } from './useStoppingState'
import useTransferLines from './useTransferLines'

const EMPTY_TTS_TEXT = {
  [APP_THEME.TOKYO_METRO]: { NEXT: '', ARRIVING: '' },
  [APP_THEME.TY]: { NEXT: '', ARRIVING: '' },
  [APP_THEME.YAMANOTE]: { NEXT: '', ARRIVING: '' },
  [APP_THEME.JR_WEST]: { NEXT: '', ARRIVING: '' },
  [APP_THEME.SAIKYO]: { NEXT: '', ARRIVING: '' },
  [APP_THEME.TOEI]: { NEXT: '', ARRIVING: '' },
  [APP_THEME.LED]: { NEXT: '', ARRIVING: '' },
  [APP_THEME.JO]: { NEXT: '', ARRIVING: '' },
}

const useTTSText = (firstSpeech = true): string[] => {
  const { theme } = useRecoilValue(themeState)
  const { selectedBound: selectedBoundOrigin } = useRecoilValue(stationState)
  const station = useRecoilValue(currentStationSelector({}))
  const currentLineOrigin = useRecoilValue(currentLineSelector)

  const connectedLinesOrigin = useConnectedLines()
  const transferLinesOriginal = useTransferLines()
  const [nextStationNumber] = useNumbering(false)
  const currentTrainTypeOrigin = useCurrentTrainType()
  const loopLineBoundJa = useLoopLineBound(false)
  const loopLineBoundEn = useLoopLineBound(false, 'EN')
  const nextStationOrigin = useNextStation()
  const isNextStopTerminus = useIsTerminus(nextStationOrigin)
  const { isLoopLine } = useLoopLine()
  const slicedStationsOrigin = useSlicedStations()
  const stoppingState = useStoppingState()

  const replaceRomanText = useCallback(
    (str: string) => str.replace('JR', 'J-R'),
    []
  )

  const currentLine = useMemo(
    () =>
      currentLineOrigin && {
        ...currentLineOrigin,
        nameRoman: replaceRomanText(currentLineOrigin?.nameRoman ?? ''),
      },
    [currentLineOrigin, replaceRomanText]
  )

  const selectedBound = useMemo(
    () =>
      selectedBoundOrigin && {
        ...selectedBoundOrigin,
        nameRoman: replaceRomanText(selectedBoundOrigin?.nameRoman ?? ''),
      },
    [replaceRomanText, selectedBoundOrigin]
  )

  const currentTrainType = useMemo(
    () =>
      currentTrainTypeOrigin && {
        ...currentTrainTypeOrigin,
        nameRoman: replaceRomanText(
          currentTrainTypeOrigin.nameRoman?.replace(parenthesisRegexp, '') ?? ''
        ),
      },
    [replaceRomanText, currentTrainTypeOrigin]
  )

  const boundForJa = useMemo(
    () =>
      isLoopLine
        ? loopLineBoundJa?.boundForKatakana
        : selectedBound?.nameKatakana,
    [isLoopLine, loopLineBoundJa?.boundForKatakana, selectedBound?.nameKatakana]
  )

  const boundForEn = useMemo(
    () =>
      isLoopLine
        ? loopLineBoundEn?.boundFor.replaceAll('&', ' and ')
        : selectedBound?.nameRoman.replaceAll('&', ' and '),
    [isLoopLine, loopLineBoundEn?.boundFor, selectedBound?.nameRoman]
  )

  const nextStationNumberText = useMemo(() => {
    if (!nextStationNumber) {
      return ''
    }

    const split = nextStationNumber.stationNumber?.split('-')

    if (!split.length) {
      return ''
    }
    if (split.length === 1) {
      return `${theme === APP_THEME.JR_WEST ? '' : 'Station Number '}${
        Number(nextStationNumber.stationNumber) ?? ''
      }`
    }

    const symbol = `<say-as interpret-as="characters">${split[0]}</say-as>`
    const num = split[2]
      ? `${Number(split[1])}-${Number(split[2])}`
      : Number(split[1]).toString()

    return `${
      nextStationNumber.lineSymbol.length || theme === APP_THEME.JR_WEST
        ? ''
        : 'Station Number '
    }${symbol} ${num}`
  }, [nextStationNumber, theme])

  const transferLines = useMemo(
    () =>
      omitJRLinesIfThresholdExceeded(transferLinesOriginal).map((l) => ({
        ...l,
        nameRoman: replaceRomanText(l.nameRoman ?? ''),
      })),
    [replaceRomanText, transferLinesOriginal]
  )

  const connectedLines = useMemo(
    () =>
      connectedLinesOrigin &&
      connectedLinesOrigin.map((l) => ({
        ...l,
        nameRoman: replaceRomanText(l.nameRoman ?? ''),
      })),
    [connectedLinesOrigin, replaceRomanText]
  )

  const nextStation = useMemo(
    () =>
      nextStationOrigin && {
        ...nextStationOrigin,
        nameRoman: replaceRomanText(nextStationOrigin.nameRoman ?? ''),
      },
    [nextStationOrigin, replaceRomanText]
  )

  // 直通時、同じGroupIDの駅が違う駅として扱われるのを防ぐ(ex. 渋谷の次は渋谷に止まります)
  const slicedStations = Array.from(
    new Set(slicedStationsOrigin.map((s) => s.groupId))
  )
    .map((gid) => slicedStationsOrigin.find((s) => s.groupId === gid))
    .filter((s) => !!s) as Station[]

  const afterNextStationOrigin = useAfterNextStation()
  const afterNextStation = useMemo<Station | undefined>(() => {
    return (
      afterNextStationOrigin &&
      new Station({
        ...afterNextStationOrigin,
        nameRoman: replaceRomanText(afterNextStationOrigin?.nameRoman ?? ''),
        lines: afterNextStationOrigin.lines.map((l) => ({
          ...l,
          nameRoman: replaceRomanText(l.nameRoman ?? ''),
        })),
      })
    )
  }, [afterNextStationOrigin, replaceRomanText])

  const nextStationIndex = useMemo(
    () => slicedStations.findIndex((s) => s.groupId === nextStation?.groupId),
    [nextStation?.groupId, slicedStations]
  )
  const afterNextStationIndex = useMemo(
    () =>
      slicedStations.findIndex((s) => s.groupId === afterNextStation?.groupId),
    [afterNextStation?.groupId, slicedStations]
  )

  const betweenNextStation = useMemo(
    () => slicedStations.slice(nextStationIndex + 1, afterNextStationIndex),
    [afterNextStationIndex, nextStationIndex, slicedStations]
  )

  const isAfterNextStopTerminus = useIsTerminus(afterNextStation)

  const allStops = slicedStations.filter((s) => {
    if (s.id === station?.id) {
      return false
    }
    return !getIsPass(s)
  })

  const japaneseTemplate: Record<AppTheme, { [key: string]: string }> | null =
    useMemo(() => {
      if (!currentLine || !selectedBound) {
        return EMPTY_TTS_TEXT
      }

      const map = {
        [APP_THEME.TOKYO_METRO]: {
          NEXT: firstSpeech
            ? `${
                currentLine.nameKatakana
              }をご利用くださいまして、ありがとうございます。次は${
                nextStation?.nameKatakana ?? ''
              }です。この電車は、${
                connectedLines.length
                  ? `${connectedLines
                      .map((l) => l.nameKatakana)
                      .join('、')}直通、`
                  : ''
              }${
                currentTrainType ? currentTrainType.nameKatakana : '各駅停車'
              }、${boundForJa ?? ''}ゆきです。${
                currentTrainType && afterNextStation
                  ? `${nextStation?.nameKatakana ?? ''}の次は${
                      isAfterNextStopTerminus ? '終点、' : ''
                    }${afterNextStation?.nameKatakana ?? ''}に停まります。`
                  : ''
              }${
                betweenNextStation.length
                  ? `${betweenNextStation
                      .map((s) => s.nameKatakana)
                      .join('、')}へおいでのお客様はお乗り換えです。`
                  : ''
              }`
            : `次は、${nextStation?.nameKatakana ?? ''}${
                isNextStopTerminus ? '終点' : ''
              }です。${
                currentTrainType && afterNextStation
                  ? `${nextStation?.nameKatakana ?? ''}の次は${
                      isAfterNextStopTerminus ? '終点、' : ''
                    }${afterNextStation?.nameKatakana ?? ''}に停まります。`
                  : ''
              }${
                betweenNextStation.length
                  ? `${betweenNextStation
                      .map((s) => s.nameKatakana)
                      .join('、')}へおいでのお客様はお乗り換えです。`
                  : ''
              }`,
          ARRIVING: `まもなく、${nextStation?.nameKatakana ?? ''}${
            isNextStopTerminus ? '終点' : ''
          }です。${
            isNextStopTerminus
              ? `${
                  currentLine.company?.nameShort ?? ''
                }をご利用くださいまして、ありがとうございました。`
              : ''
          }`,
        },
        [APP_THEME.TY]: {
          NEXT: `${
            firstSpeech
              ? `${
                  currentLine.nameKatakana
                }をご利用くださいまして、ありがとうございます。この電車は${
                  connectedLines.length
                    ? `${connectedLines
                        .map((l) => l.nameKatakana)
                        .join('、')}直通、`
                    : ''
                }${
                  currentTrainType ? currentTrainType.nameKatakana : '各駅停車'
                }、${boundForJa ?? ''}ゆきです。`
              : ''
          }次は、${nextStation?.nameKatakana ?? ''}${
            isNextStopTerminus ? '、終点' : ''
          }です。${
            transferLines.length
              ? `${transferLines
                  .map((l) => l.nameKatakana)
                  .join('、')}をご利用のお客様はお乗り換えです。`
              : ''
          }`,
          ARRIVING: `まもなく、${nextStation?.nameKatakana ?? ''}${
            isNextStopTerminus ? '、終点' : ''
          }です。${
            afterNextStation
              ? `${nextStation?.nameKatakana ?? ''}を出ますと、${
                  isAfterNextStopTerminus ? '終点、' : ''
                }${afterNextStation.nameKatakana}に停まります。` ?? ''
              : ''
          }`,
        },
        [APP_THEME.YAMANOTE]: {
          NEXT: `${
            firstSpeech
              ? `今日も、${
                  currentLine.company?.nameShort ?? ''
                }をご利用くださいまして、ありがとうございます。この電車は、${
                  boundForJa ?? ''
                }ゆきです。`
              : ''
          }次は${nextStation?.nameKatakana ?? ''}、${
            nextStation?.nameKatakana ?? ''
          }。${
            transferLines.length
              ? `${transferLines
                  .map((l) => l.nameKatakana)
                  .join('、')}はお乗り換えです。`
              : ''
          }`,
          ARRIVING: '',
        },
        [APP_THEME.JO]: {
          NEXT: '',
          ARRIVING: '',
        },
        [APP_THEME.SAIKYO]: {
          NEXT: `${
            firstSpeech
              ? `今日も、${
                  currentLine.company?.nameShort ?? ''
                }をご利用くださいまして、ありがとうございます。この電車は、${
                  boundForJa ?? ''
                }ゆきです。`
              : ''
          }次は${isNextStopTerminus ? '終点、' : ''}${
            nextStation?.nameKatakana ?? ''
          }、${nextStation?.nameKatakana ?? ''}。${
            transferLines.length
              ? `${transferLines
                  .map((l) => l.nameKatakana)
                  .join('、')}はお乗り換えです。`
              : ''
          }`,
          ARRIVING: `まもなく、${isNextStopTerminus ? '終点、' : ''}${
            nextStation?.nameKatakana ?? ''
          }、${nextStation?.nameKatakana ?? ''}。${
            transferLines.length
              ? `${transferLines
                  .map((l) => l.nameKatakana)
                  .join('、')}は、お乗り換えです。${
                  isNextStopTerminus
                    ? `${
                        currentLine.company?.nameShort ?? ''
                      }をご利用くださいまして、ありがとうございました。`
                    : ''
                }`
              : ''
          }`,
        },
        [APP_THEME.JR_WEST]: {
          NEXT: `${
            firstSpeech
              ? `今日も、${
                  currentLine.company?.nameShort ?? ''
                }をご利用くださいまして、ありがとうございます。この電車は、${
                  currentTrainType?.nameKatakana ?? ''
                }、${
                  allStops[2] ? `${allStops[2]?.nameKatakana}方面、` ?? '' : ''
                }${selectedBound.nameKatakana}ゆきです。${allStops
                  .slice(0, 5)
                  .map((s) =>
                    s.id === selectedBound?.id && !isLoopLine
                      ? `終点、${s.nameKatakana}`
                      : s.nameKatakana
                  )
                  .join('、')}の順に停まります。${
                  allStops
                    .slice(0, 5)
                    .filter((s) => s)
                    .reverse()[0]?.id === selectedBound?.id
                    ? ''
                    : `${
                        allStops
                          .slice(0, 5)
                          .filter((s) => s)
                          .reverse()[0]?.nameKatakana
                      }から先は、後ほどご案内いたします。`
                }`
              : ''
          }次は${nextStation?.nameKatakana ?? ''}、${
            nextStation?.nameKatakana ?? ''
          }です。`,
          ARRIVING: `まもなく${nextStation?.nameKatakana ?? ''}、${
            nextStation?.nameKatakana ?? ''
          }です。${
            afterNextStation
              ? `${nextStation?.nameKatakana}を出ますと、次は${afterNextStation.nameKatakana}に停まります。` ??
                ''
              : ''
          }`,
        },
        [APP_THEME.TOEI]: {
          NEXT: `${
            firstSpeech
              ? `${currentLine.nameKatakana}をご利用くださいまして、ありがとうございます。`
              : ''
          }次は${nextStation?.nameKatakana ?? ''}です。この電車は、${
            connectedLines.length
              ? `${connectedLines.map((l) => l.nameKatakana).join('、')}直通、`
              : ''
          }${currentTrainType ? currentTrainType.nameKatakana : '各駅停車'}、${
            boundForJa ?? ''
          }ゆきです。${
            currentTrainType && afterNextStation
              ? `${nextStation?.nameKatakana ?? ''}の次は${
                  isAfterNextStopTerminus ? '終点、' : ''
                }${afterNextStation?.nameKatakana ?? ''}に停まります。`
              : ''
          }${
            betweenNextStation.length
              ? `${betweenNextStation
                  .map((s) => s.nameKatakana)
                  .join('、')}へおいでのお客様はお乗り換えです。`
              : ''
          }`,
          ARRIVING: `まもなく、${nextStation?.nameKatakana ?? ''}です。`,
        },
        [APP_THEME.LED]: {
          NEXT: '',
          ARRIVING: '',
        },
      }
      return map
    }, [
      afterNextStation,
      allStops,
      betweenNextStation,
      boundForJa,
      connectedLines,
      currentLine,
      currentTrainType,
      firstSpeech,
      isAfterNextStopTerminus,
      isLoopLine,
      isNextStopTerminus,
      nextStation?.nameKatakana,
      selectedBound,
      transferLines,
    ])

  const englishTemplate: Record<AppTheme, { [key: string]: string }> | null =
    useMemo(() => {
      if (!currentLine || !selectedBound) {
        return EMPTY_TTS_TEXT
      }

      const map = {
        [APP_THEME.TOKYO_METRO]: {
          NEXT: `The next stop is ${
            nextStation?.nameRoman ?? ''
          } ${nextStationNumberText}.${
            firstSpeech
              ? ` This train is the ${
                  currentTrainType ? currentTrainType.nameRoman : 'Local'
                } Service on the ${
                  currentLine.nameRoman
                } bound for ${boundForEn}. ${
                  currentTrainType && afterNextStation
                    ? `The next stop after ${
                        nextStation?.nameRoman ?? ''
                      }${`, is ${afterNextStation?.nameRoman ?? ''}${
                        isAfterNextStopTerminus ? ' terminal' : ''
                      }`}.`
                    : ''
                }${
                  betweenNextStation.length
                    ? ' For stations in between, Please change trains at the next stop.'
                    : ''
                }`
              : ''
          }`,
          ARRIVING: `Arriving at ${
            nextStation?.nameRoman ?? ''
          }, ${nextStationNumberText}${
            isNextStopTerminus ? ', the last stop' : ''
          }.`,
        },
        [APP_THEME.TY]: {
          NEXT: `${
            firstSpeech
              ? `Thank you for using the ${
                  currentLine.nameRoman
                }. This is the ${replaceRomanText(
                  currentTrainType?.nameRoman ?? 'Local'
                )} train on the ${connectedLines[0]?.nameRoman ?? ''} to ${
                  selectedBound?.nameRoman
                }. `
              : ''
          }The next station is ${
            nextStation?.nameRoman
          } ${nextStationNumberText}${
            isNextStopTerminus ? ', the last stop' : ''
          }. ${
            transferLines.length
              ? `Passengers changing to the ${transferLines
                  .map((l) => l.nameRoman)
                  .join(', ')}, Please transfer at this station.`
              : ''
          }`,
          ARRIVING: `We will soon make a brief stop at ${
            nextStation?.nameRoman ?? ''
          }${nextStationNumberText}${
            isNextStopTerminus ? ', the last stop' : ''
          }. ${
            currentTrainType && afterNextStation
              ? ` The stop after ${nextStation?.nameRoman ?? ''}, will be ${
                  afterNextStation.nameRoman
                }${isNextStopTerminus ? ' the last stop' : ''}.` ?? ''
              : ''
          }`,
        },
        [APP_THEME.YAMANOTE]: {
          NEXT: `${
            firstSpeech
              ? `This is the ${currentLine.nameRoman} train bound for ${boundForEn}. `
              : ''
          }The next station is ${nextStation?.nameRoman} ${
            nextStationNumberText ?? ''
          }. ${
            transferLines.length
              ? `Please change here for ${transferLines
                  .map((l, i, a) =>
                    a.length > 1 && a.length - 1 === i
                      ? `and the ${l.nameRoman}.`
                      : `the ${l.nameRoman}`
                  )
                  .join(' ')}`
              : ''
          }`,
          ARRIVING: '',
        },
        [APP_THEME.JO]: {
          NEXT: '',
          ARRIVING: '',
        },
        [APP_THEME.SAIKYO]: {
          NEXT: `${
            firstSpeech
              ? `This is the ${currentLine.nameRoman} train bound for ${boundForEn}. `
              : ''
          }The next station is ${nextStation?.nameRoman ?? ''}${
            isNextStopTerminus ? ', terminal' : ''
          }, ${nextStationNumberText ?? ''}. ${
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
          ARRIVING: `The next station is ${nextStation?.nameRoman ?? ''},${
            isNextStopTerminus ? ', terminal' : ''
          } ${nextStationNumberText}. ${
            transferLines.length
              ? `Please change here for ${transferLines
                  .map((l, i, a) =>
                    a.length > 1 && a.length - 1 === i
                      ? `and the ${l.nameRoman}.`
                      : `the ${l.nameRoman}`
                  )
                  .join(' ')}`
              : ''
          }${
            isNextStopTerminus
              ? ' Thank you for traveling with us, and look forward serving you again.'
              : ''
          }`,
        },
        [APP_THEME.JR_WEST]: {
          NEXT: `${
            firstSpeech
              ? `Thank you for using ${replaceRomanText(
                  currentLine?.company?.nameEnglishShort ?? ''
                )}. This is the ${replaceRomanText(
                  currentTrainType?.nameRoman ?? 'Local'
                )} Service bound for ${boundForEn} ${
                  allStops[2]
                    ? `via ${replaceRomanText(allStops[2]?.nameRoman ?? '')}`
                    : ''
                }. We will be stopping at ${allStops
                  .slice(0, 5)
                  .map((s) =>
                    s.id === selectedBound?.id && !isLoopLine
                      ? `${replaceRomanText(s.nameRoman ?? '')} terminal`
                      : replaceRomanText(s.nameRoman ?? '')
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
                      )} will be announced later. `
                }`
              : ''
          }The next stop is ${nextStation?.nameRoman ?? ''}${
            nextStationNumber?.lineSymbol.length
              ? `, station number ${nextStationNumberText}`
              : ''
          }.`,
          ARRIVING: `We will soon be making a brief stop at ${
            nextStation?.nameRoman ?? ''
          }${
            nextStationNumber?.lineSymbol.length
              ? `, station number ${nextStationNumberText}`
              : ''
          }. After leaving ${nextStation?.nameRoman ?? ''}${
            afterNextStation
              ? `, we will be stopping at ${afterNextStation.nameRoman}`
              : ''
          }.`,
        },
        [APP_THEME.TOEI]: {
          NEXT: `The next stop is ${
            nextStation?.nameRoman
          } ${nextStationNumberText}.${
            firstSpeech
              ? ` This train is the ${
                  currentTrainType ? currentTrainType.nameRoman : 'Local'
                } Service on the ${
                  currentLine.nameRoman
                } bound for ${boundForEn} ${
                  currentTrainType && afterNextStation
                    ? `The next stop after ${nextStation?.nameRoman ?? ''}${
                        afterNextStation
                          ? `, is ${afterNextStation?.nameRoman ?? ''}${
                              isAfterNextStopTerminus ? ' terminal' : ''
                            }`
                          : ''
                      }`
                    : ''
                }.${
                  betweenNextStation.length
                    ? ' For stations in between, Please change trains at the next stop.'
                    : ''
                }`
              : ''
          }`,
          ARRIVING: `Arriving at ${
            nextStation?.nameRoman ?? ''
          }, ${nextStationNumberText}.`,
        },
        [APP_THEME.LED]: {
          NEXT: '',
          ARRIVING: '',
        },
      }
      return map
    }, [
      afterNextStation,
      allStops,
      betweenNextStation.length,
      boundForEn,
      connectedLines,
      currentLine,
      currentTrainType,
      firstSpeech,
      isAfterNextStopTerminus,
      isLoopLine,
      isNextStopTerminus,
      nextStation?.nameRoman,
      nextStationNumber?.lineSymbol.length,
      nextStationNumberText,
      replaceRomanText,
      selectedBound,
      transferLines,
    ])

  const jaText = useMemo(() => {
    if (theme === APP_THEME.LED) {
      const tmpl = japaneseTemplate?.TOKYO_METRO?.[stoppingState]
      if (!tmpl) {
        return ''
      }
      return tmpl
    }
    if (theme === APP_THEME.JO) {
      const tmpl = japaneseTemplate?.YAMANOTE?.[stoppingState]
      if (!tmpl) {
        return ''
      }
      return tmpl
    }

    const tmpl = japaneseTemplate?.[theme]?.[stoppingState]
    if (!tmpl) {
      return ''
    }
    return tmpl
  }, [japaneseTemplate, stoppingState, theme])

  const enText = useMemo(() => {
    if (theme === APP_THEME.LED) {
      const tmpl = englishTemplate?.TOKYO_METRO?.[stoppingState]
      if (!tmpl) {
        return ''
      }
      return tmpl
    }
    if (theme === APP_THEME.JO) {
      const tmpl = englishTemplate?.YAMANOTE?.[stoppingState]
      if (!tmpl) {
        return ''
      }
      return tmpl
    }

    const tmpl = englishTemplate?.[theme]?.[stoppingState]
    if (!tmpl) {
      return ''
    }

    return (
      tmpl
        // 環状運転のときに入る可能性
        .replaceAll('&', 'and')
        // 明治神宮前駅等で入る
        .replaceAll('`', '')
    )
  }, [englishTemplate, stoppingState, theme])

  return [jaText, enText]
}

export default useTTSText
