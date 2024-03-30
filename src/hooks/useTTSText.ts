import { useCallback, useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { Station } from '../../gen/proto/stationapi_pb'
import { normalizeRomanText } from '../../src/utils/normalize'
import { parenthesisRegexp } from '../constants'
import { APP_THEME, AppTheme } from '../models/Theme'
import stationState from '../store/atoms/station'
import themeState from '../store/atoms/theme'
import { currentLineSelector } from '../store/selectors/currentLine'
import { currentStationSelector } from '../store/selectors/currentStation'
import getIsPass from '../utils/isPass'
import omitJRLinesIfThresholdExceeded from '../utils/jr'
import katakanaToHiragana from '../utils/kanaToHiragana'
import { SSMLBuilder } from '../utils/ssml'
import { useAfterNextStation } from './useAfterNextStation'
import { useBeforeStopFromTerminus } from './useBeforeStopsFromTerminus'
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
  const beforeStopFromTerminus = useBeforeStopFromTerminus()

  const replaceJapaneseText = useCallback(
    (name: string | undefined, nameKatakana: string | undefined) =>
      !name || !nameKatakana
        ? undefined
        : `<sub alias="${katakanaToHiragana(nameKatakana)}">${name}</sub>`,
    []
  )

  const currentLine = useMemo(
    () =>
      currentLineOrigin && {
        ...currentLineOrigin,
        nameRoman: normalizeRomanText(currentLineOrigin?.nameRoman ?? ''),
      },
    [currentLineOrigin]
  )

  const selectedBound = useMemo<Station | null>(
    () =>
      selectedBoundOrigin &&
      new Station({
        ...selectedBoundOrigin,
        nameRoman: normalizeRomanText(selectedBoundOrigin?.nameRoman ?? ''),
      }),
    [selectedBoundOrigin]
  )

  const currentTrainType = useMemo(
    () =>
      currentTrainTypeOrigin && {
        ...currentTrainTypeOrigin,
        nameRoman: normalizeRomanText(
          currentTrainTypeOrigin.nameRoman?.replace(parenthesisRegexp, '') ?? ''
        ),
      },
    [currentTrainTypeOrigin]
  )

  const boundForJa = useMemo(
    () =>
      isLoopLine
        ? replaceJapaneseText(
            loopLineBoundJa?.boundFor,
            loopLineBoundJa?.boundForKatakana
          )
        : replaceJapaneseText(selectedBound?.name, selectedBound?.nameKatakana),
    [
      isLoopLine,
      loopLineBoundJa?.boundFor,
      loopLineBoundJa?.boundForKatakana,
      replaceJapaneseText,
      selectedBound?.name,
      selectedBound?.nameKatakana,
    ]
  )

  const boundForEn = useMemo(
    () =>
      isLoopLine
        ? loopLineBoundEn?.boundFor.replaceAll('&', ' and ')
        : selectedBound?.nameRoman?.replaceAll('&', ' and '),
    [isLoopLine, loopLineBoundEn?.boundFor, selectedBound?.nameRoman]
  )

  const [boundStationNumber] = useNumbering(false, selectedBound)

  const boundStationNumberText = useMemo(() => {
    if (!boundStationNumber || isLoopLine) {
      return ''
    }

    const split = boundStationNumber.stationNumber?.split('-')

    if (!split.length) {
      return ''
    }
    if (split.length === 1) {
      return `${theme === APP_THEME.JR_WEST ? '' : 'Station Number '}${
        Number(boundStationNumber.stationNumber) ?? ''
      }`
    }

    const symbol = `<say-as interpret-as="characters">${split[0]}</say-as>`
    const num = split[2]
      ? `${Number(split[1])} ${Number(split[2])}`
      : ` ${Number(split[1])}`

    return `${
      boundStationNumber.lineSymbol.length || theme === APP_THEME.JR_WEST
        ? ''
        : 'Station Number '
    }${symbol} ${num}.`
  }, [boundStationNumber, isLoopLine, theme])

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
      ? `${Number(split[1])} ${Number(split[2])}`
      : ` ${Number(split[1])}`

    return `${
      nextStationNumber.lineSymbol.length || theme === APP_THEME.JR_WEST
        ? ''
        : 'Station Number '
    }${symbol} ${num}.`
  }, [nextStationNumber, theme])

  const transferLines = useMemo(
    () =>
      omitJRLinesIfThresholdExceeded(transferLinesOriginal).map((l) => ({
        ...l,
        nameRoman: normalizeRomanText(l.nameRoman ?? ''),
      })),
    [transferLinesOriginal]
  )

  const transferLinesTextEn = transferLines
    .map((l, i, a) =>
      a.length > 1 && a.length - 1 === i
        ? `and the ${l.nameRoman}.`
        : `the ${l.nameRoman}${a.length === 1 ? '.' : ','}`
    )
    .join(' ')

  const connectedLines = useMemo(
    () =>
      connectedLinesOrigin &&
      connectedLinesOrigin.map((l) => ({
        ...l,
        nameRoman: normalizeRomanText(l.nameRoman ?? ''),
      })),
    [connectedLinesOrigin]
  )

  const nextStation = useMemo(
    () =>
      nextStationOrigin && {
        ...nextStationOrigin,
        nameRoman: normalizeRomanText(nextStationOrigin.nameRoman ?? ''),
      },
    [nextStationOrigin]
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
        nameRoman: normalizeRomanText(afterNextStationOrigin?.nameRoman ?? ''),
        lines: afterNextStationOrigin.lines.map((l) => ({
          ...l,
          nameRoman: normalizeRomanText(l.nameRoman ?? ''),
        })),
      })
    )
  }, [afterNextStationOrigin])

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
          NEXT: (() => {
            const builder = new SSMLBuilder(false)

            if (firstSpeech) {
              builder
                .add(
                  replaceJapaneseText(
                    currentLine?.nameShort,
                    currentLine?.nameKatakana
                  ) ?? ''
                )
                .add('をご利用くださいまして、ありがとうございます。')
            }

            builder
              .add('次は')
              .add(
                replaceJapaneseText(
                  nextStation?.name,
                  nextStation?.nameKatakana
                ) ?? ''
              )
              .add('です。')

            if (transferLines.length) {
              builder
                .add(
                  transferLines
                    .map((line) =>
                      replaceJapaneseText(line.nameShort, line.nameKatakana)
                    )
                    .join('、')
                )
                .add('はお乗り換えです。')
            }

            if (firstSpeech) {
              builder.add('この電車は、')
              if (connectedLines.length) {
                builder
                  .add(
                    connectedLines
                      .map((line) =>
                        replaceJapaneseText(line.nameShort, line.nameKatakana)
                      )
                      .join('、')
                  )
                  .add('直通、')
              }

              builder
                .add(
                  replaceJapaneseText(
                    currentTrainType?.name,
                    currentTrainType?.nameKatakana
                  ) ?? '各駅停車'
                )
                .add('、')
                .add(boundForJa ?? '')
                .add('ゆきです。')
            }

            return builder.ssml()
          })(),
          ARRIVING: (() => {
            const builder = new SSMLBuilder(false)

            builder
              .add('まもなく、')
              .add(
                replaceJapaneseText(
                  nextStation?.name,
                  nextStation?.nameKatakana
                ) ?? ''
              )
              .add('です。')

            return builder.ssml()
          })(),
        },
        [APP_THEME.TY]: {
          NEXT: (() => {
            const builder = new SSMLBuilder(false)

            builder
              .add('次は、')
              .add(
                replaceJapaneseText(
                  nextStation?.name,
                  nextStation?.nameKatakana
                ) ?? ''
              )
              .add('です。')
            if (transferLines.length) {
              builder
                .add(
                  transferLines
                    .map((line) =>
                      replaceJapaneseText(line.nameShort, line.nameKatakana)
                    )
                    .join('、')
                )
                .add('をご利用のお客様はお乗り換えです。')
            }

            return builder.ssml()
          })(),
          ARRIVING: (() => {
            const builder = new SSMLBuilder(false)

            builder
              .add('まもなく、')
              .add(
                replaceJapaneseText(
                  nextStation?.name,
                  nextStation?.nameKatakana
                ) ?? ''
              )
              .add('です。')

            if (afterNextStation) {
              builder
                .add(
                  replaceJapaneseText(
                    nextStation?.name,
                    nextStation?.nameKatakana
                  ) ?? ''
                )
                .add('を出ますと、')
                .add(
                  replaceJapaneseText(
                    afterNextStation.name,
                    afterNextStation.nameKatakana
                  ) ?? ''
                )
                .add('に停まります。')
            }

            return builder.ssml()
          })(),
        },
        [APP_THEME.YAMANOTE]: {
          NEXT: (() => {
            const builder = new SSMLBuilder(false)

            builder
              .add('次は、')
              .add(
                replaceJapaneseText(
                  nextStation?.name,
                  nextStation?.nameKatakana
                ) ?? ''
              )
              .add('、')
              .add(
                replaceJapaneseText(
                  nextStation?.name,
                  nextStation?.nameKatakana
                ) ?? ''
              )
              .add('。')
            if (transferLines.length) {
              builder.add(
                transferLines
                  .map(
                    (line) =>
                      replaceJapaneseText(line.nameShort, line.nameKatakana) ??
                      ''
                  )
                  .join('、')
              )
            }
            builder.add('はお乗り換えです。')

            return builder.ssml()
          })(),
          ARRIVING: '',
        },
        [APP_THEME.JO]: {
          NEXT: '',
          ARRIVING: '',
        },
        [APP_THEME.SAIKYO]: {
          NEXT: (() => {
            const builder = new SSMLBuilder(false)

            builder
              .add('次は、')
              .add(
                replaceJapaneseText(
                  nextStation?.name,
                  nextStation?.nameKatakana
                ) ?? ''
              )
              .add('、')
              .add(
                replaceJapaneseText(
                  nextStation?.name,
                  nextStation?.nameKatakana
                ) ?? ''
              )
              .add('。')

            if (transferLines.length) {
              builder
                .add(
                  transferLines
                    .map((l) =>
                      replaceJapaneseText(l.nameShort, l.nameKatakana)
                    )
                    .join('、')
                )
                .add('は、お乗り換えです。')
            }

            return builder.ssml()
          })(),
          ARRIVING: (() => {
            const builder = new SSMLBuilder(false)

            builder
              .add('まもなく、')
              .add(
                replaceJapaneseText(
                  nextStation?.name,
                  nextStation?.nameKatakana
                ) ?? ''
              )
              .add('、')
              .add(
                replaceJapaneseText(
                  nextStation?.name,
                  nextStation?.nameKatakana
                ) ?? ''
              )
              .add('。')

            if (transferLines.length) {
              builder
                .add(
                  transferLines
                    .map((l) =>
                      replaceJapaneseText(l.nameShort, l.nameKatakana)
                    )
                    .join('、')
                )
                .add('は、お乗り換えです。')
            }

            return builder.ssml()
          })(),
        },
        [APP_THEME.JR_WEST]: {
          NEXT: (() => {
            const builder = new SSMLBuilder(false)

            builder
              .add('次は、')
              .add(
                replaceJapaneseText(
                  nextStation?.name,
                  nextStation?.nameKatakana
                ) ?? ''
              )
            builder
              .add('、')
              .add(
                replaceJapaneseText(
                  nextStation?.name,
                  nextStation?.nameKatakana
                ) ?? ''
              )
              .add('です。')

            if (transferLines.length) {
              builder
                .add(
                  transferLines
                    .map((l) =>
                      replaceJapaneseText(l.nameShort, l.nameKatakana)
                    )
                    .join('、')
                )
                .add('はお乗り換えです。')
            }

            return builder.ssml()
          })(),
          ARRIVING: (() => {
            const builder = new SSMLBuilder(false)

            builder
              .add('まもなく、')
              .add(
                replaceJapaneseText(
                  nextStation?.name,
                  nextStation?.nameKatakana
                ) ?? ''
              )
              .add('、')
              .add(
                replaceJapaneseText(
                  nextStation?.name,
                  nextStation?.nameKatakana
                ) ?? ''
              )
              .add('です。')

            if (transferLines.length) {
              builder
                .add(
                  transferLines
                    .map((l) =>
                      replaceJapaneseText(l.nameShort, l.nameKatakana)
                    )
                    .join('、')
                )
                .add('はお乗り換えです。')
            }

            if (afterNextStation) {
              builder
                .add(
                  replaceJapaneseText(
                    nextStation?.name,
                    nextStation?.nameKatakana
                  ) ?? ''
                )
                .add('を出ますと、次は、')
                .add(
                  replaceJapaneseText(
                    afterNextStation.name,
                    afterNextStation.nameKatakana
                  ) ?? ''
                )
                .add('に停まります。')
            }

            return builder.ssml()
          })(),
        },
        [APP_THEME.TOEI]: {
          NEXT: (() => {
            const builder = new SSMLBuilder(false)

            builder
              .add('次は、')
              .add(
                replaceJapaneseText(
                  nextStation?.name,
                  nextStation?.nameKatakana
                ) ?? ''
              )
              .add('、')
              .add(
                replaceJapaneseText(
                  nextStation?.name,
                  nextStation?.nameKatakana
                ) ?? ''
              )
              .add('。 ')
              .add(
                transferLines
                  .map(
                    (line) =>
                      `${
                        replaceJapaneseText(
                          line.nameShort,
                          line.nameKatakana
                        ) ?? ''
                      }`
                  )
                  .join('、')
              )
              .add('はお乗り換えです。')
              .add('この電車は、')
              .add(
                replaceJapaneseText(
                  currentTrainType?.name,
                  currentTrainType?.nameKatakana
                ) ?? '各駅停車'
              )
              .add('、')
              .add(boundForJa ?? '')
              .add('ゆきです。')

            return builder.ssml()
          })(),
          ARRIVING: (() => {
            const builder = new SSMLBuilder(false)

            builder
              .add('まもなく、')
              .add(
                replaceJapaneseText(
                  nextStation?.name,
                  nextStation?.nameKatakana
                ) ?? ''
              )
              .add('、')
              .add(
                replaceJapaneseText(
                  nextStation?.name,
                  nextStation?.nameKatakana
                ) ?? ''
              )
              .add('。')

            if (transferLines.length) {
              builder
                .add(
                  transferLines
                    .map((line) =>
                      replaceJapaneseText(line.nameShort, line.nameKatakana)
                    )
                    .join('、')
                )
                .add('はお乗り換えです。')
            }

            return builder.ssml()
          })(),
        },
        [APP_THEME.LED]: {
          NEXT: '',
          ARRIVING: '',
        },
      }
      return map
    }, [
      afterNextStation,
      boundForJa,
      connectedLines,
      currentLine,
      currentTrainType?.name,
      currentTrainType?.nameKatakana,
      firstSpeech,
      nextStation?.name,
      nextStation?.nameKatakana,
      replaceJapaneseText,
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
          NEXT: (() => {
            const builder = new SSMLBuilder()
            if (firstSpeech) {
              builder
                .add('This train is bound for')
                .add(boundForEn ?? '')
                .add(boundStationNumberText.replace(/\.$/, ''))
                .add('on the')
                .add(`${selectedBound.line?.nameRoman ?? ''}.`)
            }
            builder
              .add('The next station is')
              .add(nextStation?.nameRoman ?? '')
              .add(nextStationNumberText)

            if (afterNextStation) {
              builder
                .add('The next stop after')
                .add(nextStation?.nameRoman ?? '')
                .add('is')
                .add(`${afterNextStation.nameRoman ?? ''}.`)
            }

            if (transferLines.length) {
              builder.add('Please change here for').add(transferLinesTextEn)
            }
            return builder.ssml()
          })(),
          ARRIVING: (() => {
            const builder = new SSMLBuilder()
            builder
              .add('Arriving at')
              .add(nextStation?.nameRoman ?? '')
              .add(nextStationNumberText)

            if (transferLines.length) {
              builder.add('Please change here for').add(transferLinesTextEn)
            }

            return builder.ssml()
          })(),
        },
        [APP_THEME.TY]: {
          NEXT: (() => {
            const builder = new SSMLBuilder()

            builder
              .add('The next station is')
              .add(nextStation?.nameRoman ?? '')
              .add(nextStationNumberText)

            if (transferLines.length) {
              builder
                .add('Passengers changing to')
                .add(transferLinesTextEn.replace('.', ','))
            }

            builder.add('Please transfer at this station.')

            return builder.ssml()
          })(),
          ARRIVING: (() => {
            const builder = new SSMLBuilder()

            builder
              .add('We will soon make a brief stop at')
              .add(nextStation?.nameRoman ?? '')
              .add(nextStationNumberText)

            return builder.ssml()
          })(),
        },
        [APP_THEME.YAMANOTE]: {
          NEXT: (() => {
            const builder = new SSMLBuilder()

            builder
              .add('The next station is')
              .add(nextStation?.nameRoman ?? '')
              .add(nextStationNumberText)
            if (transferLines.length) {
              builder.add('Please change here for').add(transferLinesTextEn)
            }

            return builder.ssml()
          })(),
          ARRIVING: '',
        },
        [APP_THEME.JO]: {
          NEXT: '',
          ARRIVING: '',
        },
        [APP_THEME.SAIKYO]: {
          NEXT: (() => {
            const builder = new SSMLBuilder()
            builder
              .add('The next station is')
              .add(nextStation?.nameRoman ?? '')
              .add(nextStationNumberText)

            if (transferLines.length) {
              builder
                .add('Please change here for')
                .add(
                  transferLines
                    .map((l, i, a) =>
                      a.length > 1 && a.length - 1 === i
                        ? `and the ${l.nameRoman}.`
                        : `the ${l.nameRoman}${a.length === 1 ? '.' : ','}`
                    )
                    .join(' ')
                )
            }

            return builder.ssml()
          })(),
          ARRIVING: (() => {
            const builder = new SSMLBuilder()

            builder
              .add('The next station is')
              .add(nextStation?.nameRoman ?? '')
              .add(nextStationNumberText)

            if (transferLines.length) {
              builder
                .add('Please change here for')
                .add(
                  transferLines
                    .map((l, i, a) =>
                      a.length > 1 && a.length - 1 === i
                        ? `and the ${l.nameRoman}.`
                        : `the ${l.nameRoman}${a.length === 1 ? '.' : ','}`
                    )
                    .join(' ')
                )
            }

            return builder.ssml()
          })(),
        },
        [APP_THEME.JR_WEST]: {
          NEXT: (() => {
            const builder = new SSMLBuilder()

            builder
              .add('The next stop is')
              .add(nextStation?.nameRoman ?? '')
              .add('station number')
              .add(nextStationNumberText ?? '')
            if (transferLines.length) {
              builder.add('Transfer here for').add(transferLinesTextEn)
            }

            return builder.ssml()
          })(),
          ARRIVING: (() => {
            const builder = new SSMLBuilder()

            builder
              .add('We will soon be making a brief stop at')
              .add(nextStation?.nameRoman ?? '')
              .add('station number')
              .add(nextStationNumberText)

            if (transferLines.length) {
              builder.add('Transfer here for').add(transferLinesTextEn)
            }

            if (afterNextStation) {
              builder
                .add('After leaving')
                .add(`${nextStation?.nameRoman ?? ''},`)
                .add('We will be stopping at')
                .add(afterNextStation.nameRoman ?? '')
                .add('.')
            }

            return builder.ssml()
          })(),
        },
        [APP_THEME.TOEI]: {
          NEXT: (() => {
            const builder = new SSMLBuilder()

            if (firstSpeech) {
              builder
                .add('This is the')
                .add(currentTrainType?.nameRoman ?? 'Local')
                .add('train bound for')
                .add(`${boundForEn}.` ?? '')
            }

            builder
              .add('The next station is')
              .add(nextStation?.nameRoman ?? '')
              .add(nextStationNumberText)

            if (transferLines.length) {
              builder
                .add('Please change here for')
                .add(
                  transferLines
                    .map((l, i, a) =>
                      a.length > 1 && a.length - 1 === i
                        ? `and the ${l.nameRoman}.`
                        : `the ${l.nameRoman}${a.length === 1 ? '.' : ','}`
                    )
                    .join(' ')
                )
            }

            return builder.ssml()
          })(),
          ARRIVING: (() => {
            const builder = new SSMLBuilder()

            builder
              .add('We will soon be arriving at')
              .add(nextStation?.nameRoman ?? '')
              .add(nextStationNumberText)

            if (transferLines.length) {
              builder
                .add('Please change here for')
                .add(
                  transferLines
                    .map((l, i, a) =>
                      a.length > 1 && a.length - 1 === i
                        ? `and the ${l.nameRoman}.`
                        : `the ${l.nameRoman}${a.length === 1 ? '.' : ','}`
                    )
                    .join(' ')
                )
            }

            return builder.ssml()
          })(),
        },
        [APP_THEME.LED]: {
          NEXT: '',
          ARRIVING: '',
        },
      }
      return map
    }, [
      afterNextStation,
      boundForEn,
      boundStationNumberText,
      currentLine,
      currentTrainType?.nameRoman,
      firstSpeech,
      nextStation?.nameRoman,
      nextStationNumberText,
      selectedBound,
      transferLines,
      transferLinesTextEn,
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
