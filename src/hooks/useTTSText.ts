import { useAtomValue } from 'jotai';
import { useCallback, useMemo } from 'react';
import type { Station } from '~/@types/graphql';
import { parenthesisRegexp } from '../constants';
import { APP_THEME, type AppTheme } from '../models/Theme';
import stationState from '../store/atoms/station';
import { themeAtom } from '../store/atoms/theme';
import getIsPass from '../utils/isPass';
import katakanaToHiragana from '../utils/kanaToHiragana';
import { wrapPhoneme as ph } from '../utils/phoneme';
import { useAfterNextStation } from './useAfterNextStation';
import { useBounds } from './useBounds';
import { useConnectedLines } from './useConnectedLines';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentStation } from './useCurrentStation';
import { useCurrentTrainType } from './useCurrentTrainType';
import { useIsTerminus } from './useIsTerminus';
import { useLoopLine } from './useLoopLine';
import { useLoopLineBound } from './useLoopLineBound';
import { useNextStation } from './useNextStation';
import { useSlicedStations } from './useSlicedStations';
import { useStationNumberIndexFunc } from './useStationNumberIndexFunc';
import { useStoppingState } from './useStoppingState';
import { useTransferLines } from './useTransferLines';

export interface TTSTextResult {
  text: [string, string] | [];
  nextText: [string, string] | [];
}

const resolveTemplateTheme = (theme: AppTheme): AppTheme => {
  if (theme === APP_THEME.LED) return APP_THEME.TOKYO_METRO;
  if (theme === APP_THEME.JO || theme === APP_THEME.JL)
    return APP_THEME.YAMANOTE;
  return theme;
};

const EMPTY_TTS_TEXT = {
  [APP_THEME.TOKYO_METRO]: { NEXT: '', ARRIVING: '' },
  [APP_THEME.TY]: { NEXT: '', ARRIVING: '' },
  [APP_THEME.YAMANOTE]: { NEXT: '', ARRIVING: '' },
  [APP_THEME.JR_WEST]: { NEXT: '', ARRIVING: '' },
  [APP_THEME.SAIKYO]: { NEXT: '', ARRIVING: '' },
  [APP_THEME.TOEI]: { NEXT: '', ARRIVING: '' },
  [APP_THEME.LED]: { NEXT: '', ARRIVING: '' },
  [APP_THEME.JO]: { NEXT: '', ARRIVING: '' },
  [APP_THEME.JL]: { NEXT: '', ARRIVING: '' },
  [APP_THEME.JR_KYUSHU]: { NEXT: '', ARRIVING: '' },
};

