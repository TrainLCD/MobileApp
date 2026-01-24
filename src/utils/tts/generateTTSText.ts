import type { Station } from '~/@types/graphql';
import { parenthesisRegexp } from '~/constants';
import type { LineState } from '~/store/atoms/line';
import type { NavigationState } from '~/store/atoms/navigation';
import type { StationState } from '~/store/atoms/station';
import { APP_THEME, type AppTheme } from '../../models/Theme';
import getIsPass from '../isPass';
import katakanaToHiragana from '../kanaToHiragana';
import {
  getAfterNextStation,
  getConnectedLines,
  getCurrentLine,
  getCurrentStation,
  getCurrentTrainType,
  getDirectionalStops,
  getLoopLineBound,
  getLoopLineInfo,
  getNextStation,
  getSlicedStations,
  getStoppingState,
  getTransferLines,
  isTerminus,
} from './helpers';

type GenerateTTSTextParams = {
  stationState: StationState;
  lineState: LineState;
  navigationState: NavigationState;
  theme: AppTheme;
  firstSpeech: boolean;
};

const replaceJapaneseText = (
  name: string | undefined | null,
  nameKatakana: string | undefined | null
): string =>
  !name || !nameKatakana
    ? `<sub alias="かくえきていしゃ">各駅停車</sub>`
    : `<sub alias="${katakanaToHiragana(nameKatakana)}">${name}</sub>`;

