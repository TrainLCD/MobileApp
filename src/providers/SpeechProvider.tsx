import React, { useCallback, useEffect } from 'react';
import { useRecoilValue } from 'recoil';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import useValueRef from '../hooks/useValueRef';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { getNextStationLinesWithoutCurrentLine } from '../utils/line';
import lineState from '../store/atoms/line';
import {
  getNextInboundStopStation,
  getNextOutboundStopStation,
} from '../utils/nextStation';
import getSlicedStations from '../utils/slicedStations';
import getCurrentLine from '../utils/currentLine';
import themeState from '../store/atoms/theme';
import AppTheme from '../models/Theme';
import { isJapanese } from '../translation';
import replaceSpecialChar from '../utils/replaceSpecialChar';
import { parenthesisRegexp } from '../constants/regexp';

type Props = {
  children: React.ReactNode;
};
const SpeechProvider: React.FC<Props> = ({ children }: Props) => {
  const { leftStations, headerState, trainType } = useRecoilValue(
    navigationState
  );
  const {
    selectedBound,
    station,
    stations,
    selectedDirection,
    arrived,
  } = useRecoilValue(stationState);
  const { selectedLine } = useRecoilValue(lineState);
  const { theme } = useRecoilValue(themeState);
  const prevStateText = useValueRef(headerState).current;

  const speech = useCallback(
    async ({ text, languageCode }: { text: string; languageCode?: string }) => {
      const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_API_KEY}`;
      const body = {
        input: {
          text,
        },
        voice: {
          languageCode: languageCode || 'ja-JP',
          name:
            languageCode === 'en-US' ? 'en-US-Wavenet-F' : 'ja-JP-Wavenet-B',
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speaking_rate: languageCode === 'en-US' ? 0.9 : 1,
          pitch: '0.00',
        },
      };
      const otherparam = {
        headers: {
          'content-type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(body),
        method: 'POST',
      };
      try {
        const data = await fetch(url, otherparam);
        const res = await data.json();
        const path = `${FileSystem.documentDirectory}/announce.aac`;
        await FileSystem.writeAsStringAsync(path, res.audioContent, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const sound = new Audio.Sound();
        await sound.loadAsync({
          uri: path,
        });
        await sound.playAsync();
      } catch (err) {
        console.error(err);
      }
    },
    []
  );

  const actualNextStation = leftStations[1];

  const nextOutboundStopStation = getNextOutboundStopStation(
    stations,
    actualNextStation,
    station
  );
  const nextInboundStopStation = getNextInboundStopStation(
    stations,
    actualNextStation,
    station
  );

  const nextStation =
    selectedDirection === 'INBOUND'
      ? nextInboundStopStation
      : nextOutboundStopStation;

  const prevStateIsDifferent =
    prevStateText.split('_')[0] !== headerState.split('_')[0];

  const joinedLineIds = trainType?.lines.map((l) => l.id);
  const currentLine = getCurrentLine(leftStations, joinedLineIds, selectedLine);

  const slicedStations = getSlicedStations({
    stations,
    currentStation: leftStations[0],
    isInbound: selectedDirection === 'INBOUND',
    arrived,
    currentLine,
  });

  useEffect(() => {
    const playAsync = async () => {
      const nextStopStationIndex = slicedStations.findIndex((s) => {
        if (s.id === leftStations[0]?.id) {
          return false;
        }
        return !s.pass;
      });

      const nextLines = getNextStationLinesWithoutCurrentLine(
        slicedStations,
        currentLine,
        nextStopStationIndex
      );

      const lines = nextLines.map((l) => l.nameK);
      const linesEn = nextLines.map((l, i, arr) =>
        arr.length - 1 === i
          ? // J-Rにしないとジュニアと読まれちゃう
            `and the ${l.nameR
              .replace(parenthesisRegexp, '')
              .replace('JR', 'J-R')}`
          : `the ${l.nameR
              .replace(parenthesisRegexp, '')
              .replace('JR', 'J-R')},`
      );

      // const belongingLines = stations.map((s) =>
      //   s.lines.find((l) => joinedLineIds?.find((il) => l.id === il))
      // );

      // const getFirstAnnounceJa = (): string => {
      //   const trainTypeName =
      //     trainType?.name?.replace(parenthesisRegexp, '') || '各駅停車';
      //   const reversedBelongingLines =
      //     selectedDirection === 'INBOUND'
      //       ? belongingLines
      //       : belongingLines.slice().reverse();
      //   const nextLineIndex = reversedBelongingLines.lastIndexOf(currentLine);
      //   const nextLine = reversedBelongingLines[nextLineIndex + 1];
      //   if (nextLine) {
      //     return `この電車は、${nextLine.name.replace(
      //       parenthesisRegexp,
      //       ''
      //     )}直通、${trainTypeName}、${selectedBound.name}方面ゆきです。`;
      //   }
      //   return `この電車は、${trainTypeName}、${selectedBound.name}方面ゆきです。`;
      // };

      // const getFirstAnnounceEn = (): string => {
      //   const trainTypeName =
      //     trainType?.nameR?.replace(parenthesisRegexp, '') || 'Local';
      //   const reversedBelongingLines =
      //     selectedDirection === 'INBOUND'
      //       ? belongingLines
      //       : belongingLines.slice().reverse();
      //   const nextLineIndex = reversedBelongingLines.lastIndexOf(currentLine);
      //   const nextLine = reversedBelongingLines[nextLineIndex + 1];
      //   if (nextLine) {
      //     switch (theme) {
      //       case AppTheme.TY:
      //         return `This train will merge and continue traveling at the ${trainTypeName} on the ${nextLine.nameR
      //           .replace('JR', 'J-R')
      //           .replace(parenthesisRegexp, '')} to ${replaceSpecialChar(
      //           selectedBound.nameR
      //         )}.`;
      //       case AppTheme.Yamanote:
      //       case AppTheme.Saikyo:
      //         return `This is a ${currentLine.nameR
      //           .replace('JR', 'J-R')
      //           .replace(
      //             parenthesisRegexp,
      //             ''
      //           )} train ${trainTypeName} for ${replaceSpecialChar(
      //           selectedBound.nameR
      //         )} via the ${nextLine.nameR
      //           .replace('JR', 'J-R')
      //           .replace(parenthesisRegexp, '')}.`;
      //       default:
      //         return `This train is going to the ${currentLine.nameR
      //           .replace('JR', 'J-R')
      //           .replace(parenthesisRegexp, '')}. The final destination is ${
      //           selectedBound.nameR
      //         }.`;
      //     }
      //   }
      //   switch (theme) {
      //     case AppTheme.TY:
      //       return `This train will merge and continue traveling at the ${trainTypeName} to ${replaceSpecialChar(
      //         selectedBound.nameR
      //       )}.`;
      //     case AppTheme.Yamanote:
      //     case AppTheme.Saikyo:
      //       return `This is a ${currentLine.nameR
      //         .replace('JR', 'J-R')
      //         .replace(
      //           parenthesisRegexp,
      //           ''
      //         )} train ${trainTypeName} for ${replaceSpecialChar(
      //         selectedBound.nameR
      //       )}.`;
      //     default:
      //       return `This train is going to the ${currentLine.nameR
      //         .replace('JR', 'J-R')
      //         .replace(parenthesisRegexp, '')}. The final destination is ${
      //         selectedBound.nameR
      //       }.`;
      //   }
      // };

      const getNextTextJaBase = (): string => {
        switch (theme) {
          case AppTheme.TokyoMetro:
            return `次は、${nextStation.nameK}です。`;
          case AppTheme.TY:
            return `次は、${nextStation.nameK}に止まります。`;
          case AppTheme.Yamanote:
          case AppTheme.Saikyo:
            return `次は、${nextStation.nameK}、${nextStation.nameK}。`;
          default:
            return `次は、${nextStation.nameK}です。`;
        }
      };

      const getNextTextJaWithTransfers = (): string => {
        switch (theme) {
          case AppTheme.TokyoMetro:
          case AppTheme.TY:
          case AppTheme.Yamanote:
          case AppTheme.Saikyo:
            return `${getNextTextJaBase()}${lines.join(
              '、'
            )}は、お乗り換えです。`;
          default:
            return `${getNextTextJaBase()}${lines.join(
              '、'
            )}は、お乗り換えです。`;
        }
      };

      const getApproachingTextJaBase = (): string => {
        switch (theme) {
          case AppTheme.TokyoMetro:
            return `まもなく${nextStation.nameK}です。`;
          case AppTheme.TY:
            return `まもなく${nextStation.nameK}に到着いたします。`;
          case AppTheme.Yamanote:
          case AppTheme.Saikyo:
            return `まもなく${nextStation.nameK}、${nextStation.nameK}。`;
          default:
            return `まもなく${nextStation.nameK}です。`;
        }
      };

      const getApproachingTextJaWithTransfers = (): string => {
        switch (theme) {
          case AppTheme.TokyoMetro:
          case AppTheme.TY:
          case AppTheme.Yamanote:
          case AppTheme.Saikyo:
            return `${getApproachingTextJaBase()}${lines.join(
              '、'
            )}は、お乗り換えです。`;
          default:
            return `${getApproachingTextJaBase()}${lines.join(
              '、'
            )}は、お乗り換えです。`;
        }
      };

      const nameR = replaceSpecialChar(nextStation?.nameR);

      const getNextTextEnBase = (): string => {
        switch (theme) {
          case AppTheme.TokyoMetro:
            return `The next stop is ${nameR}.`;
          case AppTheme.TY:
          case AppTheme.Yamanote:
          case AppTheme.Saikyo:
            return `The next station is ${nameR}.`;
          default:
            return `The next station is ${nameR}.`;
        }
      };

      const getNextTextEnWithTransfer = (): string => {
        switch (theme) {
          case AppTheme.TokyoMetro:
          case AppTheme.Yamanote:
          case AppTheme.Saikyo:
            return `${getNextTextEnBase()} Please change here for ${linesEn.join(
              ''
            )}`;
          case AppTheme.TY:
            return getNextTextEnBase();
          default:
            return `${getNextTextEnBase()} Please change here for ${linesEn.join(
              ''
            )}`;
        }
      };

      const getApproachingTextEnBase = (): string => {
        switch (theme) {
          case AppTheme.TokyoMetro:
            return `Arriving at ${nameR}.`;
          case AppTheme.TY:
            return `We will soon make a brief stop at ${nameR}.`;
          case AppTheme.Yamanote:
          case AppTheme.Saikyo:
            return getNextTextEnBase();
          default:
            return `Arriving at ${nameR}.`;
        }
      };

      const getApproachingTextEnWithTransfers = (): string => {
        switch (theme) {
          case AppTheme.TokyoMetro:
            return getApproachingTextEnBase();
          case AppTheme.TY:
            return `${getApproachingTextEnBase()}Passengers changing to the ${linesEn.join(
              ''
            )}, Please transfer at this station.`;
          default:
            return getApproachingTextEnBase();
        }
      };

      if (prevStateIsDifferent) {
        switch (headerState) {
          case 'NEXT':
            if (lines.length) {
              if (isJapanese) {
                speech({
                  // text: getFirstAnnounceJa() + getNextTextJaWithTransfers(),
                  text: getNextTextJaWithTransfers(),
                  languageCode: 'ja-JP',
                });
              } else {
                speech({
                  // text: getFirstAnnounceEn() + getNextTextEnWithTransfer(),
                  text: getNextTextEnWithTransfer(),
                  languageCode: 'en-US',
                });
              }
              return;
            }
            if (isJapanese) {
              speech({
                // text: getFirstAnnounceJa() + getNextTextJaBase(),
                text: getNextTextJaBase(),
                languageCode: 'ja-JP',
              });
            } else {
              speech({
                // text: getFirstAnnounceEn() + getNextTextEnBase(),
                text: getNextTextEnBase(),
                languageCode: 'en-US',
              });
            }
            break;
          case 'ARRIVING':
            if (lines.length) {
              if (isJapanese) {
                speech({
                  text: getApproachingTextJaWithTransfers(),
                  languageCode: 'ja-JP',
                });
              } else {
                speech({
                  text: getApproachingTextEnWithTransfers(),
                  languageCode: 'en-US',
                });
              }
              return;
            }
            if (isJapanese) {
              speech({
                text: getApproachingTextJaBase(),
                languageCode: 'ja-JP',
              });
            } else {
              speech({
                text: getApproachingTextEnBase(),
                languageCode: 'en-US',
              });
            }
            break;
          default:
            break;
        }
      }
    };

    playAsync();
  }, [
    currentLine,
    headerState,
    joinedLineIds,
    leftStations,
    nextStation,
    prevStateIsDifferent,
    prevStateText,
    selectedBound?.name,
    selectedBound?.nameR,
    selectedDirection,
    selectedLine,
    slicedStations,
    speech,
    stations,
    theme,
    trainType,
    trainType?.name,
    trainType?.nameR,
  ]);

  return <>{children}</>;
};

export default SpeechProvider;