export const useTTSText = (
  firstSpeech = true,
  enabled = false
): TTSTextResult => {
  const theme = useAtomValue(themeAtom);

  const {
    selectedBound: selectedBoundOrigin,
    selectedDirection,
    stations,
  } = useAtomValue(stationState);
  const station = useCurrentStation();
  const currentLineOrigin = useCurrentLine();

  const connectedLinesOrigin = useConnectedLines();
  const transferLinesOrigin = useTransferLines();

  const connectedLines = connectedLinesOrigin;
  const transferLines = transferLinesOrigin;
  const currentTrainTypeOrigin = useCurrentTrainType();
  const loopLineBoundJa = useLoopLineBound(false, 'JA');
  const loopLineBoundEn = useLoopLineBound(false, 'EN');
  const { directionalStops } = useBounds(stations);
  const nextStationOrigin = useNextStation();
  const isNextStopTerminus = useIsTerminus(nextStationOrigin);
  const { isLoopLine, isPartiallyLoopLine, isYamanoteLine } = useLoopLine();
  const slicedStationsOrigin = useSlicedStations();
  const stoppingState = useStoppingState();
  const getStationNumberIndex = useStationNumberIndexFunc();

  const nextStationNumber = useMemo(() => {
    if (!nextStationOrigin) {
      return;
    }

    if (!nextStationOrigin.stationNumbers) {
      return;
    }

    const stationNumberIndex = getStationNumberIndex(nextStationOrigin);

    // Validate stationNumberIndex is a valid integer within array bounds
    if (
      !Number.isInteger(stationNumberIndex) ||
      stationNumberIndex < 0 ||
      stationNumberIndex >= nextStationOrigin.stationNumbers.length
    ) {
      return;
    }

    return nextStationOrigin.stationNumbers[stationNumberIndex];
  }, [getStationNumberIndex, nextStationOrigin]);

  const replaceJapaneseText = useCallback(
    (
      name: string | undefined | null,
      nameKatakana: string | undefined | null
    ) =>
      !name && !nameKatakana
        ? `<sub alias="かくえきていしゃ">各駅停車</sub>`
        : !nameKatakana
          ? (name ?? '')
          : `<sub alias="${katakanaToHiragana(nameKatakana)}">${name}</sub>`,
    []
  );

  const currentLine = currentLineOrigin ?? null;

  const selectedBound = useMemo(
    () => selectedBoundOrigin ?? null,
    [selectedBoundOrigin]
  );

  const currentTrainType = useMemo(
    () =>
      currentTrainTypeOrigin && {
        ...currentTrainTypeOrigin,
        nameRoman: currentTrainTypeOrigin.nameRoman?.replace(
          parenthesisRegexp,
          ''
        ),
        nameTtsSegments: currentTrainTypeOrigin.nameTtsSegments?.map((seg) => ({
          ...seg,
          surface: seg.surface?.replace(parenthesisRegexp, '') ?? null,
          fallbackText:
            seg.fallbackText?.replace(parenthesisRegexp, '') ?? null,
        })),
      },
    [currentTrainTypeOrigin]
  );

  const yamanoteTrainTypeJa = useMemo(() => {
    if (!isYamanoteLine || !selectedDirection) {
      return null;
    }
    return selectedDirection === 'INBOUND'
      ? 'やまのて線内回り'
      : 'やまのて線外回り';
  }, [isYamanoteLine, selectedDirection]);

  const yamanoteTrainTypeEn = isYamanoteLine ? 'Yamanote Line' : null;

  const boundForJa = useMemo(
    () =>
      isLoopLine
        ? // NOTE: メジャーな駅だからreplaceJapaneseTextは要らない...はず
          loopLineBoundJa?.boundFor?.replace(/・/g, '<break time="250ms"/>')
        : replaceJapaneseText(
            `${directionalStops?.map((s) => s?.name).join('・')}${
              isPartiallyLoopLine ? '方面' : ''
            }`,
            `${directionalStops?.map((s) => s?.nameKatakana).join('・')}${
              isPartiallyLoopLine ? 'ホウメン' : ''
            }`
          ),
    [
      directionalStops,
      isLoopLine,
      isPartiallyLoopLine,
      loopLineBoundJa?.boundFor,
      replaceJapaneseText,
    ]
  );

  const boundForEn = useMemo(
    () =>
      isLoopLine
        ? (loopLineBoundEn?.boundFor?.replaceAll('&', ' and ') ?? '')
        : (directionalStops
            ?.map((s) => ph(s?.nameTtsSegments, s?.nameRoman))
            .join(' and ') ?? ''),

    [directionalStops, isLoopLine, loopLineBoundEn?.boundFor]
  );

  const nextStationNumberText = useMemo(() => {
    if (!nextStationNumber) {
      return '';
    }

    if (!nextStationNumber?.stationNumber) {
      return '';
    }

    const split = nextStationNumber.stationNumber.split('-');

    if (!split.length) {
      return '';
    }
    if (split.length === 1) {
      return `${theme === APP_THEME.JR_WEST ? '' : 'Station Number '}<say-as interpret-as="cardinal">${Number(
        nextStationNumber.stationNumber
      )}</say-as>`;
    }

    const symbol = split[0]?.split('').join(' ');
    const num = split[2]
      ? `<say-as interpret-as="cardinal">${Number(split[1])}</say-as>-<say-as interpret-as="cardinal">${Number(split[2])}</say-as>`
      : `<say-as interpret-as="cardinal">${Number(split[1])}</say-as>`;

    return `${
      nextStationNumber.lineSymbol?.length || theme === APP_THEME.JR_WEST
        ? ''
        : 'Station Number '
    }${symbol} ${num}.`;
  }, [nextStationNumber, theme]);

  const nextStation = nextStationOrigin ?? null;

  // 直通時、同じGroupIDの駅が違う駅として扱われるのを防ぐ(ex. 渋谷の次は渋谷に止まります)
  const slicedStations = Array.from(
    new Set(slicedStationsOrigin.map((s) => s.groupId))
  )
    .map((gid) => slicedStationsOrigin.find((s) => s.groupId === gid))
    .filter((s) => !!s) as Station[];

  const afterNextStationOrigin = useAfterNextStation();
  const afterNextStation = afterNextStationOrigin;

  const nextStationIndex = useMemo(
    () => slicedStations.findIndex((s) => s.groupId === nextStation?.groupId),
    [nextStation?.groupId, slicedStations]
  );
  const afterNextStationIndex = useMemo(
    () =>
      slicedStations.findIndex((s) => s.groupId === afterNextStation?.groupId),
    [afterNextStation?.groupId, slicedStations]
  );

  const betweenNextStation = useMemo(
    () =>
      nextStationIndex === -1 ||
      afterNextStationIndex === -1 ||
      afterNextStationIndex <= nextStationIndex
        ? []
        : slicedStations.slice(nextStationIndex + 1, afterNextStationIndex),
    [afterNextStationIndex, nextStationIndex, slicedStations]
  );

  const isAfterNextStopTerminus = useIsTerminus(afterNextStation);

  const allStops = useMemo(
    () =>
      slicedStations.filter((s) => {
        if (s.groupId === station?.groupId) {
          return false;
        }
        return !getIsPass(s);
      }),
    [slicedStations, station]
  );

  // JR西日本テーマ: 停車駅リストのバッチサイクル追跡
  // 進行方向上で現在の駅が何番目の停車駅かを求め、5駅ごとの境界で案内を出す
  const currentStopIndex = useMemo(() => {
    if (!station) return -1;
    const isInbound = selectedDirection === 'INBOUND';
    const ordered = isInbound ? stations : [...stations].reverse();
    const stops = ordered.filter((s) => !getIsPass(s));
    return stops.findIndex((s) => s.groupId === station.groupId);
  }, [stations, station, selectedDirection]);

  const shouldAnnounceJrWestStopList = useMemo(
    () =>
      allStops.length > 1 &&
      (firstSpeech || (currentStopIndex > 0 && currentStopIndex % 5 === 0)),
    [allStops.length, firstSpeech, currentStopIndex]
  );

  const viaStation = useMemo(() => {
    const sortedStops = allStops
      .slice()
      .sort((a, b) =>
        (a.lines?.length ?? 0) < (b.lines?.length ?? 0) ? 1 : -1
      );

    if (allStops[allStops.length - 1]?.id === sortedStops[0]?.id) {
      return; // 終着駅と同じ駅の場合undefinedを返す
    }
    return sortedStops[0];
  }, [allStops]);

  const japaneseTemplate: Record<AppTheme, { [key: string]: string }> | null =
    useMemo(() => {
      if (!currentLine || !selectedBound) {
        return EMPTY_TTS_TEXT;
      }

      const map = {
        [APP_THEME.TOKYO_METRO]: {
          NEXT: firstSpeech
            ? `${replaceJapaneseText(
                currentLine.nameShort,
                currentLine.nameKatakana
              )}をご利用くださいまして、ありがとうございます。次は、${replaceJapaneseText(
                nextStation?.name,
                nextStation?.nameKatakana
              )}です。この電車は、${
                connectedLines.length
                  ? `${connectedLines
                      .map((l) =>
                        replaceJapaneseText(l.nameShort, l.nameKatakana)
                      )
                      .join('、')}直通、`
                  : ''
              }${
                yamanoteTrainTypeJa ??
                (currentTrainType
                  ? replaceJapaneseText(
                      currentTrainType.name,
                      currentTrainType.nameKatakana
                    )
                  : '各駅停車')
              }、${boundForJa}ゆきです。${
                currentTrainType && afterNextStation
                  ? `${replaceJapaneseText(
                      nextStation?.name,
                      nextStation?.nameKatakana
                    )}の次は、${
                      isAfterNextStopTerminus ? '終点、' : ''
                    }${replaceJapaneseText(
                      afterNextStation?.name,
                      afterNextStation?.nameKatakana
                    )}に停まります。`
                  : ''
              }${
                betweenNextStation.length
                  ? `${betweenNextStation
                      .map((s) => replaceJapaneseText(s.name, s.nameKatakana))
                      .join('、')}へおいでのお客様はお乗り換えです。`
                  : ''
              }`
            : `次は、${replaceJapaneseText(
                nextStation?.name,
                nextStation?.nameKatakana
              )}${isNextStopTerminus ? '、終点' : ''}です。${
                transferLines.length
                  ? `${transferLines
                      .map((l) =>
                        replaceJapaneseText(l.nameShort, l.nameKatakana)
                      )
                      .join('、')}はお乗り換えです。`
                  : ''
              }${
                currentTrainType && afterNextStation
                  ? `${replaceJapaneseText(
                      nextStation?.name,
                      nextStation?.nameKatakana
                    )}の次は、${
                      isAfterNextStopTerminus ? '終点、' : ''
                    }${replaceJapaneseText(
                      afterNextStation?.name,
                      afterNextStation?.nameKatakana
                    )}に停まります。`
                  : ''
              }${
                betweenNextStation.length
                  ? `${betweenNextStation
                      .map((s) => replaceJapaneseText(s.name, s.nameKatakana))
                      .join('、')}へおいでのお客様はお乗り換えです。`
                  : ''
              }`,
          ARRIVING: `まもなく、${
            replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ??
            ''
          }${isNextStopTerminus ? '終点' : ''}です。${
            transferLines.length
              ? `${transferLines
                  .map((l) => replaceJapaneseText(l.nameShort, l.nameKatakana))
                  .join('、')}はお乗り換えです。`
              : ''
          }${
            isNextStopTerminus
              ? `${replaceJapaneseText(
                  currentLine.company?.nameShort,
                  currentLine.company?.nameKatakana
                )}をご利用くださいまして、ありがとうございました。`
              : ''
          }`,
        },
        [APP_THEME.TY]: {
          NEXT: `${
            firstSpeech
              ? `${replaceJapaneseText(
                  currentLine.nameShort,
                  currentLine.nameKatakana
                )}をご利用くださいまして、ありがとうございます。この電車は${
                  connectedLines.length
                    ? `${connectedLines
                        .map((l) =>
                          replaceJapaneseText(l.nameShort, l.nameKatakana)
                        )
                        .join('、')}直通、`
                    : ''
                }${
                  yamanoteTrainTypeJa ??
                  (currentTrainType
                    ? replaceJapaneseText(
                        currentTrainType.name,
                        currentTrainType.nameKatakana
                      )
                    : '各駅停車')
                }、${boundForJa}ゆきです。`
              : ''
          }次は、${
            replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ??
            ''
          }${isNextStopTerminus ? '、終点' : ''}です。${
            transferLines.length
              ? `${transferLines
                  .map((l) => replaceJapaneseText(l.nameShort, l.nameKatakana))
                  .join('、')}をご利用のお客様はお乗り換えです。`
              : ''
          }`,
          ARRIVING: `まもなく、${
            replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ??
            ''
          }${isNextStopTerminus ? '、終点' : ''}です。${
            transferLines.length
              ? `${transferLines
                  .map((l) => replaceJapaneseText(l.nameShort, l.nameKatakana))
                  .join('、')}をご利用のお客様はお乗り換えです。`
              : ''
          }${
            afterNextStation
              ? `${replaceJapaneseText(
                  nextStation?.name,
                  nextStation?.nameKatakana
                )}を出ますと、${
                  isAfterNextStopTerminus ? '終点、' : ''
                }${replaceJapaneseText(
                  afterNextStation.name,
                  afterNextStation.nameKatakana
                )}に停まります。`
              : ''
          }${
            isNextStopTerminus
              ? ` ${replaceJapaneseText(
                  currentLine?.nameShort,
                  currentLine?.nameKatakana
                )}をご利用くださいまして、ありがとうございました。`
              : ''
          }`,
        },
        [APP_THEME.YAMANOTE]: {
          NEXT: `${
            firstSpeech
              ? `今日も、${currentLine.company?.nameShort}をご利用くださいまして、ありがとうございます。この電車は、${boundForJa}ゆきです。`
              : ''
          }次は、${
            replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ??
            ''
          }、${
            replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ??
            ''
          }${isNextStopTerminus ? '、終点です' : ''}。${
            transferLines.length
              ? `${transferLines
                  .map((l) => replaceJapaneseText(l.nameShort, l.nameKatakana))
                  .join('、')}はお乗り換えです。`
              : ''
          }`,
          ARRIVING: `まもなく、${isNextStopTerminus ? '終点、' : ''}${
            replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ??
            ''
          }、${
            replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ??
            ''
          }。${
            transferLines.length
              ? `${transferLines
                  .map((l) => replaceJapaneseText(l.nameShort, l.nameKatakana))
                  .join('、')}は、お乗り換えです。${
                  isNextStopTerminus
                    ? `${currentLine.company?.nameShort}をご利用くださいまして、ありがとうございました。`
                    : ''
                }`
              : ''
          }`,
        },
        [APP_THEME.JO]: {
          NEXT: '',
          ARRIVING: '',
        },
        [APP_THEME.JL]: { NEXT: '', ARRIVING: '' },
        [APP_THEME.SAIKYO]: {
          NEXT: `${
            firstSpeech
              ? `今日も、${currentLine.company?.nameShort}をご利用くださいまして、ありがとうございます。この電車は、${boundForJa}ゆきです。`
              : ''
          }次は、${isNextStopTerminus ? '終点、' : ''}${
            replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ??
            ''
          }、${
            replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ??
            ''
          }。${
            transferLines.length
              ? `${transferLines
                  .map((l) => replaceJapaneseText(l.nameShort, l.nameKatakana))
                  .join('、')}は、お乗り換えです。`
              : ''
          }`,
          ARRIVING: `まもなく、${isNextStopTerminus ? '終点、' : ''}${
            replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ??
            ''
          }、${
            replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ??
            ''
          }。${
            transferLines.length
              ? `${transferLines
                  .map((l) => replaceJapaneseText(l.nameShort, l.nameKatakana))
                  .join('、')}は、お乗り換えです。${
                  isNextStopTerminus
                    ? `${currentLine.company?.nameShort}をご利用くださいまして、ありがとうございました。`
                    : ''
                }`
              : ''
          }`,
        },
        [APP_THEME.JR_WEST]: {
          NEXT: `${
            firstSpeech
              ? `今日も、${
                  currentLine.company?.nameShort
                }をご利用くださいまして、ありがとうございます。この電車は、${
                  yamanoteTrainTypeJa ??
                  replaceJapaneseText(
                    currentTrainType?.name,
                    currentTrainType?.nameKatakana
                  )
                }、${
                  viaStation
                    ? `${replaceJapaneseText(
                        viaStation.name,
                        viaStation.nameKatakana
                      )}方面、`
                    : ''
                }${boundForJa}ゆきです。`
              : ''
          }${
            shouldAnnounceJrWestStopList
              ? `${allStops
                  .slice(0, 5)
                  .map((s) =>
                    s.id === selectedBound?.id && !isLoopLine
                      ? `終点、${replaceJapaneseText(s.name, s.nameKatakana)}`
                      : replaceJapaneseText(s.name, s.nameKatakana)
                  )
                  .join('、')}の順に停まります。${
                  allStops.slice(0, 5).filter(Boolean).reverse()[0]?.id ===
                  selectedBound?.id
                    ? ''
                    : `${replaceJapaneseText(
                        allStops.slice(0, 5).filter(Boolean).reverse()[0]?.name,
                        allStops.slice(0, 5).filter(Boolean).reverse()[0]
                          ?.nameKatakana
                      )}から先は、後ほどご案内いたします。`
                }`
              : ''
          }次は、${nextStation?.groupId === selectedBound?.groupId && !isLoopLine ? '終点、' : ''}${
            replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ??
            ''
          }、${
            replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ??
            ''
          }です。${
            transferLines.length
              ? `${transferLines
                  .map((l) => replaceJapaneseText(l.nameShort, l.nameKatakana))
                  .join('、')}はお乗り換えです。`
              : ''
          }`,
          ARRIVING: isNextStopTerminus
            ? `ご乗車ありがとうございました。まもなく${
                replaceJapaneseText(
                  nextStation?.name,
                  nextStation?.nameKatakana
                ) ?? ''
              }、${
                replaceJapaneseText(
                  nextStation?.name,
                  nextStation?.nameKatakana
                ) ?? ''
              }です。${
                transferLines.length
                  ? `${transferLines
                      .map((l) =>
                        replaceJapaneseText(l.nameShort, l.nameKatakana)
                      )
                      .join('、')}はお乗り換えです。`
                  : ''
              }今日も${currentLine.company?.nameShort}をご利用くださいまして、ありがとうございました。${replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana)}、${replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana)}です。`
            : `まもなく、${
                replaceJapaneseText(
                  nextStation?.name,
                  nextStation?.nameKatakana
                ) ?? ''
              }、${
                replaceJapaneseText(
                  nextStation?.name,
                  nextStation?.nameKatakana
                ) ?? ''
              }です。${
                transferLines.length
                  ? `${transferLines
                      .map((l) =>
                        replaceJapaneseText(l.nameShort, l.nameKatakana)
                      )
                      .join('、')}はお乗り換えです。`
                  : ''
              }${
                afterNextStation
                  ? `${replaceJapaneseText(
                      nextStation?.name,
                      nextStation?.nameKatakana
                    )}を出ますと、次は、${replaceJapaneseText(
                      afterNextStation.name,
                      afterNextStation.nameKatakana
                    )}に停まります。`
                  : ''
              }`,
        },
        [APP_THEME.TOEI]: {
          NEXT: `${
            firstSpeech
              ? `${replaceJapaneseText(
                  currentLine.nameShort,
                  currentLine.nameKatakana
                )}をご利用くださいまして、ありがとうございます。`
              : ''
          }次は、${
            replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ??
            ''
          }、${
            replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ??
            ''
          }。 ${
            transferLines.length
              ? `${transferLines
                  .map((l) => replaceJapaneseText(l.nameShort, l.nameKatakana))
                  .join('、')}はお乗り換えです。`
              : ''
          }この電車は、${
            connectedLines.length
              ? `${connectedLines
                  .map((l) => replaceJapaneseText(l.nameShort, l.nameKatakana))
                  .join('、')}直通、`
              : ''
          }${
            yamanoteTrainTypeJa ??
            (currentTrainType
              ? replaceJapaneseText(
                  currentTrainType.name,
                  currentTrainType.nameKatakana
                )
              : '各駅停車')
          }、${boundForJa}ゆきです。${
            currentTrainType && afterNextStation
              ? `${replaceJapaneseText(
                  nextStation?.name,
                  nextStation?.nameKatakana
                )}の次は、${
                  isAfterNextStopTerminus ? '終点、' : ''
                }${replaceJapaneseText(
                  afterNextStation?.name,
                  afterNextStation?.nameKatakana
                )}に停まります。`
              : ''
          }${
            betweenNextStation.length
              ? `通過する、${betweenNextStation
                  .map((s) => replaceJapaneseText(s.name, s.nameKatakana))
                  .join('、')}へおいでの方はお乗り換えです。`
              : ''
          }`,
          ARRIVING: `まもなく、${
            replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ??
            ''
          }、${
            replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ??
            ''
          }。${
            transferLines.length
              ? `${transferLines
                  .map((l) => replaceJapaneseText(l.nameShort, l.nameKatakana))
                  .join('、')}はお乗り換えです。`
              : ''
          }${
            currentTrainType && afterNextStation
              ? `${replaceJapaneseText(
                  nextStation?.name,
                  nextStation?.nameKatakana
                )}の次は、${
                  isAfterNextStopTerminus ? '終点、' : ''
                }${replaceJapaneseText(
                  afterNextStation?.name,
                  afterNextStation?.nameKatakana
                )}に停まります。`
              : ''
          }${
            betweenNextStation.length
              ? `通過する、${betweenNextStation
                  .map((s) => replaceJapaneseText(s.name, s.nameKatakana))
                  .join('、')}へおいでの方はお乗り換えです。`
              : ''
          }${
            isNextStopTerminus
              ? ` ${replaceJapaneseText(
                  currentLine?.nameShort,
                  currentLine?.nameKatakana
                )}をご利用くださいまして、ありがとうございました。`
              : ''
          }`,
        },
        [APP_THEME.LED]: {
          NEXT: '',
          ARRIVING: '',
        },
        [APP_THEME.JR_KYUSHU]: {
          NEXT: `${
            firstSpeech
              ? `この列車は${
                  yamanoteTrainTypeJa ??
                  (currentTrainType
                    ? replaceJapaneseText(
                        currentTrainType.name,
                        currentTrainType.nameKatakana
                      )
                    : '普通')
                }、${boundForJa}行きです。`
              : ''
          }次は${nextStation?.groupId === selectedBound?.groupId && !isLoopLine ? '終点、' : ''}${replaceJapaneseText(
            nextStation?.name,
            nextStation?.nameKatakana
          )}、${replaceJapaneseText(
            nextStation?.name,
            nextStation?.nameKatakana
          )}。${
            transferLines.length
              ? `${replaceJapaneseText(
                  nextStation?.name,
                  nextStation?.nameKatakana
                )}では、${transferLines
                  .map((l) => replaceJapaneseText(l.nameShort, l.nameKatakana))
                  .join('、')}にお乗り換えいただけます。`
              : ''
          }`,
          ARRIVING: `まもなく、${nextStation?.groupId === selectedBound?.groupId && !isLoopLine ? '終点、' : ''}${replaceJapaneseText(
            nextStation?.name,
            nextStation?.nameKatakana
          )}、${replaceJapaneseText(
            nextStation?.name,
            nextStation?.nameKatakana
          )}。${
            transferLines.length
              ? `${transferLines
                  .map((l) => replaceJapaneseText(l.nameShort, l.nameKatakana))
                  .join(
                    '、'
                  )}にお乗り換えいただけます。${nextStation?.groupId === selectedBound?.groupId && !isLoopLine ? `${currentLine.nameShort}をご利用くださいまして、ありがとうございました。` : ''}`
              : ''
          }`,
        },
      };
      return map;
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
      nextStation?.name,
      replaceJapaneseText,
      selectedBound,
      shouldAnnounceJrWestStopList,
      transferLines,
      viaStation,
      yamanoteTrainTypeJa,
      nextStation?.groupId,
      selectedBound?.groupId,
      nextStation?.nameKatakana,
    ]);

  const englishTemplate: Record<AppTheme, { [key: string]: string }> | null =
    useMemo(() => {
      if (!currentLine || !selectedBound) {
        return EMPTY_TTS_TEXT;
      }

      const map = {
        [APP_THEME.TOKYO_METRO]: {
          NEXT: `The next stop is ${ph(nextStation?.nameTtsSegments, nextStation?.nameRoman)}${
            nextStationNumberText.length ? ` ${nextStationNumberText}` : '.'
          }${
            transferLines.length
              ? ` Please change here for ${transferLines
                  .map((l, i, a) =>
                    a.length > 1 && a.length - 1 === i
                      ? `and the ${ph(l.nameTtsSegments, l.nameRoman)}.`
                      : `the ${ph(l.nameTtsSegments, l.nameRoman)}${a.length === 1 ? '.' : ',<break time="200ms"/>'}`
                  )
                  .join(' ')}`
              : ''
          }${
            firstSpeech
              ? ` This train is the ${
                  yamanoteTrainTypeEn
                    ? `${yamanoteTrainTypeEn} train`
                    : `${currentTrainType ? ph(currentTrainType.nameTtsSegments, currentTrainType.nameRoman) : 'Local'} Service on the ${ph(currentLine.nameTtsSegments, currentLine.nameRoman)}`
                } bound for ${boundForEn}. ${
                  currentTrainType && afterNextStation
                    ? `The next stop after ${ph(nextStation?.nameTtsSegments, nextStation?.nameRoman)}${`, is ${ph(afterNextStation?.nameTtsSegments, afterNextStation?.nameRoman)}${isAfterNextStopTerminus ? ' terminal' : ''}`}.`
                    : ''
                }${
                  betweenNextStation.length
                    ? ' For stations in between, Please change trains at the next stop.'
                    : ''
                }`
              : ''
          }`,
          ARRIVING: `Arriving at ${ph(nextStation?.nameTtsSegments, nextStation?.nameRoman)} ${nextStationNumberText}${
            isNextStopTerminus ? ', the last stop.' : ''
          } ${
            transferLines.length
              ? `Please change here for ${transferLines
                  .map((l, i, a) =>
                    a.length > 1 && a.length - 1 === i
                      ? `and the ${ph(l.nameTtsSegments, l.nameRoman)}`
                      : `the ${ph(l.nameTtsSegments, l.nameRoman)}${a.length === 1 ? '' : ',<break time="200ms"/>'}`
                  )
                  .join(' ')}`
              : ''
          }. ${
            isNextStopTerminus
              ? `Thank you for using the ${ph(currentLine?.nameTtsSegments, currentLine?.nameRoman)}.`
              : ''
          }`,
        },
        [APP_THEME.TY]: {
          NEXT: `${
            firstSpeech
              ? `Thank you for using the ${ph(currentLine.nameTtsSegments, currentLine.nameRoman)}. This is the ${yamanoteTrainTypeEn ?? (ph(currentTrainType?.nameTtsSegments, currentTrainType?.nameRoman) || 'Local')} train ${
                  connectedLines[0]?.nameTtsSegments?.length
                    ? `on the ${ph(connectedLines[0]?.nameTtsSegments, connectedLines[0]?.nameRoman)}`
                    : ''
                } to ${boundForEn}. `
              : ''
          }The next station is ${ph(nextStation?.nameTtsSegments, nextStation?.nameRoman)} ${nextStationNumberText}${
            isNextStopTerminus ? ', the last stop' : ''
          } ${
            transferLines.length
              ? `Passengers changing to ${transferLines
                  .map((l, i, a) =>
                    a.length > 1 && a.length - 1 === i
                      ? `and the ${ph(l.nameTtsSegments, l.nameRoman)}`
                      : `the ${ph(l.nameTtsSegments, l.nameRoman)}`
                  )
                  .join(
                    ',<break time="200ms"/> '
                  )}, Please transfer at this station.`
              : ''
          }`,
          ARRIVING: `We will soon make a brief stop at ${ph(nextStation?.nameTtsSegments, nextStation?.nameRoman)} ${nextStationNumberText}${
            isNextStopTerminus ? ', the last stop' : ''
          }${
            transferLines.length
              ? ` Passengers changing to ${transferLines
                  .map((l, i, a) =>
                    a.length > 1 && a.length - 1 === i
                      ? `and the ${ph(l.nameTtsSegments, l.nameRoman)}`
                      : `the ${ph(l.nameTtsSegments, l.nameRoman)}`
                  )
                  .join(
                    ',<break time="200ms"/> '
                  )}, Please transfer at this station.`
              : ''
          }${
            currentTrainType && afterNextStation
              ? ` The stop after ${ph(nextStation?.nameTtsSegments, nextStation?.nameRoman)}, will be ${ph(afterNextStation.nameTtsSegments, afterNextStation.nameRoman)}${isAfterNextStopTerminus ? ' the last stop' : ''}.`
              : ''
          }${
            isNextStopTerminus
              ? ` Thank you for using the ${ph(currentLine?.nameTtsSegments, currentLine?.nameRoman)}.`
              : ''
          }`,
        },
        [APP_THEME.YAMANOTE]: {
          NEXT: `${
            firstSpeech
              ? `This is the ${ph(currentLine.nameTtsSegments, currentLine.nameRoman)} train bound for ${boundForEn}. `
              : ''
          }The next station is ${ph(nextStation?.nameTtsSegments, nextStation?.nameRoman)} ${nextStationNumberText} ${
            transferLines.length
              ? `Please change here for ${transferLines
                  .map((l, i, a) =>
                    a.length > 1 && a.length - 1 === i
                      ? `and the ${ph(l.nameTtsSegments, l.nameRoman)}.`
                      : `the ${ph(l.nameTtsSegments, l.nameRoman)}${a.length === 1 ? '' : ',<break time="200ms"/>'}`
                  )
                  .join(' ')}`
              : ''
          }`,
          ARRIVING: `The next station is ${ph(nextStation?.nameTtsSegments, nextStation?.nameRoman)} ${nextStationNumberText}${
            isNextStopTerminus ? ', terminal.' : ''
          } ${
            transferLines.length
              ? `Please change here for ${transferLines
                  .map((l, i, a) =>
                    a.length > 1 && a.length - 1 === i
                      ? `and the ${ph(l.nameTtsSegments, l.nameRoman)}`
                      : `the ${ph(l.nameTtsSegments, l.nameRoman)}${a.length === 1 ? '' : ',<break time="200ms"/>'}`
                  )
                  .join(' ')}`
              : ''
          }. ${
            isNextStopTerminus
              ? 'Thank you for traveling with us, and look forward to serving you again.'
              : ''
          }`,
        },
        [APP_THEME.JO]: {
          NEXT: '',
          ARRIVING: '',
        },
        [APP_THEME.JL]: { NEXT: '', ARRIVING: '' },
        [APP_THEME.SAIKYO]: {
          NEXT: `${
            firstSpeech
              ? `This is the ${ph(currentLine.nameTtsSegments, currentLine.nameRoman)} train bound for ${boundForEn}. `
              : ''
          }The next station is ${ph(nextStation?.nameTtsSegments, nextStation?.nameRoman)} ${nextStationNumberText}${isNextStopTerminus ? ', terminal' : ''} ${
            transferLines.length
              ? `Please change here for ${transferLines
                  .map((l, i, a) =>
                    a.length > 1 && a.length - 1 === i
                      ? `and the ${ph(l.nameTtsSegments, l.nameRoman)}.`
                      : `the ${ph(l.nameTtsSegments, l.nameRoman)}${a.length === 1 ? '' : ',<break time="200ms"/>'}`
                  )
                  .join(' ')}`
              : ''
          }`,
          ARRIVING: `The next station is ${ph(nextStation?.nameTtsSegments, nextStation?.nameRoman)} ${nextStationNumberText}${
            isNextStopTerminus ? ', terminal.' : ''
          } ${
            transferLines.length
              ? `Please change here for ${transferLines
                  .map((l, i, a) =>
                    a.length > 1 && a.length - 1 === i
                      ? `and the ${ph(l.nameTtsSegments, l.nameRoman)}.`
                      : `the ${ph(l.nameTtsSegments, l.nameRoman)}${a.length === 1 ? '' : ',<break time="200ms"/>'}`
                  )
                  .join(' ')}`
              : ''
          } ${
            isNextStopTerminus
              ? 'Thank you for traveling with us, and look forward to serving you again.'
              : ''
          }`,
        },
        [APP_THEME.JR_WEST]: {
          NEXT: `${
            firstSpeech
              ? `Thank you for using ${currentLine?.company?.nameEnglishShort}. This is the ${yamanoteTrainTypeEn ?? (ph(currentTrainType?.nameTtsSegments, currentTrainType?.nameRoman) || 'Local')} Service bound for ${boundForEn} ${
                  viaStation
                    ? `via ${ph(viaStation.nameTtsSegments, viaStation.nameRoman)}`
                    : ''
                }. `
              : ''
          }${
            shouldAnnounceJrWestStopList
              ? `We will be stopping at ${allStops
                  .slice(0, 5)
                  .map((s) =>
                    s.id === selectedBound?.id && !isLoopLine
                      ? `${ph(s.nameTtsSegments, s.nameRoman)} terminal`
                      : `${ph(s.nameTtsSegments, s.nameRoman)}`
                  )
                  .join(', ')}. ${
                  allStops.slice(0, 5).filter(Boolean).reverse()[0]?.id ===
                  selectedBound?.id
                    ? ''
                    : `Stops after ${ph(
                        allStops.slice(0, 5).filter(Boolean).reverse()[0]
                          ?.nameTtsSegments,
                        allStops.slice(0, 5).filter(Boolean).reverse()[0]
                          ?.nameRoman
                      )} will be announced later. `
                }`
              : ''
          }The next stop is ${ph(nextStation?.nameTtsSegments, nextStation?.nameRoman)}${nextStation?.groupId === selectedBound?.groupId && !isLoopLine ? ' terminal' : ''}${
            nextStationNumber?.lineSymbol?.length
              ? ` station number ${nextStationNumberText.replace(/\.$/, '')}.`
              : '.'
          } ${
            transferLines.length
              ? `Transfer here for ${transferLines
                  .map((l, i, a) =>
                    a.length > 1 && a.length - 1 === i
                      ? `and the ${ph(l.nameTtsSegments, l.nameRoman)}.`
                      : `the ${ph(l.nameTtsSegments, l.nameRoman)}${a.length === 1 ? '.' : ',<break time="200ms"/>'}`
                  )
                  .join(' ')}`
              : ''
          }`,
          ARRIVING: `We will soon be making a brief stop at ${ph(nextStation?.nameTtsSegments, nextStation?.nameRoman)}${
            nextStationNumber?.lineSymbol?.length
              ? ` station number ${nextStationNumberText.replace(/\.$/, '')}.`
              : '.'
          } ${
            transferLines.length
              ? `Transfer here for ${transferLines
                  .map((l, i, a) =>
                    a.length > 1 && a.length - 1 === i
                      ? `and the ${ph(l.nameTtsSegments, l.nameRoman)}.`
                      : `the ${ph(l.nameTtsSegments, l.nameRoman)}${a.length === 1 ? '.' : ',<break time="200ms"/>'}`
                  )
                  .join(' ')}`
              : ''
          } ${
            afterNextStation
              ? `After leaving ${ph(nextStation?.nameTtsSegments, nextStation?.nameRoman)}, We will be stopping at ${ph(afterNextStation.nameTtsSegments, afterNextStation.nameRoman)}.`
              : ''
          }`,
        },
        [APP_THEME.TOEI]: {
          NEXT: `${
            firstSpeech
              ? `Thank you for using the ${ph(currentLine.nameTtsSegments, currentLine.nameRoman)}. `
              : ''
          }This is the ${yamanoteTrainTypeEn ?? (ph(currentTrainType?.nameTtsSegments, currentTrainType?.nameRoman) || 'Local')} train bound for ${boundForEn}. The next station is ${ph(nextStation?.nameTtsSegments, nextStation?.nameRoman)} ${nextStationNumberText} ${
            transferLines.length
              ? `Please change here for ${transferLines
                  .map((l, i, a) =>
                    a.length > 1 && a.length - 1 === i
                      ? `and the ${ph(l.nameTtsSegments, l.nameRoman)}.`
                      : `the ${ph(l.nameTtsSegments, l.nameRoman)}${a.length === 1 ? '.' : ',<break time="200ms"/>'}`
                  )
                  .join(' ')}`
              : ''
          }`,
          ARRIVING: `We will soon be arriving at ${ph(nextStation?.nameTtsSegments, nextStation?.nameRoman)} ${nextStationNumberText} ${
            transferLines.length
              ? `Please change here for ${transferLines
                  .map((l, i, a) =>
                    a.length > 1 && a.length - 1 === i
                      ? `and the ${ph(l.nameTtsSegments, l.nameRoman)}.`
                      : `the ${ph(l.nameTtsSegments, l.nameRoman)}${a.length === 1 ? '.' : ',<break time="200ms"/>'}`
                  )
                  .join(' ')}`
              : ''
          }${
            currentTrainType && afterNextStation
              ? ` The stop after ${ph(nextStation?.nameTtsSegments, nextStation?.nameRoman)}, will be ${ph(afterNextStation.nameTtsSegments, afterNextStation.nameRoman)}${isAfterNextStopTerminus ? ' the last stop' : ''}.`
              : ''
          }${
            isNextStopTerminus
              ? ` Thank you for using the ${ph(currentLine?.nameTtsSegments, currentLine?.nameRoman)}.`
              : ''
          }`,
        },
        [APP_THEME.LED]: {
          NEXT: '',
          ARRIVING: '',
        },
        [APP_THEME.JR_KYUSHU]: {
          NEXT: `${firstSpeech ? `This is a ${yamanoteTrainTypeEn ?? (ph(currentTrainType?.nameTtsSegments, currentTrainType?.nameRoman) || 'Local')} train bound for ${boundForEn}.` : ''} The next station is ${ph(nextStation?.nameTtsSegments, nextStation?.nameRoman)} ${nextStationNumberText}${nextStation?.groupId === selectedBound?.groupId && !isLoopLine ? ' terminal' : ''}. ${
            transferLines.length
              ? `You can transfer to ${transferLines
                  .map((l, i, a) =>
                    a.length > 1 && a.length - 1 === i
                      ? `and the ${ph(l.nameTtsSegments, l.nameRoman)}`
                      : `the ${ph(l.nameTtsSegments, l.nameRoman)}${a.length === 1 ? '' : ',<break time="200ms"/>'}`
                  )
                  .join(
                    ' '
                  )} at ${ph(nextStation?.nameTtsSegments, nextStation?.nameRoman)}.`
              : ''
          }`,
          ARRIVING: `We will soon be arriving at ${ph(nextStation?.nameTtsSegments, nextStation?.nameRoman)}${nextStation?.groupId === selectedBound?.groupId && !isLoopLine ? ' terminal' : ''} ${nextStationNumberText}. ${
            transferLines.length
              ? `You can transfer to ${transferLines
                  .map((l, i, a) =>
                    a.length > 1 && a.length - 1 === i
                      ? `and the ${ph(l.nameTtsSegments, l.nameRoman)}.`
                      : `the ${ph(l.nameTtsSegments, l.nameRoman)}${a.length === 1 ? '' : ',<break time="200ms"/>'}`
                  )
                  .join(
                    ' '
                  )} at ${ph(nextStation?.nameTtsSegments, nextStation?.nameRoman)}. ${nextStation?.groupId === selectedBound?.groupId && !isLoopLine ? `Thank you for using the ${ph(currentLine.nameTtsSegments, currentLine.nameRoman)}.` : ''}`
              : ''
          }`,
        },
      };
      return map;
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
      nextStation?.groupId,
      selectedBound?.groupId,
      nextStation?.nameTtsSegments,
      nextStationNumber?.lineSymbol?.length,
      nextStationNumberText,
      selectedBound,
      shouldAnnounceJrWestStopList,
      transferLines,
      viaStation,
      yamanoteTrainTypeEn,
      nextStation?.nameRoman,
    ]);

  const resolved = resolveTemplateTheme(theme);

  const jaText = useMemo(
    () => japaneseTemplate?.[resolved]?.[stoppingState] ?? '',
    [japaneseTemplate, resolved, stoppingState]
  );

  const enText = useMemo(
    () => englishTemplate?.[resolved]?.[stoppingState] ?? '',
    [englishTemplate, resolved, stoppingState]
  );

  const nextJaText = useMemo(
    () => japaneseTemplate?.[resolved]?.NEXT ?? '',
    [japaneseTemplate, resolved]
  );

  const nextEnText = useMemo(
    () => englishTemplate?.[resolved]?.NEXT ?? '',
    [englishTemplate, resolved]
  );

  if (!enabled) {
    return { text: [], nextText: [] };
  }

  return {
    text: [
      jaText.trim().replace(parenthesisRegexp, ''),
      enText.trim().replace(parenthesisRegexp, ''),
    ],
    nextText: [
      nextJaText.trim().replace(parenthesisRegexp, ''),
      nextEnText.trim().replace(parenthesisRegexp, ''),
    ],
  };
};
