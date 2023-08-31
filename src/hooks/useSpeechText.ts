import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { parenthesisRegexp } from '../constants/regexp'
import { APP_THEME, AppTheme } from '../models/Theme'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import themeState from '../store/atoms/theme'
import omitJRLinesIfThresholdExceeded from '../utils/jr'
import useConnectedLines from './useConnectedLines'
import useCurrentLine from './useCurrentLine'
import useCurrentTrainType from './useCurrentTrainType'
import useNextStation from './useNextStation'
import useTransferLines from './useTransferLines'

type CompatibleState = 'NEXT' | 'ARRIVING'

const useSpeechText = (): string[] => {
  const { headerState } = useRecoilValue(navigationState)
  const { theme } = useRecoilValue(themeState)
  const currentLine = useCurrentLine()
  const connectedLinesOrigin = useConnectedLines()
  const nextStation = useNextStation(false)
  const transferLinesOriginal = useTransferLines()

  const transferLines = useMemo(
    () =>
      omitJRLinesIfThresholdExceeded(transferLinesOriginal).map((l) => ({
        ...l,
        nameRoman: l.nameRoman.replace('JR', 'J-R'),
        nameShort: l.nameShort.replace(parenthesisRegexp, ''),
      })),
    [transferLinesOriginal]
  )

  const connectedLines = useMemo(
    () =>
      connectedLinesOrigin &&
      connectedLinesOrigin.map((l) => ({
        ...l,
        nameShort: l.nameShort.replace(parenthesisRegexp, ''),
        nameRoman: l.nameRoman
          .replace('JR', 'J-R')
          .replace(parenthesisRegexp, ''),
      })),
    [connectedLinesOrigin]
  )
  const trainType = useCurrentTrainType()

  const {
    selectedBound: selectedBoundOrigin,
    stations,
    selectedDirection,
  } = useRecoilValue(stationState)

  const selectedBound = useMemo(
    () =>
      selectedBoundOrigin && {
        ...selectedBoundOrigin,
        nameRoman: selectedBoundOrigin.nameRoman
          ?.replace('JR', 'J-R')
          ?.replace(parenthesisRegexp, ''),
      },
    [selectedBoundOrigin]
  )

  const japaneseTemplate: Record<
    AppTheme,
    Record<CompatibleState, string>
  > | null = useMemo(
    () =>
      currentLine && {
        [APP_THEME.TOKYO_METRO]: {
          NEXT: '',
          ARRIVING: '',
        },
        [APP_THEME.TY]: {
          NEXT: `${
            currentLine.nameShort
          }をご利用くださいまして、ありがとうございます。この電車は${connectedLines
            .map((l) => l.nameShort)
            .join('、')}直通、${trainType?.name ?? ''}${
            selectedBound?.name ?? ''
          }行きです。次は${nextStation?.nameKatakana ?? ''}、${
            nextStation?.nameKatakana ?? ''
          }です。${transferLines
            .map((l) => l.nameShort)
            .join('、')}ご利用のお客様は乗り換えです。`,
          ARRIVING: '',
        },
        [APP_THEME.YAMANOTE]: { NEXT: '', ARRIVING: '' },
        [APP_THEME.JR_WEST]: { NEXT: '', ARRIVING: '' },
        [APP_THEME.SAIKYO]: { NEXT: '', ARRIVING: '' },
        [APP_THEME.JR_WEST]: { NEXT: '', ARRIVING: '' },
        [APP_THEME.TOEI]: { NEXT: '', ARRIVING: '' },
      },
    [
      connectedLines,
      currentLine,
      nextStation?.nameKatakana,
      selectedBound?.name,
      trainType?.name,
      transferLines,
    ]
  )

  const englishTemplate: Record<
    AppTheme,
    Record<CompatibleState, string>
  > | null = useMemo(
    () =>
      currentLine && {
        [APP_THEME.TOKYO_METRO]: {
          NEXT: '',
          ARRIVING: '',
        },
        [APP_THEME.TY]: {
          NEXT: `Thank you for using the ${
            currentLine.nameRoman
          }. This train will merge and continue traveling at the ${
            trainType?.nameRoman ?? 'Local'
          } Train on the ${connectedLines[0]?.nameRoman ?? ''} to ${
            selectedBound?.nameRoman
          }. The next station is ${
            nextStation?.nameRoman
          }. Passengers changing to the ${transferLines
            .map((l) => l.nameRoman)
            .join(', ')}, please transfer at this station.`,
          ARRIVING: '',
        },
        [APP_THEME.YAMANOTE]: { NEXT: '', ARRIVING: '' },
        [APP_THEME.JR_WEST]: { NEXT: '', ARRIVING: '' },
        [APP_THEME.SAIKYO]: { NEXT: '', ARRIVING: '' },
        [APP_THEME.JR_WEST]: { NEXT: '', ARRIVING: '' },
        [APP_THEME.TOEI]: { NEXT: '', ARRIVING: '' },
      },
    [
      connectedLines,
      currentLine,
      nextStation?.nameRoman,
      selectedBound?.nameRoman,
      trainType?.nameRoman,
      transferLines,
    ]
  )

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

  return [jaText, enText]
}

export default useSpeechText
