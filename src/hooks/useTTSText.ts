import { useAtomValue } from 'jotai';
import { useCallback, useMemo } from 'react';
import { Station } from '~/gen/proto/stationapi_pb';
import { parenthesisRegexp } from '../constants';
import { APP_THEME, type AppTheme } from '../models/Theme';
import stationState from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import katakanaToHiragana from '../utils/kanaToHiragana';
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
import { useThemeStore } from './useThemeStore';
import { useTransferLines } from './useTransferLines';

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
): [string, string] | undefined[] => {
  const theme = useThemeStore();

  const { selectedBound: selectedBoundOrigin, stations } =
    useAtomValue(stationState);
  const station = useCurrentStation();
  const currentLineOrigin = useCurrentLine();

  const connectedLinesOrigin = useConnectedLines();
  const transferLinesOriginal = useTransferLines();
  const currentTrainTypeOrigin = useCurrentTrainType();
  const loopLineBoundJa = useLoopLineBound(false);
  const loopLineBoundEn = useLoopLineBound(false, 'EN');
  const { directionalStops } = useBounds(stations);
  const nextStationOrigin = useNextStation();
  const isNextStopTerminus = useIsTerminus(nextStationOrigin);
  const { isLoopLine, isPartiallyLoopLine } = useLoopLine();
  const slicedStationsOrigin = useSlicedStations();
  const stoppingState = useStoppingState();
  const getStationNumberIndex = useStationNumberIndexFunc();

  const nextStationNumber = useMemo(() => {
    if (!nextStationOrigin) {
      return;
    }

    const stationNumberIndex = getStationNumberIndex(nextStationOrigin);
    return nextStationOrigin?.stationNumbers[stationNumberIndex];
  }, [getStationNumberIndex, nextStationOrigin]);

  const replaceJapaneseText = useCallback(
    (name: string | undefined, nameKatakana: string | undefined) =>
      !name || !nameKatakana
        ? `<sub alias="かくえきていしゃ">各駅停車</sub>`
        : `<sub alias="${katakanaToHiragana(nameKatakana)}">${name}</sub>`,
    []
  );

  const transferLines = useMemo(
    () =>
      transferLinesOriginal.map((l) => ({
        ...l,
        nameRoman: l.nameRoman,
      })),
    [transferLinesOriginal]
  );

  const currentLine = useMemo(
    () =>
      currentLineOrigin && {
        ...currentLineOrigin,
        nameRoman: currentLineOrigin?.nameRoman,
      },
    [currentLineOrigin]
  );

  const selectedBound = useMemo(
    () =>
      selectedBoundOrigin && {
        ...selectedBoundOrigin,
        nameRoman: selectedBoundOrigin?.nameRoman,
      },
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
      },
    [currentTrainTypeOrigin]
  );

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
        ? `${loopLineBoundEn?.boundFor.replaceAll('&', ' and ')}`
        : `${directionalStops?.map((s) => s?.nameRoman).join(' and ')}`,

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
      return `${theme === APP_THEME.JR_WEST ? '' : 'Station Number '}${Number(
        nextStationNumber.stationNumber
      )}`;
    }

    const symbol = split[0]?.split('').join('-');
    const num = split[2]
      ? `${Number(split[1])}-${Number(split[2])}`
      : Number(split[1]).toString();

    return `${
      nextStationNumber.lineSymbol.length || theme === APP_THEME.JR_WEST
        ? ''
        : 'Station Number '
    }${symbol} ${num}.`;
  }, [nextStationNumber, theme]);

  const connectedLines = useMemo(
    () =>
      connectedLinesOrigin?.map((l) => ({
        ...l,
        nameRoman: l.nameRoman,
      })),
    [connectedLinesOrigin]
  );

  const nextStation = useMemo(
    () =>
      nextStationOrigin && {
        ...nextStationOrigin,
        nameRoman: nextStationOrigin.nameRoman,
      },
    [nextStationOrigin]
  );

  // 直通時、同じGroupIDの駅が違う駅として扱われるのを防ぐ(ex. 渋谷の次は渋谷に止まります)
  const slicedStations = Array.from(
    new Set(slicedStationsOrigin.map((s) => s.groupId))
  )
    .map((gid) => slicedStationsOrigin.find((s) => s.groupId === gid))
    .filter((s) => !!s) as Station[];

  const afterNextStationOrigin = useAfterNextStation();
  const afterNextStation = useMemo<Station | undefined>(() => {
    return (
      afterNextStationOrigin &&
      new Station({
        ...afterNextStationOrigin,
        nameRoman: afterNextStationOrigin?.nameRoman,
        lines: afterNextStationOrigin.lines.map((l) => ({
          ...l,
          nameRoman: l.nameRoman,
        })),
      })
    );
  }, [afterNextStationOrigin]);

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
    () => slicedStations.slice(nextStationIndex + 1, afterNextStationIndex),
    [afterNextStationIndex, nextStationIndex, slicedStations]
  );

  const isAfterNextStopTerminus = useIsTerminus(afterNextStation);

  const allStops = useMemo(
    () =>
      slicedStations.filter((s) => {
        if (s.id === station?.id) {
          return false;
        }
        return !getIsPass(s);
      }),
    [slicedStations, station]
  );

  const viaStation = useMemo(() => {
    const sortedStops = allStops
      .slice()
      .sort((a, b) => (a.lines.length < b.lines.length ? 1 : -1));

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
                currentTrainType
                  ? replaceJapaneseText(
                      currentTrainType.name,
                      currentTrainType.nameKatakana
                    )
                  : '各駅停車'
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
                  currentTrainType
                    ? replaceJapaneseText(
                        currentTrainType.name,
                        currentTrainType.nameKatakana
                      )
                    : '各駅停車'
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
                }をご利用くださいまして、ありがとうございます。この電車は、${replaceJapaneseText(
                  currentTrainType?.name,
                  currentTrainType?.nameKatakana
                )}、${
                  viaStation
                    ? `${replaceJapaneseText(
                        viaStation.name,
                        viaStation.nameKatakana
                      )}方面、`
                    : ''
                }${boundForJa}ゆきです。${allStops
                  .slice(0, 5)
                  .map((s) =>
                    s.id === selectedBound?.id && !isLoopLine
                      ? `終点、${replaceJapaneseText(s.name, s.nameKatakana)}`
                      : replaceJapaneseText(s.name, s.nameKatakana)
                  )
                  .join('、')}の順に停まります。${
                  allStops
                    .slice(0, 5)
                    .filter((s) => s)
                    .reverse()[0]?.id === selectedBound?.id
                    ? ''
                    : `${replaceJapaneseText(
                        allStops
                          .slice(0, 5)
                          .filter((s) => s)
                          .reverse()[0]?.name,
                        allStops
                          .slice(0, 5)
                          .filter((s) => s)
                          .reverse()[0]?.nameKatakana
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
            currentTrainType
              ? replaceJapaneseText(
                  currentTrainType.name,
                  currentTrainType.nameKatakana
                )
              : '各駅停車'
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
                  currentTrainType
                    ? replaceJapaneseText(
                        currentTrainType.name,
                        currentTrainType.nameKatakana
                      )
                    : '普通'
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
      nextStation?.nameKatakana,
      replaceJapaneseText,
      selectedBound,
      transferLines,
      viaStation,
      nextStation?.groupId,
      selectedBound?.groupId,
    ]);

  const englishTemplate: Record<AppTheme, { [key: string]: string }> | null =
    useMemo(() => {
      if (!currentLine || !selectedBound) {
        return EMPTY_TTS_TEXT;
      }

      const map = {
        [APP_THEME.TOKYO_METRO]: {
          NEXT: `The next stop is ${nextStation?.nameRoman}${
            nextStationNumberText.length ? ` ${nextStationNumberText}` : '.'
          }${
            transferLines.length
              ? ` Please change here for ${transferLines
                  .map((l, i, a) =>
                    a.length > 1 && a.length - 1 === i
                      ? `and the ${l.nameRoman}.`
                      : `the ${l.nameRoman}${a.length === 1 ? '.' : ','}`
                  )
                  .join(' ')}`
              : ''
          }${
            firstSpeech
              ? ` This train is the ${
                  currentTrainType ? currentTrainType.nameRoman : 'Local'
                } Service on the ${
                  currentLine.nameRoman
                } bound for ${boundForEn}. ${
                  currentTrainType && afterNextStation
                    ? `The next stop after ${nextStation?.nameRoman}${`, is ${
                        afterNextStation?.nameRoman
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
            nextStation?.nameRoman
          } ${nextStationNumberText}${
            isNextStopTerminus ? ', the last stop.' : ''
          } ${
            transferLines.length
              ? `Please change here for ${transferLines
                  .map((l, i, a) =>
                    a.length > 1 && a.length - 1 === i
                      ? `and the ${l.nameRoman}`
                      : `the ${l.nameRoman}${a.length === 1 ? '' : ','}`
                  )
                  .join(' ')}`
              : ''
          }. ${
            isNextStopTerminus
              ? `Thank you for using the ${currentLine?.nameRoman}.`
              : ''
          }`,
        },
        [APP_THEME.TY]: {
          NEXT: `${
            firstSpeech
              ? `Thank you for using the ${
                  currentLine.nameRoman
                }. This is the ${currentTrainType?.nameRoman ?? 'Local'} train ${
                  connectedLines[0]?.nameRoman
                    ? `on the ${connectedLines[0]?.nameRoman}`
                    : ''
                } to ${boundForEn}. `
              : ''
          }The next station is ${
            nextStation?.nameRoman
          } ${nextStationNumberText}${
            isNextStopTerminus ? ', the last stop' : ''
          } ${
            transferLines.length
              ? `Passengers changing to ${transferLines
                  .map((l, i, a) =>
                    a.length > 1 && a.length - 1 === i
                      ? `and the ${l.nameRoman}`
                      : `the ${l.nameRoman}`
                  )
                  .join(', ')}, Please transfer at this station.`
              : ''
          }`,
          ARRIVING: `We will soon make a brief stop at ${
            nextStation?.nameRoman
          } ${nextStationNumberText}${
            isNextStopTerminus ? ', the last stop' : ''
          }${
            transferLines.length
              ? ` Passengers changing to ${transferLines
                  .map((l, i, a) =>
                    a.length > 1 && a.length - 1 === i
                      ? `and the ${l.nameRoman}`
                      : `the ${l.nameRoman}`
                  )
                  .join(', ')}, Please transfer at this station.`
              : ''
          }${
            currentTrainType && afterNextStation
              ? ` The stop after ${nextStation?.nameRoman}, will be ${
                  afterNextStation.nameRoman
                }${isNextStopTerminus ? ' the last stop' : ''}.`
              : ''
          }${
            isNextStopTerminus
              ? ` Thank you for using the ${currentLine?.nameRoman}.`
              : ''
          }`,
        },
        [APP_THEME.YAMANOTE]: {
          NEXT: `${
            firstSpeech
              ? `This is the ${currentLine.nameRoman} train bound for ${boundForEn}. `
              : ''
          }The next station is ${
            nextStation?.nameRoman
          } ${nextStationNumberText} ${
            transferLines.length
              ? `Please change here for ${transferLines
                  .map((l, i, a) =>
                    a.length > 1 && a.length - 1 === i
                      ? `and the ${l.nameRoman}.`
                      : `the ${l.nameRoman}${a.length === 1 ? '' : ','}`
                  )
                  .join(' ')}`
              : ''
          }`,
          ARRIVING: `The next station is ${
            nextStation?.nameRoman
          } ${nextStationNumberText}${
            isNextStopTerminus ? ', terminal.' : ''
          } ${
            transferLines.length
              ? `Please change here for ${transferLines
                  .map((l, i, a) =>
                    a.length > 1 && a.length - 1 === i
                      ? `and the ${l.nameRoman}`
                      : `the ${l.nameRoman}${a.length === 1 ? '' : ','}`
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
              ? `This is the ${currentLine.nameRoman} train bound for ${boundForEn}. `
              : ''
          }The next station is ${
            nextStation?.nameRoman
          } ${nextStationNumberText}${isNextStopTerminus ? ', terminal' : ''} ${
            transferLines.length
              ? `Please change here for ${transferLines
                  .map((l, i, a) =>
                    a.length > 1 && a.length - 1 === i
                      ? `and the ${l.nameRoman}.`
                      : `the ${l.nameRoman}${a.length === 1 ? '' : ','}`
                  )
                  .join(' ')}`
              : ''
          }`,
          ARRIVING: `The next station is ${
            nextStation?.nameRoman
          } ${nextStationNumberText}${
            isNextStopTerminus ? ', terminal.' : ''
          } ${
            transferLines.length
              ? `Please change here for ${transferLines
                  .map((l, i, a) =>
                    a.length > 1 && a.length - 1 === i
                      ? `and the ${l.nameRoman}.`
                      : `the ${l.nameRoman}${a.length === 1 ? '' : ','}`
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
              ? `Thank you for using ${currentLine?.company?.nameEnglishShort}. This is the ${currentTrainType?.nameRoman ?? 'Local'} Service bound for ${boundForEn} ${
                  viaStation ? `via ${viaStation.nameRoman}` : ''
                }. We will be stopping at ${allStops
                  .slice(0, 5)
                  .map((s) =>
                    s.id === selectedBound?.id && !isLoopLine
                      ? `${s.nameRoman} terminal`
                      : `${s.nameRoman}`
                  )
                  .join(', ')}. ${
                  allStops
                    .slice(0, 5)
                    .filter((s) => s)
                    .reverse()[0]?.id === selectedBound?.id
                    ? ''
                    : `Stops after ${
                        allStops
                          .slice(0, 5)
                          .filter((s) => s)
                          .reverse()[0]?.nameRoman
                      } will be announced later. `
                }`
              : ''
          }The next stop is ${nextStation?.nameRoman}${nextStation?.groupId === selectedBound?.groupId && !isLoopLine ? ' terminal' : ''} ${
            nextStationNumber?.lineSymbol.length
              ? `station number ${nextStationNumberText}`
              : ''
          } ${
            transferLines.length
              ? `Transfer here for ${transferLines
                  .map((l, i, a) =>
                    a.length > 1 && a.length - 1 === i
                      ? `and the ${l.nameRoman}.`
                      : `the ${l.nameRoman}${a.length === 1 ? '.' : ','}`
                  )
                  .join(' ')}`
              : ''
          }`,
          ARRIVING: `We will soon be making a brief stop at ${
            nextStation?.nameRoman
          }${
            nextStationNumber?.lineSymbol.length
              ? ` station number ${nextStationNumberText}`
              : ''
          } ${
            transferLines.length
              ? `Transfer here for ${transferLines
                  .map((l, i, a) =>
                    a.length > 1 && a.length - 1 === i
                      ? `and the ${l.nameRoman}.`
                      : `the ${l.nameRoman}${a.length === 1 ? '.' : ','}`
                  )
                  .join(' ')}`
              : ''
          } ${
            afterNextStation
              ? `After leaving ${
                  nextStation?.nameRoman
                }, We will be stopping at ${afterNextStation.nameRoman}.`
              : ''
          }`,
        },
        [APP_THEME.TOEI]: {
          NEXT: `${
            firstSpeech
              ? `Thank you for using the ${currentLine.nameRoman}. `
              : ''
          }This is the ${currentTrainType?.nameRoman ?? 'Local'} train bound for ${boundForEn}. The next station is ${
            nextStation?.nameRoman
          } ${nextStationNumberText} ${
            transferLines.length
              ? `Please change here for ${transferLines
                  .map((l, i, a) =>
                    a.length > 1 && a.length - 1 === i
                      ? `and the ${l.nameRoman}.`
                      : `the ${l.nameRoman}${a.length === 1 ? '.' : ','}`
                  )
                  .join(' ')}`
              : ''
          }`,
          ARRIVING: `We will soon be arriving at ${
            nextStation?.nameRoman
          } ${nextStationNumberText} ${
            transferLines.length
              ? `Please change here for ${transferLines
                  .map((l, i, a) =>
                    a.length > 1 && a.length - 1 === i
                      ? `and the ${l.nameRoman}.`
                      : `the ${l.nameRoman}${a.length === 1 ? '.' : ','}`
                  )
                  .join(' ')}`
              : ''
          }${
            currentTrainType && afterNextStation
              ? ` The stop after ${nextStation?.nameRoman}, will be ${
                  afterNextStation.nameRoman
                }${isNextStopTerminus ? ' the last stop' : ''}.`
              : ''
          }${
            isNextStopTerminus
              ? ` Thank you for using the ${currentLine?.nameRoman}.`
              : ''
          }`,
        },
        [APP_THEME.LED]: {
          NEXT: '',
          ARRIVING: '',
        },
        [APP_THEME.JR_KYUSHU]: {
          NEXT: `${firstSpeech ? `This is a ${currentTrainType?.nameRoman ?? 'Local'} train bound for ${boundForEn}.` : ''} The next station is ${
            nextStation?.nameRoman
          } ${nextStationNumberText}${nextStation?.groupId === selectedBound?.groupId && !isLoopLine ? ' terminal' : ''}. ${
            transferLines.length
              ? `You can transfer to ${transferLines
                  .map((l, i, a) =>
                    a.length > 1 && a.length - 1 === i
                      ? `and the ${l.nameRoman}`
                      : `the ${l.nameRoman}${a.length === 1 ? '' : ','}`
                  )
                  .join(' ')} at ${nextStation?.nameRoman}.`
              : ''
          }`,
          ARRIVING: `We will soon be arriving at ${
            nextStation?.nameRoman
          }${nextStation?.groupId === selectedBound?.groupId && !isLoopLine ? ' terminal' : ''} ${nextStationNumberText}. ${
            isNextStopTerminus ? 'The last stop.' : ''
          } ${
            transferLines.length
              ? `You can transfer to ${transferLines
                  .map((l, i, a) =>
                    a.length > 1 && a.length - 1 === i
                      ? `and the ${l.nameRoman}.`
                      : `the ${l.nameRoman}${a.length === 1 ? '' : ','}`
                  )
                  .join(
                    ' '
                  )} at ${nextStation?.nameRoman}. ${nextStation?.groupId === selectedBound?.groupId && !isLoopLine ? `Thank you for using the ${currentLine.nameRoman}.` : ''}`
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
      nextStation?.nameRoman,
      nextStationNumber?.lineSymbol.length,
      nextStationNumberText,
      selectedBound,
      transferLines,
      viaStation,
    ]);

  const jaText = useMemo(() => {
    if (theme === APP_THEME.LED) {
      const tmpl = japaneseTemplate?.TOKYO_METRO?.[stoppingState];
      if (!tmpl) {
        return '';
      }
      return tmpl;
    }

    if (theme === APP_THEME.JO || theme === APP_THEME.JL) {
      const tmpl = japaneseTemplate?.YAMANOTE?.[stoppingState];
      if (!tmpl) {
        return '';
      }
      return tmpl;
    }

    const tmpl = japaneseTemplate?.[theme]?.[stoppingState];
    if (!tmpl) {
      return '';
    }
    return tmpl;
  }, [japaneseTemplate, stoppingState, theme]);

  const enText = useMemo(() => {
    if (theme === APP_THEME.LED) {
      const tmpl = englishTemplate?.TOKYO_METRO?.[stoppingState];
      if (!tmpl) {
        return '';
      }
      return tmpl;
    }

    if (theme === APP_THEME.JO || theme === APP_THEME.JL) {
      const tmpl = englishTemplate?.YAMANOTE?.[stoppingState];
      if (!tmpl) {
        return '';
      }
      return tmpl;
    }

    const tmpl = englishTemplate?.[theme]?.[stoppingState];
    if (!tmpl) {
      return '';
    }

    return tmpl;
  }, [englishTemplate, stoppingState, theme]);

  if (!enabled) {
    return [];
  }

  return [jaText.trim(), enText.trim()];
};
