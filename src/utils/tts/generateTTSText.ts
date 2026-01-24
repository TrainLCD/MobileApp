import type { Line, Station, TrainType } from '~/@types/graphql';
import { parenthesisRegexp } from '~/constants';
import type { HeaderStoppingState } from '../../models/HeaderTransitionState';
import { APP_THEME, type AppTheme } from '../../models/Theme';
import getIsPass from '../isPass';
import katakanaToHiragana from '../kanaToHiragana';

// 計算済みデータを受け取る型
export type TTSTextData = {
  theme: AppTheme;
  firstSpeech: boolean;
  stoppingState: HeaderStoppingState;
  currentLine: Line | null;
  currentStation: Station | undefined;
  nextStation: Station | undefined;
  afterNextStation: Station | undefined;
  selectedBound: Station | null;
  transferLines: Line[];
  connectedLines: Line[];
  currentTrainType: TrainType | null;
  isLoopLine: boolean;
  isPartiallyLoopLine: boolean;
  loopLineBoundJa: string | undefined;
  loopLineBoundEn: string | undefined;
  directionalStops: Station[];
  slicedStations: Station[];
  isNextStopTerminus: boolean;
  isAfterNextStopTerminus: boolean;
  // 駅番号用（オプション）
  nextStationNumber?: {
    stationNumber?: string | null;
    lineSymbol?: string | null;
  };
};

const replaceJapaneseText = (
  name: string | undefined | null,
  nameKatakana: string | undefined | null
): string =>
  !name || !nameKatakana
    ? `<sub alias="かくえきていしゃ">各駅停車</sub>`
    : `<sub alias="${katakanaToHiragana(nameKatakana)}">${name}</sub>`;

