import { useCallback, useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { parenthesisRegexp } from '../constants/regexp'
import { Station } from '../gen/stationapi_pb'
import { APP_THEME, AppTheme } from '../models/Theme'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import themeState from '../store/atoms/theme'
import getIsPass from '../utils/isPass'
import omitJRLinesIfThresholdExceeded from '../utils/jr'
import katakanaToHiragana from '../utils/kanaToHiragana'
import { getIsLoopLine } from '../utils/loopLine'
import getSlicedStations from '../utils/slicedStations'
import { useAfterNextStation } from './useAfterNextStation'
import useConnectedLines from './useConnectedLines'
import { useCurrentLine } from './useCurrentLine'
import useCurrentStation from './useCurrentStation'
import useCurrentTrainType from './useCurrentTrainType'
import useIsTerminus from './useIsTerminus'
import useLoopLineBound from './useLoopLineBound'
import { useNextStation } from './useNextStation'
import { useNumbering } from './useNumbering'
import useTransferLines from './useTransferLines'

type CompatibleState = 'NEXT' | 'ARRIVING'

const EMPTY_TTS_TEXT = {
  [APP_THEME.TOKYO_METRO]: { NEXT: '', ARRIVING: '' },
  [APP_THEME.TY]: { NEXT: '', ARRIVING: '' },
  [APP_THEME.YAMANOTE]: { NEXT: '', ARRIVING: '' },
  [APP_THEME.JR_WEST]: { NEXT: '', ARRIVING: '' },
  [APP_THEME.SAIKYO]: { NEXT: '', ARRIVING: '' },
  [APP_THEME.TOEI]: { NEXT: '', ARRIVING: '' },
  [APP_THEME.LED]: { NEXT: '', ARRIVING: '' },
}

const useTTSText = (firstSpeech = true): string[] => {
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
  const transferLinesOriginal = useTransferLines()
  const [nextStationNumber] = useNumbering()
  const currentTrainTypeOrigin = useCurrentTrainType()
  const loopLineBoundJa = useLoopLineBound(false)
  const loopLineBoundEn = useLoopLineBound(false, 'EN')
  const nextStationOrigin = useNextStation()
  const isNextStopTerminus = useIsTerminus(nextStationOrigin)

  const replaceRomanText = useCallback(
    (str: string) =>
      str
        .replace('JR', 'J-R')
        // 赤嶺駅のように「mine」が入ると「マイン」と呼んでしまうので置き換える
        .replaceAll(
          /mine/gi,
          '<phoneme alphabet="ipa" ph="mine">mine</phoneme>'
        )
        // 宇部駅などの「うべ」を「ゆべ」等
        .replace(/ube/gi, '<phoneme alphabet="ipa" ph="ube">ube</phoneme>')
        // 明大前駅等
        .replace(/mei/gi, '<phoneme alphabet="ipa" ph="mei">mei</phoneme>')
        // 伊勢崎駅等
        .replace(
          /isesaki/gi,
          '<phoneme alphabet="ipa" ph="isesaki">isesaki</phoneme>'
        )
        .replace(/ise-/gi, '<phoneme alphabet="ipa" ph="ise">Ise-</phoneme>')
        // 京成
        .replace(
          /keisei/gi,
          '<phoneme alphabet="ipa" ph="keisei">keisei</phoneme>'
        )
        // 押上駅の「あげ」等
        .replace(/age/gi, '<phoneme alphabet="ipa" ph="age">age</phoneme>')
        // せんげん台駅等
        .replace(/gen/gi, '<phoneme alphabet="ipa" ph="gen">gen</phoneme>')
        // 西武
        .replace(
          /seibu/gi,
          '<phoneme alphabet="ipa" ph="seibu">seibu</phoneme>'
        )
        //伊予鉄
        .replace(
          /iyotetsu/gi,
          '<phoneme alphabet="ipa" ph="iyotetu">iyotetsu</phoneme>'
        ),
    []
  )

  const replaceJapaneseText = useCallback(
    (name: string, nameKatakana: string) =>
      `<sub alias="${katakanaToHiragana(nameKatakana)}">${name}</sub>`,
    []
  )

  const currentLine = useMemo(
    () =>
      currentLineOrigin && {
        ...currentLineOrigin,
        nameShort: replaceJapaneseText(
          currentLineOrigin.nameShort,
          currentLineOrigin.nameKatakana
        ),
        nameRoman: replaceRomanText(currentLineOrigin.nameRoman),
      },
    [currentLineOrigin, replaceJapaneseText, replaceRomanText]
  )

  const selectedBound = useMemo(
    () =>
      selectedBoundOrigin && {
        ...selectedBoundOrigin,
        name: replaceJapaneseText(
          selectedBoundOrigin.name,
          selectedBoundOrigin.nameKatakana
        ),
        nameRoman: replaceRomanText(selectedBoundOrigin.nameRoman),
      },
    [replaceJapaneseText, replaceRomanText, selectedBoundOrigin]
  )

  const currentTrainType = useMemo(
    () =>
      currentTrainTypeOrigin && {
        ...currentTrainTypeOrigin,
        name: replaceJapaneseText(
          currentTrainTypeOrigin.name.replace(parenthesisRegexp, ''),
          currentTrainTypeOrigin.nameKatakana.replace(parenthesisRegexp, '')
        ),
        nameRoman: replaceRomanText(
          currentTrainTypeOrigin.nameRoman.replace(parenthesisRegexp, '')
        ),
      },
    [replaceJapaneseText, replaceRomanText, currentTrainTypeOrigin]
  )

  const boundForJa = useMemo(
    () =>
      getIsLoopLine(currentLine, currentTrainType)
        ? replaceJapaneseText(
            loopLineBoundJa?.boundFor ?? '',
            loopLineBoundJa?.boundForKatakana ?? ''
          )
        : selectedBound?.name,
    [
      currentLine,
      loopLineBoundJa?.boundFor,
      loopLineBoundJa?.boundForKatakana,
      replaceJapaneseText,
      selectedBound?.name,
      currentTrainType,
    ]
  )

  const boundForEn = useMemo(
    () =>
      getIsLoopLine(currentLine, currentTrainType)
        ? loopLineBoundEn?.boundFor.replaceAll('&', ' and ')
        : selectedBound?.nameRoman.replaceAll('&', ' and '),
    [
      currentLine,
      loopLineBoundEn?.boundFor,
      selectedBound?.nameRoman,
      currentTrainType,
    ]
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
        parseInt(nextStationNumber.stationNumber, 10) ?? ''
      }`
    }

    const symbol = split[0]
    const num = split[2]
      ? `${parseInt(split[1])}-${parseInt(split[2])}`
      : parseInt(split[1]).toString()

    return `${
      nextStationNumber.lineSymbol.length || theme === APP_THEME.JR_WEST
        ? ''
        : 'Station Number '
    }${symbol}-${num}`
  }, [nextStationNumber, theme])

  const transferLines = useMemo(
    () =>
      omitJRLinesIfThresholdExceeded(transferLinesOriginal).map((l) => ({
        ...l,
        nameShort: replaceJapaneseText(l.nameShort, l.nameKatakana),
        nameRoman: replaceRomanText(l.nameRoman),
      })),
    [replaceJapaneseText, replaceRomanText, transferLinesOriginal]
  )

  const connectedLines = useMemo(
    () =>
      connectedLinesOrigin &&
      connectedLinesOrigin.map((l) => ({
        ...l,
        nameShort: replaceJapaneseText(l.nameShort, l.nameKatakana),
        nameRoman: replaceRomanText(l.nameRoman),
      })),
    [connectedLinesOrigin, replaceJapaneseText, replaceRomanText]
  )

  const slicedStationsOrigin = useMemo(
    () =>
      getSlicedStations({
        stations,
        currentStation: station,
        isInbound: selectedDirection === 'INBOUND',
        arrived,
        currentLine,
        currentTrainType,
      }).map((s) => ({
        ...s,
        name: replaceJapaneseText(s.name, s.nameKatakana),
      })),
    [
      arrived,
      currentLine,
      replaceJapaneseText,
      selectedDirection,
      station,
      stations,
      currentTrainType,
    ]
  )
  const nextStation = useMemo(
    () =>
      nextStationOrigin && {
        ...nextStationOrigin,
        name: replaceJapaneseText(
          nextStationOrigin.name,
          nextStationOrigin.nameKatakana
        ),
        nameRoman: replaceRomanText(nextStationOrigin.nameRoman),
      },
    [nextStationOrigin, replaceJapaneseText, replaceRomanText]
  )

  // 直通時、同じGroupIDの駅が違う駅として扱われるのを防ぐ(ex. 渋谷の次は渋谷に止まります)
  const slicedStations = Array.from(
    new Set(slicedStationsOrigin.map((s) => s.groupId))
  )
    .map((gid) => slicedStationsOrigin.find((s) => s.groupId === gid))
    .filter((s) => !!s) as Station.AsObject[]

  const afterNextStationOrigin = useAfterNextStation()
  const afterNextStation = useMemo<Station.AsObject | undefined>(() => {
    return (
      afterNextStationOrigin && {
        ...afterNextStationOrigin,
        name: replaceJapaneseText(
          afterNextStationOrigin.name,
          afterNextStationOrigin.nameKatakana
        ),
        nameRoman: replaceRomanText(afterNextStationOrigin.nameRoman),
        lines: afterNextStationOrigin.linesList.map((l) => ({
          ...l,
          nameShort: replaceJapaneseText(l.nameShort, l.nameKatakana),
          nameRoman: replaceRomanText(l.nameRoman),
        })),
      }
    )
  }, [afterNextStationOrigin, replaceJapaneseText, replaceRomanText])

  const currentStationIndex = useMemo(
    () => slicedStations.findIndex((s) => s.groupId === station?.groupId),
    [slicedStations, station?.groupId]
  )
  const nextStationIndex = useMemo(
    () => slicedStations.findIndex((s) => s.groupId === nextStation?.groupId),
    [nextStation?.groupId, slicedStations]
  )

  const betweenNextStation = useMemo(
    () => slicedStations.slice(currentStationIndex + 1, nextStationIndex),
    [currentStationIndex, nextStationIndex, slicedStations]
  )

  const isAfterNextStopTerminus = useIsTerminus(afterNextStation)

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
        NEXT: firstSpeech
          ? `${
              currentLine.nameShort
            }をご利用くださいまして、ありがとうございます。次は${
              nextStation?.name ?? ''
            }です。この電車は、${
              connectedLines.length
                ? `${connectedLines.map((l) => l.nameShort).join('、')}直通、`
                : ''
            }${currentTrainType ? currentTrainType.name : '各駅停車'}、${
              boundForJa ?? ''
            }ゆきです。${
              currentTrainType && afterNextStation
                ? `${nextStation?.name ?? ''}の次は${
                    isAfterNextStopTerminus ? '終点、' : ''
                  }${afterNextStation?.name ?? ''}に停まります。`
                : ''
            }${
              betweenNextStation.length
                ? `${betweenNextStation
                    .map((s) => s.name)
                    .join('、')}へおいでのお客様はお乗り換えです。`
                : ''
            }`
          : `次は${nextStation?.name ?? ''}です。${
              currentTrainType && afterNextStation
                ? `${nextStation?.name ?? ''}の次は${
                    isAfterNextStopTerminus ? '終点、' : ''
                  }${afterNextStation?.name ?? ''}に停まります。`
                : ''
            }${
              betweenNextStation.length
                ? `${betweenNextStation
                    .map((s) => s.name)
                    .join('、')}へおいでのお客様はお乗り換えです。`
                : ''
            }`,
        ARRIVING: `まもなく、${nextStation?.name ?? ''}${
          isNextStopTerminus ? '、終点' : ''
        }です。${
          isNextStopTerminus
            ? `${
                currentLine.company?.name ?? ''
              }をご利用くださいまして、ありがとうございました。`
            : ''
        }`,
      },
      [APP_THEME.TY]: {
        NEXT: `${
          firstSpeech
            ? `${
                currentLine.nameShort
              }をご利用くださいまして、ありがとうございます。この電車は${
                connectedLines.length
                  ? `${connectedLines.map((l) => l.nameShort).join('、')}直通、`
                  : ''
              }${currentTrainType ? currentTrainType.name : '各駅停車'}、${
                boundForJa ?? ''
              }ゆきです。`
            : ''
        }次は${nextStation?.name ?? ''}です。${
          transferLines.length
            ? `${transferLines
                .map((l) => l.nameShort)
                .join('、')}をご利用のお客様はお乗り換えです。`
            : ''
        }`,
        ARRIVING: `まもなく${nextStation?.name ?? ''}です。${
          afterNextStation
            ? `${nextStation?.name ?? ''}を出ますと、${
                afterNextStation.name
              }に停まります。` ?? ''
            : ''
        }`,
      },
      [APP_THEME.YAMANOTE]: {
        NEXT: `${
          firstSpeech
            ? `今日も、${
                currentLine.company?.name ?? ''
              }をご利用くださいまして、ありがとうございます。この電車は、${
                boundForJa ?? ''
              }ゆきです。`
            : ''
        }次は${nextStation?.name ?? ''}、${nextStation?.name ?? ''}。${
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
          firstSpeech
            ? `今日も、${
                currentLine.company?.nameShort ?? ''
              }をご利用くださいまして、ありがとうございます。この電車は、${
                boundForJa ?? ''
              }ゆきです。`
            : ''
        }次は${isNextStopTerminus ? '終点、' : ''}${nextStation?.name ?? ''}、${
          nextStation?.name ?? ''
        }。${
          transferLines.length
            ? `${transferLines
                .map((l) => l.nameShort)
                .join('、')}はお乗り換えです。`
            : ''
        }`,
        ARRIVING: `まもなく、${isNextStopTerminus ? '終点、' : ''}${
          nextStation?.name ?? ''
        }、${nextStation?.name ?? ''}。${
          transferLines.length
            ? `${transferLines
                .map((l) => l.nameShort)
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
                currentLine.company?.name ?? ''
              }をご利用くださいまして、ありがとうございます。この電車は、${
                currentTrainType?.name ?? ''
              }、${allStops[2] ? `${allStops[2]?.name}方面、` ?? '' : ''}${
                selectedBound.name
              }ゆきです。${allStops
                .slice(0, 5)
                .map((s) =>
                  s.id === selectedBound?.id &&
                  !getIsLoopLine(currentLine, currentTrainType)
                    ? `終点、${s.name}`
                    : s.name
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
                        .reverse()[0]?.name
                    }から先は、後ほどご案内いたします。`
              }`
            : ''
        }次は${nextStation?.name ?? ''}、${nextStation?.name ?? ''}です。`,
        ARRIVING: `まもなく${nextStation?.name ?? ''}、${
          nextStation?.name ?? ''
        }です。${
          afterNextStation
            ? `${nextStation?.name}を出ますと、次は${afterNextStation.name}に停まります。` ??
              ''
            : ''
        }`,
      },
      [APP_THEME.TOEI]: {
        NEXT: `${
          firstSpeech
            ? `${currentLine.nameShort}をご利用くださいまして、ありがとうございます。`
            : ''
        }次は${nextStation?.name ?? ''}です。この電車は、${
          connectedLines.length
            ? `${connectedLines.map((l) => l.nameShort).join('、')}直通、`
            : ''
        }${currentTrainType ? currentTrainType.name : '各駅停車'}、${
          boundForJa ?? ''
        }ゆきです。${
          currentTrainType && afterNextStation
            ? `${nextStation?.name ?? ''}の次は${
                isAfterNextStopTerminus ? '終点、' : ''
              }${afterNextStation?.name ?? ''}に停まります。`
            : ''
        }${
          betweenNextStation.length
            ? `${betweenNextStation
                .map((s) => s.name)
                .join('、')}へおいでのお客様はお乗り換えです。`
            : ''
        }`,
        ARRIVING: `まもなく、${nextStation?.name ?? ''}です。`,
      },

      /// TODO: 一旦メトロと同じ文言だが、将来的には変更する
      [APP_THEME.LED]: {
        NEXT: firstSpeech
          ? `${
              currentLine.nameShort
            }をご利用くださいまして、ありがとうございます。次は${
              nextStation?.name ?? ''
            }です。この電車は、${
              connectedLines.length
                ? `${connectedLines.map((l) => l.nameShort).join('、')}直通、`
                : ''
            }${currentTrainType ? currentTrainType.name : '各駅停車'}、${
              boundForJa ?? ''
            }ゆきです。${
              currentTrainType && afterNextStation
                ? `${nextStation?.name ?? ''}の次は${
                    isAfterNextStopTerminus ? '終点、' : ''
                  }${afterNextStation?.name ?? ''}に停まります。`
                : ''
            }${
              betweenNextStation.length
                ? `${betweenNextStation
                    .map((s) => s.name)
                    .join('、')}へおいでのお客様はお乗り換えです。`
                : ''
            }`
          : `次は${nextStation?.name ?? ''}です。${
              currentTrainType && afterNextStation
                ? `${nextStation?.name ?? ''}の次は${
                    isAfterNextStopTerminus ? '終点、' : ''
                  }${afterNextStation?.name ?? ''}に停まります。`
                : ''
            }${
              betweenNextStation.length
                ? `${betweenNextStation
                    .map((s) => s.name)
                    .join('、')}へおいでのお客様はお乗り換えです。`
                : ''
            }`,
        ARRIVING: `まもなく、${nextStation?.name ?? ''}${
          isNextStopTerminus ? '、終点' : ''
        }です。${
          isNextStopTerminus
            ? `${
                currentLine.company?.name ?? ''
              }をご利用くださいまして、ありがとうございました。`
            : ''
        }`,
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
    firstSpeech,
    isAfterNextStopTerminus,
    isNextStopTerminus,
    nextStation?.name,
    selectedBound,
    selectedDirection,
    currentTrainType,
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
          nextStation?.nameRoman ?? ''
        } ${nextStationNumberText}.${
          firstSpeech
            ? ` This train is the ${
                currentTrainType ? currentTrainType.nameRoman : 'Local'
              } Service on the ${
                currentLine.nameRoman
              } bound for ${boundForEn}. ${
                currentTrainType && afterNextStation
                  ? `The next stop after ${nextStation?.nameRoman ?? ''}${`is ${
                      afterNextStation?.nameRoman ?? ''
                    }${isAfterNextStopTerminus ? ' terminal' : ''}`}.`
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
              }. This train will merge and continue traveling at the ${
                replaceRomanText(currentTrainType?.nameRoman ?? '') ?? 'Local'
              } Train on the ${connectedLines[0]?.nameRoman ?? ''} to ${
                selectedBound?.nameRoman
              }. `
            : ''
        }The next station is ${
          nextStation?.nameRoman
        } ${nextStationNumberText}. ${
          transferLines.length
            ? `Passengers changing to the ${transferLines
                .map((l) => l.nameRoman)
                .join(', ')}, Please transfer at this station.`
            : ''
        }`,
        ARRIVING: `We will soon make a brief stop at ${
          nextStation?.nameRoman ?? ''
        } ${nextStationNumberText}.${
          currentTrainType && afterNextStation
            ? ` The stop after ${nextStation?.nameRoman ?? ''}, will be ${
                afterNextStation.nameRoman
              }.` ?? ''
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
                currentLine?.company?.nameEnglishFull ?? ''
              )}. This is the ${replaceRomanText(
                currentTrainType?.nameRoman ?? 'Local'
              )} Service bound for ${boundForEn} ${
                allStops[2]
                  ? `via ${replaceRomanText(allStops[2]?.nameRoman ?? '')}`
                  : ''
              }. We will be stopping at ${allStops
                .slice(0, 5)
                .map((s) =>
                  s.id === selectedBound?.id &&
                  !getIsLoopLine(currentLine, currentTrainType)
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
                    )} will be announced later. `
              }`
            : ''
        }The next stop is ${
          nextStation?.nameRoman ?? ''
        }, station number ${nextStationNumberText}.`,
        ARRIVING: `We will soon be making a brief stop at ${
          nextStation?.nameRoman ?? ''
        }, station number ${nextStationNumberText}. After leaving ${
          nextStation?.nameRoman ?? ''
        }${
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
                        ? `is ${afterNextStation?.nameRoman ?? ''}${
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
      /// TODO: 日本語と同じく一旦メトロと同じ文言だが、将来的には変更する
      [APP_THEME.LED]: {
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
                  ? `The next stop after ${nextStation?.nameRoman ?? ''}${`is ${
                      afterNextStation?.nameRoman ?? ''
                    }${isAfterNextStopTerminus ? ' terminal' : ''}`}.`
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
    }
    return map
  }, [
    afterNextStation,
    allStops,
    betweenNextStation.length,
    boundForEn,
    connectedLines,
    currentLine,
    firstSpeech,
    isAfterNextStopTerminus,
    isNextStopTerminus,
    nextStation?.nameRoman,
    nextStationNumberText,
    replaceRomanText,
    selectedBound,
    selectedDirection,
    currentTrainType,
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

    return (
      tmpl
        // 環状運転のときに入る可能性
        .replaceAll('&', 'and')
        // 明治神宮前駅等で入る
        .replaceAll('`', '')
    )
  }, [englishTemplate, headerState, theme])

  return [jaText, enText]
}

export default useTTSText
