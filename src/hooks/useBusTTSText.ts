import { useAtomValue } from 'jotai';
import { useCallback, useMemo } from 'react';
import type { Maybe, Station } from '~/@types/graphql';
import { APP_THEME, type AppTheme } from '../models/Theme';
import stationState from '../store/atoms/station';
import { themeAtom } from '../store/atoms/theme';
import getIsPass from '../utils/isPass';
import katakanaToHiragana from '../utils/kanaToHiragana';
import { useAfterNextStation } from './useAfterNextStation';
import { useBounds } from './useBounds';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentStation } from './useCurrentStation';
import { useIsTerminus } from './useIsTerminus';
import { useLoopLine } from './useLoopLine';
import { useLoopLineBound } from './useLoopLineBound';
import { useNextStation } from './useNextStation';
import { useSlicedStations } from './useSlicedStations';
import { useStoppingState } from './useStoppingState';

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

export const useBusTTSText = (
  firstSpeech = true,
  enabled = false
): [string, string] | [] => {
  const theme = useAtomValue(themeAtom);

  const { selectedBound: selectedBoundOrigin, stations } =
    useAtomValue(stationState);
  const station = useCurrentStation();
  const currentLineOrigin = useCurrentLine();

  const loopLineBoundJa = useLoopLineBound(false);
  const loopLineBoundEn = useLoopLineBound(false, 'EN');
  const { directionalStops } = useBounds(stations);
  const nextStationOrigin = useNextStation();
  const isNextStopTerminus = useIsTerminus(nextStationOrigin);
  const { isLoopLine, isPartiallyLoopLine } = useLoopLine();
  const slicedStationsOrigin = useSlicedStations();
  const stoppingState = useStoppingState();

  const replaceJapaneseText = useCallback(
    (name: Maybe<string>, nameKatakana: Maybe<string>) =>
      `<sub alias="${katakanaToHiragana(nameKatakana)}">${name}</sub>`,
    []
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
        : `${directionalStops?.map((s) => s?.nameRoman).join(' and ')}`,

    [directionalStops, isLoopLine, loopLineBoundEn?.boundFor]
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
    if (!afterNextStationOrigin) {
      return undefined;
    }

    return {
      ...afterNextStationOrigin,
      nameRoman: afterNextStationOrigin?.nameRoman ?? undefined,
      lines:
        afterNextStationOrigin.lines?.map(
          (l: { nameRoman: string | null | undefined }) => ({
            ...l,
            nameRoman: l.nameRoman ?? undefined,
          })
        ) ?? [],
    } as Station;
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
              )}です。このバスは、${boundForJa}ゆきです。${
                afterNextStation
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
                afterNextStation
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
                )}をご利用くださいまして、ありがとうございます。このバスは${boundForJa}ゆきです。`
              : ''
          }次は、${
            replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ??
            ''
          }${isNextStopTerminus ? '、終点' : ''}です。`,
          ARRIVING: `まもなく、${
            replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ??
            ''
          }${isNextStopTerminus ? '、終点' : ''}です。${
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
              ? `今日も、${currentLine.company?.nameShort}をご利用くださいまして、ありがとうございます。このバスは、${boundForJa}ゆきです。`
              : ''
          }次は、${
            replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ??
            ''
          }、${
            replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ??
            ''
          }${isNextStopTerminus ? '、終点です' : ''}。`,
          ARRIVING: `まもなく、${isNextStopTerminus ? '終点、' : ''}${
            replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ??
            ''
          }、${
            replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ??
            ''
          }。${
            isNextStopTerminus
              ? `${currentLine.company?.nameShort}をご利用くださいまして、ありがとうございました。`
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
              ? `今日も、${currentLine.company?.nameShort}をご利用くださいまして、ありがとうございます。このバスは、${boundForJa}ゆきです。`
              : ''
          }次は、${isNextStopTerminus ? '終点、' : ''}${
            replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ??
            ''
          }、${
            replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ??
            ''
          }。`,
          ARRIVING: `まもなく、${isNextStopTerminus ? '終点、' : ''}${
            replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ??
            ''
          }、${
            replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ??
            ''
          }。${
            isNextStopTerminus
              ? `${currentLine.company?.nameShort}をご利用くださいまして、ありがとうございました。`
              : ''
          }`,
        },
        [APP_THEME.JR_WEST]: {
          NEXT: `${
            firstSpeech
              ? `今日も、${
                  currentLine.company?.nameShort
                }をご利用くださいまして、ありがとうございます。このバスは、${
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
          }です。`,
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
              }です。今日も${currentLine.company?.nameShort}をご利用くださいまして、ありがとうございました。${replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana)}、${replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana)}です。`
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
          }。このバスは、${boundForJa}ゆきです。${
            afterNextStation
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
            afterNextStation
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
            firstSpeech ? `このバスは${boundForJa}行きです。` : ''
          }次は${nextStation?.groupId === selectedBound?.groupId && !isLoopLine ? '終点、' : ''}${replaceJapaneseText(
            nextStation?.name,
            nextStation?.nameKatakana
          )}、${replaceJapaneseText(
            nextStation?.name,
            nextStation?.nameKatakana
          )}。`,
          ARRIVING: `まもなく、${nextStation?.groupId === selectedBound?.groupId && !isLoopLine ? '終点、' : ''}${replaceJapaneseText(
            nextStation?.name,
            nextStation?.nameKatakana
          )}、${replaceJapaneseText(
            nextStation?.name,
            nextStation?.nameKatakana
          )}。${
            nextStation?.groupId === selectedBound?.groupId && !isLoopLine
              ? `${currentLine.nameShort}をご利用くださいまして、ありがとうございました。`
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
      currentLine,
      firstSpeech,
      isAfterNextStopTerminus,
      isLoopLine,
      isNextStopTerminus,
      nextStation?.name,
      nextStation?.nameKatakana,
      replaceJapaneseText,
      selectedBound,
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
          NEXT: `The next stop is ${nextStation?.nameRoman}.${
            firstSpeech
              ? ` This bus is on the ${
                  station?.line?.company?.nameEnglishShort ?? ''
                } bound for ${boundForEn}. ${
                  afterNextStation
                    ? `The next stop after ${nextStation?.nameRoman}${`, is ${
                        afterNextStation?.nameRoman
                      }${isAfterNextStopTerminus ? ' terminal' : ''}`}.`
                    : ''
                }${
                  betweenNextStation.length
                    ? ' For stations in between, Please change buses at the next stop.'
                    : ''
                }`
              : ''
          }`,
          ARRIVING: `Arriving at ${nextStation?.nameRoman}${
            isNextStopTerminus ? ', the last stop.' : '.'
          }${
            isNextStopTerminus
              ? ` Thank you for using the ${station?.line?.company?.nameEnglishShort ?? ''}.`
              : ''
          }`,
        },
        [APP_THEME.TY]: {
          NEXT: `${
            firstSpeech
              ? `Thank you for using the ${
                  station?.line?.company?.nameEnglishShort ?? ''
                }. This bus is bound for ${boundForEn}. `
              : ''
          }The next stop is ${nextStation?.nameRoman}${
            isNextStopTerminus ? ', the last stop.' : '.'
          }`,
          ARRIVING: `We will soon make a brief stop at ${nextStation?.nameRoman}${
            isNextStopTerminus ? ', the last stop.' : '.'
          }${
            afterNextStation
              ? ` The stop after ${nextStation?.nameRoman}, will be ${
                  afterNextStation.nameRoman
                }${isAfterNextStopTerminus ? ' the last stop' : ''}.`
              : ''
          }${
            isNextStopTerminus
              ? ` Thank you for using the ${station?.line?.company?.nameEnglishShort ?? ''}.`
              : ''
          }`,
        },
        [APP_THEME.YAMANOTE]: {
          NEXT: `${
            firstSpeech
              ? `This is the ${station?.line?.company?.nameEnglishShort ?? ''} bus bound for ${boundForEn}. `
              : ''
          }The next stop is ${nextStation?.nameRoman}.`,
          ARRIVING: `The next stop is ${nextStation?.nameRoman}${
            isNextStopTerminus ? ', terminal.' : '.'
          }${
            isNextStopTerminus
              ? ' Thank you for traveling with us, and look forward to serving you again.'
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
              ? `This is the ${station?.line?.company?.nameEnglishShort ?? ''} bus bound for ${boundForEn}. `
              : ''
          }The next stop is ${nextStation?.nameRoman}${
            isNextStopTerminus ? ', terminal.' : '.'
          }`,
          ARRIVING: `The next stop is ${nextStation?.nameRoman}${
            isNextStopTerminus ? ', terminal.' : '.'
          }${
            isNextStopTerminus
              ? ' Thank you for traveling with us, and look forward to serving you again.'
              : ''
          }`,
        },
        [APP_THEME.JR_WEST]: {
          NEXT: `${
            firstSpeech
              ? `Thank you for using ${currentLine?.company?.nameEnglishShort}. This bus is bound for ${boundForEn} ${
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
          }The next stop is ${nextStation?.nameRoman}${
            nextStation?.groupId === selectedBound?.groupId && !isLoopLine
              ? ' terminal.'
              : '.'
          }`,
          ARRIVING: `We will soon be making a brief stop at ${nextStation?.nameRoman}.${
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
              ? `Thank you for using the ${station?.line?.company?.nameEnglishShort ?? ''}. `
              : ''
          }This bus is bound for ${boundForEn}. The next stop is ${nextStation?.nameRoman}.`,
          ARRIVING: `We will soon be arriving at ${nextStation?.nameRoman}.${
            afterNextStation
              ? ` The stop after ${nextStation?.nameRoman}, will be ${
                  afterNextStation.nameRoman
                }${isAfterNextStopTerminus ? ' the last stop' : ''}.`
              : ''
          }${
            isNextStopTerminus
              ? ` Thank you for using the ${station?.line?.company?.nameEnglishShort ?? ''}.`
              : ''
          }`,
        },
        [APP_THEME.LED]: {
          NEXT: '',
          ARRIVING: '',
        },
        [APP_THEME.JR_KYUSHU]: {
          NEXT: `${firstSpeech ? `This bus is bound for ${boundForEn}.` : ''} The next stop is ${nextStation?.nameRoman}${
            nextStation?.groupId === selectedBound?.groupId && !isLoopLine
              ? ' terminal.'
              : '.'
          }`,
          ARRIVING: `We will soon be arriving at ${nextStation?.nameRoman}${
            nextStation?.groupId === selectedBound?.groupId && !isLoopLine
              ? ' terminal.'
              : '.'
          }${
            nextStation?.groupId === selectedBound?.groupId && !isLoopLine
              ? ` Thank you for using the ${station?.line?.company?.nameEnglishShort ?? ''}.`
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
      currentLine,
      firstSpeech,
      isAfterNextStopTerminus,
      isLoopLine,
      isNextStopTerminus,
      nextStation?.groupId,
      selectedBound?.groupId,
      nextStation?.nameRoman,
      selectedBound,
      viaStation,
      station?.line?.company?.nameEnglishShort,
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