export const generateTTSText = (data: TTSTextData): [string, string] | [] => {
  const {
    theme,
    firstSpeech,
    stoppingState,
    currentLine,
    currentStation,
    nextStation,
    afterNextStation,
    selectedBound,
    transferLines,
    connectedLines,
    currentTrainType,
    isLoopLine,
    isPartiallyLoopLine,
    loopLineBoundJa,
    loopLineBoundEn,
    directionalStops,
    slicedStations,
    isNextStopTerminus,
    isAfterNextStopTerminus,
    nextStationNumber,
  } = data;

  if (!currentLine || !selectedBound || stoppingState === 'CURRENT') {
    return [];
  }

  // boundFor計算
  const boundForJa = isLoopLine
    ? loopLineBoundJa?.replace(/・/g, '<break time="250ms"/>')
    : replaceJapaneseText(
        `${directionalStops?.map((s) => s?.name).join('・')}${isPartiallyLoopLine ? '方面' : ''}`,
        `${directionalStops?.map((s) => s?.nameKatakana).join('・')}${isPartiallyLoopLine ? 'ホウメン' : ''}`
      );

  const boundForEn = isLoopLine
    ? (loopLineBoundEn?.replaceAll('&', ' and ') ?? '')
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

    if (allStops.at(-1)?.id === sortedStops[0]?.id) {
      return undefined;
    }
    return sortedStops[0];
  })();

  // 駅番号テキスト生成
  const getStationNumberText = (): string => {
    if (!nextStationNumber?.stationNumber) {
      return '';
    }

    const split = nextStationNumber.stationNumber.split('-');
    if (!split.length) {
      return '';
    }
    if (split.length === 1) {
      return `${theme === APP_THEME.JR_WEST ? '' : 'Station Number '}${Number(nextStationNumber.stationNumber)}`;
    }

    const symbol = split[0]?.split('').join(' ');
    const num = split[2]
      ? `${Number(split[1])}-${Number(split[2])}`
      : Number(split[1]).toString();

    return `${nextStationNumber.lineSymbol?.length || theme === APP_THEME.JR_WEST ? '' : 'Station Number '}${symbol} ${num}.`;
  };

  const nextStationNumberText = getStationNumberText();

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

      case APP_THEME.TY:
        if (stoppingState === 'ARRIVING') {
          return `まもなく、${
            replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ??
            ''
          }${isNextStopTerminus ? '、終点' : ''}です。${
            transferLines.length
              ? `${transferLines.map((l) => replaceJapaneseText(l.nameShort, l.nameKatakana)).join('、')}をご利用のお客様はお乗り換えです。`
              : ''
          }${
            afterNextStation
              ? `${replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana)}を出ますと、${isAfterNextStopTerminus ? '終点、' : ''}${replaceJapaneseText(afterNextStation.name, afterNextStation.nameKatakana)}に停まります。`
              : ''
          }${
            isNextStopTerminus
              ? ` ${replaceJapaneseText(currentLine?.nameShort, currentLine?.nameKatakana)}をご利用くださいまして、ありがとうございました。`
              : ''
          }`;
        }
        return `${
          firstSpeech
            ? `${replaceJapaneseText(currentLine.nameShort, currentLine.nameKatakana)}をご利用くださいまして、ありがとうございます。この電車は${
                connectedLines.length
                  ? `${connectedLines.map((l) => replaceJapaneseText(l.nameShort, l.nameKatakana)).join('、')}直通、`
                  : ''
              }${currentTrainType ? replaceJapaneseText(currentTrainType.name, currentTrainType.nameKatakana) : '各駅停車'}、${boundForJa}ゆきです。`
            : ''
        }次は、${replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ?? ''}${isNextStopTerminus ? '、終点' : ''}です。${
          transferLines.length
            ? `${transferLines.map((l) => replaceJapaneseText(l.nameShort, l.nameKatakana)).join('、')}をご利用のお客様はお乗り換えです。`
            : ''
        }`;

      case APP_THEME.YAMANOTE:
      case APP_THEME.SAIKYO:
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
        }次は、${isNextStopTerminus ? '終点、' : ''}${
          replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ??
          ''
        }、${replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ?? ''}${actualTheme === APP_THEME.YAMANOTE && isNextStopTerminus ? '、終点です' : ''}。${
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
                allStops.slice(0, 5).at(-1)?.id === selectedBound?.id
                  ? ''
                  : `${replaceJapaneseText(
                      allStops.slice(0, 5).at(-1)?.name,
                      allStops.slice(0, 5).at(-1)?.nameKatakana
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

      case APP_THEME.TOEI:
        if (stoppingState === 'ARRIVING') {
          return `まもなく、${replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ?? ''}、${replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ?? ''}。${
            transferLines.length
              ? `${transferLines.map((l) => replaceJapaneseText(l.nameShort, l.nameKatakana)).join('、')}はお乗り換えです。`
              : ''
          }${
            currentTrainType && afterNextStation
              ? `${replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana)}の次は、${isAfterNextStopTerminus ? '終点、' : ''}${replaceJapaneseText(afterNextStation?.name, afterNextStation?.nameKatakana)}に停まります。`
              : ''
          }${
            betweenNextStation.length
              ? `通過する、${betweenNextStation.map((s) => replaceJapaneseText(s.name, s.nameKatakana)).join('、')}へおいでの方はお乗り換えです。`
              : ''
          }${
            isNextStopTerminus
              ? ` ${replaceJapaneseText(currentLine?.nameShort, currentLine?.nameKatakana)}をご利用くださいまして、ありがとうございました。`
              : ''
          }`;
        }
        return `${
          firstSpeech
            ? `${replaceJapaneseText(currentLine.nameShort, currentLine.nameKatakana)}をご利用くださいまして、ありがとうございます。`
            : ''
        }次は、${replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ?? ''}、${replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ?? ''}。 ${
          transferLines.length
            ? `${transferLines.map((l) => replaceJapaneseText(l.nameShort, l.nameKatakana)).join('、')}はお乗り換えです。`
            : ''
        }この電車は、${
          connectedLines.length
            ? `${connectedLines.map((l) => replaceJapaneseText(l.nameShort, l.nameKatakana)).join('、')}直通、`
            : ''
        }${currentTrainType ? replaceJapaneseText(currentTrainType.name, currentTrainType.nameKatakana) : '各駅停車'}、${boundForJa}ゆきです。${
          currentTrainType && afterNextStation
            ? `${replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana)}の次は、${isAfterNextStopTerminus ? '終点、' : ''}${replaceJapaneseText(afterNextStation?.name, afterNextStation?.nameKatakana)}に停まります。`
            : ''
        }${
          betweenNextStation.length
            ? `通過する、${betweenNextStation.map((s) => replaceJapaneseText(s.name, s.nameKatakana)).join('、')}へおいでの方はお乗り換えです。`
            : ''
        }`;

      case APP_THEME.JR_KYUSHU:
        if (stoppingState === 'ARRIVING') {
          return `まもなく、${nextStation?.groupId === selectedBound?.groupId && !isLoopLine ? '終点、' : ''}${replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana)}、${replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana)}。${
            transferLines.length
              ? `${transferLines.map((l) => replaceJapaneseText(l.nameShort, l.nameKatakana)).join('、')}にお乗り換えいただけます。${
                  nextStation?.groupId === selectedBound?.groupId && !isLoopLine
                    ? `${currentLine.nameShort}をご利用くださいまして、ありがとうございました。`
                    : ''
                }`
              : ''
          }`;
        }
        return `${
          firstSpeech
            ? `この列車は${currentTrainType ? replaceJapaneseText(currentTrainType.name, currentTrainType.nameKatakana) : '普通'}、${boundForJa}行きです。`
            : ''
        }次は${nextStation?.groupId === selectedBound?.groupId && !isLoopLine ? '終点、' : ''}${replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana)}、${replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana)}。${
          transferLines.length
            ? `${replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana)}では、${transferLines.map((l) => replaceJapaneseText(l.nameShort, l.nameKatakana)).join('、')}にお乗り換えいただけます。`
            : ''
        }`;

      default:
        if (stoppingState === 'ARRIVING') {
          return `まもなく、${replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ?? ''}${isNextStopTerminus ? '、終点' : ''}です。`;
        }
        return `次は、${replaceJapaneseText(nextStation?.name, nextStation?.nameKatakana) ?? ''}${isNextStopTerminus ? '、終点' : ''}です。`;
    }
  };

  const getEnglishText = (): string => {
    const actualTheme =
      theme === APP_THEME.LED
        ? APP_THEME.TOKYO_METRO
        : theme === APP_THEME.JO || theme === APP_THEME.JL
          ? APP_THEME.YAMANOTE
          : theme;

    const transferLinesText = (prefix: string, suffix = '') =>
      transferLines.length
        ? `${prefix}${transferLines
            .map((l, i, a) =>
              a.length > 1 && a.length - 1 === i
                ? `and the ${l.nameRoman}`
                : `the ${l.nameRoman}${a.length === 1 ? '' : ','}`
            )
            .join(' ')}${suffix}`
        : '';

    switch (actualTheme) {
      case APP_THEME.TOKYO_METRO:
        if (stoppingState === 'ARRIVING') {
          return `Arriving at ${nextStation?.nameRoman} ${nextStationNumberText}${isNextStopTerminus ? ', the last stop.' : ''} ${transferLinesText('Please change here for ', '.')} ${
            isNextStopTerminus
              ? `Thank you for using the ${currentLine?.nameRoman}.`
              : ''
          }`;
        }
        return `The next stop is ${nextStation?.nameRoman}${nextStationNumberText.length ? ` ${nextStationNumberText}` : '.'} ${transferLinesText('Please change here for ', '.')}${
          firstSpeech
            ? ` This train is the ${currentTrainType ? currentTrainType.nameRoman?.replace(parenthesisRegexp, '') : 'Local'} Service on the ${currentLine.nameRoman} bound for ${boundForEn}.`
            : ''
        }`;

      case APP_THEME.TY:
        if (stoppingState === 'ARRIVING') {
          return `We will soon make a brief stop at ${nextStation?.nameRoman} ${nextStationNumberText}${isNextStopTerminus ? ', the last stop' : ''}. ${transferLinesText('Passengers changing to ', ', Please transfer at this station.')}${
            afterNextStation
              ? ` The stop after ${nextStation?.nameRoman}, will be ${afterNextStation.nameRoman}${isAfterNextStopTerminus ? ' the last stop' : ''}.`
              : ''
          }${
            isNextStopTerminus
              ? ` Thank you for using the ${currentLine?.nameRoman}.`
              : ''
          }`;
        }
        return `${
          firstSpeech
            ? `Thank you for using the ${currentLine.nameRoman}. This is the ${currentTrainType?.nameRoman?.replace(parenthesisRegexp, '') ?? 'Local'} train ${
                connectedLines[0]?.nameRoman
                  ? `on the ${connectedLines[0]?.nameRoman}`
                  : ''
              } to ${boundForEn}. `
            : ''
        }The next station is ${nextStation?.nameRoman} ${nextStationNumberText}${isNextStopTerminus ? ', the last stop' : ''}. ${transferLinesText('Passengers changing to ', ', Please transfer at this station.')}`;

      case APP_THEME.YAMANOTE:
      case APP_THEME.SAIKYO:
        if (stoppingState === 'ARRIVING') {
          return `The next station is ${nextStation?.nameRoman} ${nextStationNumberText}${isNextStopTerminus ? ', terminal.' : ''} ${transferLinesText('Please change here for ', '.')} ${
            isNextStopTerminus
              ? 'Thank you for traveling with us, and look forward to serving you again.'
              : ''
          }`;
        }
        return `${firstSpeech ? `This is the ${currentLine.nameRoman} train bound for ${boundForEn}. ` : ''}The next station is ${nextStation?.nameRoman} ${nextStationNumberText}${isNextStopTerminus ? ', terminal' : ''}. ${transferLinesText('Please change here for ', '.')}`;

      case APP_THEME.JR_WEST:
        if (stoppingState === 'ARRIVING') {
          return `We will soon be making a brief stop at ${nextStation?.nameRoman}${
            nextStationNumber?.lineSymbol?.length
              ? ` station number ${nextStationNumberText.replace(/\.$/, '')}.`
              : '.'
          } ${transferLinesText('Transfer here for ', '.')} ${
            afterNextStation
              ? `After leaving ${nextStation?.nameRoman}, We will be stopping at ${afterNextStation.nameRoman}.`
              : ''
          }`;
        }
        return `${
          firstSpeech
            ? `Thank you for using ${currentLine?.company?.nameEnglishShort}. This is the ${currentTrainType?.nameRoman?.replace(parenthesisRegexp, '') ?? 'Local'} Service bound for ${boundForEn} ${
                viaStation ? `via ${viaStation.nameRoman}` : ''
              }. We will be stopping at ${allStops
                .slice(0, 5)
                .map((s) =>
                  s.id === selectedBound?.id && !isLoopLine
                    ? `${s.nameRoman} terminal`
                    : `${s.nameRoman}`
                )
                .join(', ')}. ${
                allStops.slice(0, 5).at(-1)?.id === selectedBound?.id
                  ? ''
                  : `Stops after ${allStops.slice(0, 5).at(-1)?.nameRoman} will be announced later. `
              }`
            : ''
        }The next stop is ${nextStation?.nameRoman}${nextStation?.groupId === selectedBound?.groupId && !isLoopLine ? ' terminal' : ''}${
          nextStationNumber?.lineSymbol?.length
            ? ` station number ${nextStationNumberText.replace(/\.$/, '')}.`
            : '.'
        } ${transferLinesText('Transfer here for ', '.')}`;

      case APP_THEME.TOEI:
        if (stoppingState === 'ARRIVING') {
          return `We will soon be arriving at ${nextStation?.nameRoman} ${nextStationNumberText}. ${transferLinesText('Please change here for ', '.')}${
            currentTrainType && afterNextStation
              ? ` The stop after ${nextStation?.nameRoman}, will be ${afterNextStation.nameRoman}${isAfterNextStopTerminus ? ' the last stop' : ''}.`
              : ''
          }${
            isNextStopTerminus
              ? ` Thank you for using the ${currentLine?.nameRoman}.`
              : ''
          }`;
        }
        return `${
          firstSpeech
            ? `Thank you for using the ${currentLine.nameRoman}. `
            : ''
        }This is the ${currentTrainType?.nameRoman?.replace(parenthesisRegexp, '') ?? 'Local'} train bound for ${boundForEn}. The next station is ${nextStation?.nameRoman} ${nextStationNumberText}. ${transferLinesText('Please change here for ', '.')}`;

      case APP_THEME.JR_KYUSHU:
        if (stoppingState === 'ARRIVING') {
          return `We will soon be arriving at ${nextStation?.nameRoman}${nextStation?.groupId === selectedBound?.groupId && !isLoopLine ? ' terminal' : ''} ${nextStationNumberText}. ${
            transferLines.length
              ? `You can transfer to ${transferLines
                  .map((l, i, a) =>
                    a.length > 1 && a.length - 1 === i
                      ? `and the ${l.nameRoman}.`
                      : `the ${l.nameRoman}${a.length === 1 ? '' : ','}`
                  )
                  .join(' ')} at ${nextStation?.nameRoman}. ${
                  nextStation?.groupId === selectedBound?.groupId && !isLoopLine
                    ? `Thank you for using the ${currentLine.nameRoman}.`
                    : ''
                }`
              : ''
          }`;
        }
        return `${firstSpeech ? `This is a ${currentTrainType?.nameRoman?.replace(parenthesisRegexp, '') ?? 'Local'} train bound for ${boundForEn}. ` : ''}The next station is ${nextStation?.nameRoman} ${nextStationNumberText}${nextStation?.groupId === selectedBound?.groupId && !isLoopLine ? ' terminal' : ''}. ${
          transferLines.length
            ? `You can transfer to ${transferLines
                .map((l, i, a) =>
                  a.length > 1 && a.length - 1 === i
                    ? `and the ${l.nameRoman}`
                    : `the ${l.nameRoman}${a.length === 1 ? '' : ','}`
                )
                .join(' ')} at ${nextStation?.nameRoman}.`
            : ''
        }`;

      default:
        if (stoppingState === 'ARRIVING') {
          return `We will soon be arriving at ${nextStation?.nameRoman}${isNextStopTerminus ? ', terminal' : ''}.`;
        }
        return `The next station is ${nextStation?.nameRoman}${isNextStopTerminus ? ', terminal' : ''}.`;
    }
  };

  const jaText = getJapaneseText();
  const enText = getEnglishText();

  return [jaText.trim(), enText.trim()];
};