export const generateTTSText = ({
  stationState,
  lineState,
  navigationState,
  theme,
  firstSpeech,
}: GenerateTTSTextParams): [string, string] | [] => {
  const currentLine = getCurrentLine(stationState, lineState);
  const currentStation = getCurrentStation(stationState);
  const nextStation = getNextStation(stationState, lineState, navigationState);
  const afterNextStation = getAfterNextStation(
    stationState,
    lineState,
    navigationState
  );
  const stoppingState = getStoppingState(
    stationState,
    lineState,
    navigationState
  );
  const transferLines = getTransferLines(
    stationState,
    lineState,
    navigationState
  );
  const connectedLines = getConnectedLines(stationState, lineState);
  const currentTrainTypeRaw = getCurrentTrainType(
    stationState,
    lineState,
    navigationState
  );
  const loopInfo = getLoopLineInfo(stationState, lineState, navigationState);
  const { isLoopLine, isPartiallyLoopLine } = loopInfo;
  const loopLineBoundJa = getLoopLineBound(
    stationState,
    lineState,
    navigationState,
    'JA'
  );
  const loopLineBoundEn = getLoopLineBound(
    stationState,
    lineState,
    navigationState,
    'EN'
  );
  const directionalStops = getDirectionalStops(
    stationState,
    lineState,
    navigationState
  );
  const { selectedBound } = stationState;

  const slicedStationsRaw = getSlicedStations(
    stationState,
    lineState,
    navigationState
  );
  // 直通時、同じGroupIDの駅が違う駅として扱われるのを防ぐ
  const slicedStations = Array.from(
    new Set(slicedStationsRaw.map((s) => s.groupId))
  )
    .map((gid) => slicedStationsRaw.find((s) => s.groupId === gid))
    .filter((s): s is Station => !!s);

  const isNextStopTerminus = isTerminus(
    nextStation,
    stationState,
    lineState,
    navigationState
  );
  const isAfterNextStopTerminus = isTerminus(
    afterNextStation,
    stationState,
    lineState,
    navigationState
  );

  if (!currentLine || !selectedBound) {
    return [];
  }

  const currentTrainType = currentTrainTypeRaw
    ? {
        ...currentTrainTypeRaw,
        nameRoman: currentTrainTypeRaw.nameRoman?.replace(
          parenthesisRegexp,
          ''
        ),
      }
    : null;

  // boundFor計算
  const boundForJa = isLoopLine
    ? loopLineBoundJa?.boundFor?.replace(/・/g, '<break time="250ms"/>')
    : replaceJapaneseText(
        `${directionalStops?.map((s) => s?.name).join('・')}${isPartiallyLoopLine ? '方面' : ''}`,
        `${directionalStops?.map((s) => s?.nameKatakana).join('・')}${isPartiallyLoopLine ? 'ホウメン' : ''}`
      );

  const boundForEn = isLoopLine
    ? (loopLineBoundEn?.boundFor?.replaceAll('&', ' and ') ?? '')
    : `${directionalStops?.map((s) => s?.nameRoman).join(' and ')}`;

  // 次の次の駅までの間の駅を計算
  const nextStationIndex = slicedStations.findIndex(
    (s) => s.groupId === nextStation?.groupId
  );
  const afterNextStationIndex = slicedStations.findIndex(
    (s) => s.groupId === afterNextStation?.groupId
  );
  const betweenNextStation = slicedStations.slice(
    nextStationIndex + 1,
    afterNextStationIndex
  );

  // 全停車駅
  const allStops = slicedStations.filter((s) => {
    if (s.id === currentStation?.id) {
      return false;
    }
    return !getIsPass(s);
  });

  // viaStation (経由駅)
  const viaStation = (() => {
    const sortedStops = allStops
      .slice()
      .sort((a, b) =>
        (a.lines?.length ?? 0) < (b.lines?.length ?? 0) ? 1 : -1
      );

    if (allStops[allStops.length - 1]?.id === sortedStops[0]?.id) {
      return undefined;
    }
    return sortedStops[0];
  })();

  // 駅番号テキスト生成
  const getStationNumberText = (station: Station | undefined): string => {
    if (!station?.stationNumbers?.length) {
      return '';
    }
    const stationNumber = station.stationNumbers[0];
    if (!stationNumber?.stationNumber) {
      return '';
    }

    const split = stationNumber.stationNumber.split('-');
    if (!split.length) {
      return '';
    }
    if (split.length === 1) {
      return `${theme === APP_THEME.JR_WEST ? '' : 'Station Number '}${Number(stationNumber.stationNumber)}`;
    }

    const symbol = split[0]?.split('').join(' ');
    const num = split[2]
      ? `${Number(split[1])}-${Number(split[2])}`
      : Number(split[1]).toString();

    return `${stationNumber.lineSymbol?.length || theme === APP_THEME.JR_WEST ? '' : 'Station Number '}${symbol} ${num}.`;
  };

  const nextStationNumberText = getStationNumberText(nextStation);

  // テーマ別テンプレート生成
  const getJapaneseText = (): string => {
    const actualTheme =
      theme === APP_THEME.LED
        ? APP_THEME.TOKYO_METRO
        : theme === APP_THEME.JO || theme === APP_THEME.JL
          ? APP_THEME.YAMANOTE
          : theme;

    switch (actualTheme) {
      case APP_THEME.TOKYO_METRO:
        if (stoppingState === 'ARRIVING') {
          return `まもなく、${
            replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ??
            ''
          }${isNextStopTerminus ? '終点' : ''}です。${
            transferLines.length
              ? `${transferLines.map((l) => replaceJapaneseText(l.nameShort, l.nameKatakana)).join('、')}はお乗り換えです。`
              : ''
          }${
            isNextStopTerminus
              ? `${replaceJapaneseText(currentLine.company?.nameShort, currentLine.company?.nameKatakana)}をご利用くださいまして、ありがとうございました。`
              : ''
          }`;
        }
        // NEXT
        if (firstSpeech) {
          return `${replaceJapaneseText(currentLine.nameShort, currentLine.nameKatakana)}をご利用くださいまして、ありがとうございます。次は、${replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana)}です。この電車は、${
            connectedLines.length
              ? `${connectedLines.map((l) => replaceJapaneseText(l.nameShort, l.nameKatakana)).join('、')}直通、`
              : ''
          }${currentTrainType ? replaceJapaneseText(currentTrainType.name, currentTrainType.nameKatakana) : '各駅停車'}、${boundForJa}ゆきです。${
            currentTrainType && afterNextStation
              ? `${replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana)}の次は、${isAfterNextStopTerminus ? '終点、' : ''}${replaceJapaneseText(afterNextStation?.name, afterNextStation?.nameKatakana)}に停まります。`
              : ''
          }${
            betweenNextStation.length
              ? `${betweenNextStation.map((s) => replaceJapaneseText(s.name, s.nameKatakana)).join('、')}へおいでのお客様はお乗り換えです。`
              : ''
          }`;
        }
        return `次は、${replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana)}${isNextStopTerminus ? '、終点' : ''}です。${
          transferLines.length
            ? `${transferLines.map((l) => replaceJapaneseText(l.nameShort, l.nameKatakana)).join('、')}はお乗り換えです。`
            : ''
        }${
          currentTrainType && afterNextStation
            ? `${replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana)}の次は、${isAfterNextStopTerminus ? '終点、' : ''}${replaceJapaneseText(afterNextStation?.name, afterNextStation?.nameKatakana)}に停まります。`
            : ''
        }${
          betweenNextStation.length
            ? `${betweenNextStation.map((s) => replaceJapaneseText(s.name, s.nameKatakana)).join('、')}へおいでのお客様はお乗り換えです。`
            : ''
        }`;

      case APP_THEME.YAMANOTE:
        if (stoppingState === 'ARRIVING') {
          return `まもなく、${isNextStopTerminus ? '終点、' : ''}${
            replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ??
            ''
          }、${replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ?? ''}。${
            transferLines.length
              ? `${transferLines.map((l) => replaceJapaneseText(l.nameShort, l.nameKatakana)).join('、')}は、お乗り換えです。${
                  isNextStopTerminus
                    ? `${currentLine.company?.nameShort}をご利用くださいまして、ありがとうございました。`
                    : ''
                }`
              : ''
          }`;
        }
        return `${
          firstSpeech
            ? `今日も、${currentLine.company?.nameShort}をご利用くださいまして、ありがとうございます。この電車は、${boundForJa}ゆきです。`
            : ''
        }次は、${replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ?? ''}、${
          replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ??
          ''
        }${isNextStopTerminus ? '、終点です' : ''}。${
          transferLines.length
            ? `${transferLines.map((l) => replaceJapaneseText(l.nameShort, l.nameKatakana)).join('、')}はお乗り換えです。`
            : ''
        }`;

      case APP_THEME.JR_WEST:
        if (stoppingState === 'ARRIVING') {
          if (isNextStopTerminus) {
            return `ご乗車ありがとうございました。まもなく${replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ?? ''}、${replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ?? ''}です。${
              transferLines.length
                ? `${transferLines.map((l) => replaceJapaneseText(l.nameShort, l.nameKatakana)).join('、')}はお乗り換えです。`
                : ''
            }今日も${currentLine.company?.nameShort}をご利用くださいまして、ありがとうございました。${replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana)}、${replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana)}です。`;
          }
          return `まもなく、${replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ?? ''}、${replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ?? ''}です。${
            transferLines.length
              ? `${transferLines.map((l) => replaceJapaneseText(l.nameShort, l.nameKatakana)).join('、')}はお乗り換えです。`
              : ''
          }${
            afterNextStation
              ? `${replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana)}を出ますと、次は、${replaceJapaneseText(afterNextStation.name, afterNextStation.nameKatakana)}に停まります。`
              : ''
          }`;
        }
        return `${
          firstSpeech
            ? `今日も、${currentLine.company?.nameShort}をご利用くださいまして、ありがとうございます。この電車は、${replaceJapaneseText(currentTrainType?.name, currentTrainType?.nameKatakana)}、${
                viaStation
                  ? `${replaceJapaneseText(viaStation.name, viaStation.nameKatakana)}方面、`
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
        }、${replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ?? ''}です。${
          transferLines.length
            ? `${transferLines.map((l) => replaceJapaneseText(l.nameShort, l.nameKatakana)).join('、')}はお乗り換えです。`
            : ''
        }`;

      default:
        // TY, SAIKYO, TOEI, JR_KYUSHU などはシンプルなテンプレートを使用
        if (stoppingState === 'ARRIVING') {
          return `まもなく、${replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ?? ''}${isNextStopTerminus ? '、終点' : ''}です。${
            transferLines.length
              ? `${transferLines.map((l) => replaceJapaneseText(l.nameShort, l.nameKatakana)).join('、')}はお乗り換えです。`
              : ''
          }`;
        }
        return `${firstSpeech ? `この電車は、${boundForJa}ゆきです。` : ''}次は、${
          replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ??
          ''
        }${isNextStopTerminus ? '、終点' : ''}です。${
          transferLines.length
            ? `${transferLines.map((l) => replaceJapaneseText(l.nameShort, l.nameKatakana)).join('、')}はお乗り換えです。`
            : ''
        }`;
    }
  };

  const getEnglishText = (): string => {
    const actualTheme =
      theme === APP_THEME.LED
        ? APP_THEME.TOKYO_METRO
        : theme === APP_THEME.JO || theme === APP_THEME.JL
          ? APP_THEME.YAMANOTE
          : theme;

    switch (actualTheme) {
      case APP_THEME.TOKYO_METRO:
        if (stoppingState === 'ARRIVING') {
          return `Arriving at ${nextStation?.nameRoman} ${nextStationNumberText}${isNextStopTerminus ? ', the last stop.' : ''} ${
            transferLines.length
              ? `Please change here for ${transferLines
                  .map((l, i, a) =>
                    a.length > 1 && a.length - 1 === i
                      ? `and the ${l.nameRoman}`
                      : `the ${l.nameRoman}${a.length === 1 ? '' : ','}`
                  )
                  .join(' ')}`
              : ''
          }. ${isNextStopTerminus ? `Thank you for using the ${currentLine?.nameRoman}.` : ''}`;
        }
        return `The next stop is ${nextStation?.nameRoman}${nextStationNumberText.length ? ` ${nextStationNumberText}` : '.'}${
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
            ? ` This train is the ${currentTrainType ? currentTrainType.nameRoman : 'Local'} Service on the ${currentLine.nameRoman} bound for ${boundForEn}.`
            : ''
        }`;

      case APP_THEME.YAMANOTE:
        if (stoppingState === 'ARRIVING') {
          return `The next station is ${nextStation?.nameRoman} ${nextStationNumberText}${isNextStopTerminus ? ', terminal.' : ''} ${
            transferLines.length
              ? `Please change here for ${transferLines
                  .map((l, i, a) =>
                    a.length > 1 && a.length - 1 === i
                      ? `and the ${l.nameRoman}`
                      : `the ${l.nameRoman}${a.length === 1 ? '' : ','}`
                  )
                  .join(' ')}`
              : ''
          }. ${isNextStopTerminus ? 'Thank you for traveling with us, and look forward to serving you again.' : ''}`;
        }
        return `${firstSpeech ? `This is the ${currentLine.nameRoman} train bound for ${boundForEn}. ` : ''}The next station is ${
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
        }`;

      case APP_THEME.JR_WEST:
        if (stoppingState === 'ARRIVING') {
          return `We will soon be making a brief stop at ${nextStation?.nameRoman}. ${
            transferLines.length
              ? `Transfer here for ${transferLines
                  .map((l, i, a) =>
                    a.length > 1 && a.length - 1 === i
                      ? `and the ${l.nameRoman}.`
                      : `the ${l.nameRoman}${a.length === 1 ? '.' : ','}`
                  )
                  .join(' ')}`
              : ''
          }`;
        }
        return `${
          firstSpeech
            ? `Thank you for using ${currentLine?.company?.nameEnglishShort}. This is the ${currentTrainType?.nameRoman ?? 'Local'} Service bound for ${boundForEn}.`
            : ''
        } The next stop is ${nextStation?.nameRoman}${nextStation?.groupId === selectedBound?.groupId && !isLoopLine ? ' terminal' : ''}.`;

      default:
        if (stoppingState === 'ARRIVING') {
          return `We will soon be arriving at ${nextStation?.nameRoman}${isNextStopTerminus ? ', terminal' : ''}.`;
        }
        return `The next station is ${nextStation?.nameRoman}${isNextStopTerminus ? ', terminal' : ''}.`;
    }
  };

  if (stoppingState === 'CURRENT') {
    return [];
  }

  const jaText = getJapaneseText();
  const enText = getEnglishText();

  return [jaText.trim(), enText.trim()];
};
