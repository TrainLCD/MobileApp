import React, { useCallback, useEffect } from 'react';
import { useRecoilValue } from 'recoil';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import {
  SynthesizeSpeechCommand,
  PollyClient,
  TextType,
} from '@aws-sdk/client-polly';
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
import replaceSpecialChar from '../utils/replaceSpecialChar';
import { parenthesisRegexp } from '../constants/regexp';
import capitalizeFirstLetter from '../utils/capitalizeFirstLetter';
import { isLoopLine } from '../utils/loopLine';

type Props = {
  children: React.ReactNode;
  enabled: boolean;
};

const pollyClient = new PollyClient({
  region: 'ap-northeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const SpeechProvider: React.FC<Props> = ({ children, enabled }: Props) => {
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
    async ({ textJa, textEn }: { textJa: string; textEn: string }) => {
      const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_API_KEY}`;
      const bodyJa = {
        input: {
          ssml: `<speak>${textJa}</speak>`,
        },
        voice: {
          languageCode: 'ja-JP',
          name: 'ja-JP-Wavenet-B',
        },
        audioConfig: {
          audioEncoding: 'mp3',
          effectsProfileId: ['large-automotive-class-device'],
          speaking_rate: 1.15,
          pitch: 0,
        },
      };

      try {
        const dataJa = await fetch(url, {
          headers: {
            'content-type': 'application/json; charset=UTF-8',
          },
          body: JSON.stringify(bodyJa),
          method: 'POST',
        });
        const resJa = await dataJa.json();

        const cmd = new SynthesizeSpeechCommand({
          OutputFormat: 'mp3',
          Text: `<speak>${textEn}</speak>`,
          TextType: TextType.SSML,
          VoiceId: 'Joanna',
        });
        const dataEn = await pollyClient.send(cmd);

        const pathJa = `${FileSystem.documentDirectory}/announce_ja.aac`;
        await FileSystem.writeAsStringAsync(pathJa, resJa.audioContent, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const soundJa = new Audio.Sound();
        await soundJa.loadAsync({
          uri: pathJa,
        });
        await soundJa.playAsync();
        soundJa.setOnPlaybackStatusUpdate(
          async (
            status: AVPlaybackStatus & {
              didJustFinish: boolean;
              isPlaying: boolean;
            }
          ) => {
            if (status.didJustFinish) {
              await soundJa.unloadAsync();

              const soundEn = new Audio.Sound();
              const pathEn = `${FileSystem.documentDirectory}/announce_en.aac`;

              const reader = new FileReader();
              reader.readAsDataURL(dataEn.AudioStream as Blob);

              reader.onload = async () => {
                await FileSystem.writeAsStringAsync(
                  pathEn,
                  (reader.result as string).split(',')[1],
                  {
                    encoding: FileSystem.EncodingType.Base64,
                  }
                );
                await soundEn.loadAsync({
                  uri: pathEn,
                });
                await soundEn.playAsync();

                soundEn.setOnPlaybackStatusUpdate(
                  async (
                    _status: AVPlaybackStatus & { didJustFinish: boolean }
                  ) => {
                    if (_status.didJustFinish || status.isPlaying) {
                      await soundEn.stopAsync();
                      await soundEn.unloadAsync();
                    }
                  }
                );
              };
            }
          }
        );
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
    if (!enabled) {
      return;
    }

    const playAsync = async () => {
      const nextStopStationIndex = slicedStations.findIndex((s) => {
        if (s.id === leftStations[0]?.id) {
          return false;
        }
        return !s.pass;
      });
      const afterNextStationIndex = slicedStations.findIndex((s) => {
        if (s.id === leftStations[0]?.id) {
          return false;
        }
        if (s.id === nextStation?.id) {
          return false;
        }
        return !s.pass;
      });
      const afterNextStation = slicedStations[afterNextStationIndex];

      const betweenAfterNextStation = slicedStations.slice(
        nextStopStationIndex + 1,
        afterNextStationIndex
      );
      const betweenNextStation = slicedStations.slice(1, nextStopStationIndex);
      const hasPassStations =
        !!betweenAfterNextStation.length || !!betweenNextStation.length;

      const nextLines = getNextStationLinesWithoutCurrentLine(
        slicedStations,
        currentLine,
        nextStopStationIndex
      );

      const lines = nextLines.map((l) => l.nameK);
      const linesEn = nextLines
        // J-Rにしないとジュニアと読まれちゃう
        .map((l) => l.nameR.replace(parenthesisRegexp, '').replace('JR', 'J-R'))
        .filter((nameR, idx, arr) => arr.indexOf(nameR) === idx)
        .map((nameR, i, arr) =>
          arr.length - 1 === i ? `and the ${nameR}` : `the ${nameR},`
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

      const belongingLines = stations.map((s) =>
        s.lines.find((l) => joinedLineIds?.find((il) => l.id === il))
      );

      const trainTypeName =
        trainType?.name?.replace(parenthesisRegexp, '') || '各駅停車';
      const trainTypeNameEn =
        trainType?.nameR?.replace(parenthesisRegexp, '') || 'Local';
      const reversedBelongingLines =
        selectedDirection === 'INBOUND'
          ? belongingLines
          : belongingLines.slice().reverse();
      const nextLineIndex = reversedBelongingLines.lastIndexOf(currentLine);
      const nextLine = reversedBelongingLines[nextLineIndex + 1];
      const allStops = slicedStations.filter((s) => {
        if (s.id === leftStations[0]?.id) {
          return false;
        }
        return !s.pass;
      });

      const getHasTerminus = (hops: number) =>
        allStops.slice(0, hops).length < hops;

      const getNextTextJaExpress = (terminal: boolean): string => {
        switch (theme) {
          case AppTheme.TokyoMetro:
          case AppTheme.Saikyo:
          case AppTheme.TY:
          case AppTheme.Yamanote:
            return `${
              currentLine?.nameK
            }をご利用くださいまして、ありがとうございます。この電車は、${allStops
              .slice(0, 3)
              .map((s, i, a) =>
                a.length - 1 !== i ? `${s.nameK}、` : s.nameK
              )}方面、${
              nextLine ? `${nextLine?.nameK}直通、` : ''
            }${trainTypeName}、${selectedBound?.nameK}行きです。次は${
              nextStation?.nameK
            }、${nextStation?.nameK}${terminal ? '、終点' : ''}です。${
              nextStation?.nameK
            }の次は、${afterNextStation?.nameK}に停まります。${
              betweenAfterNextStation.length
                ? `${betweenAfterNextStation.map((sta, idx, arr) =>
                    arr.length - 1 !== idx ? `${sta.nameK}、` : sta.nameK
                  )}へおいでのお客様${lines.length ? 'と、' : ''}`
                : ''
            }${lines.map((l, i, arr) =>
              arr.length !== i ? `${l}、` : l
            )}はお乗り換えください。`;
          case AppTheme.JRWest:
            return `今日も、${
              currentLine?.nameK
            }をご利用くださいまして、ありがとうございます。この電車は、${trainTypeName}、${
              selectedBound?.nameK
            }行きです。${allStops
              .slice(0, 5)
              .map((s) =>
                s.id !== selectedBound?.id ? `${s.nameK}、` : `終点、${s.nameK}`
              )}の順に止まります。${
              getHasTerminus(5)
                ? ''
                : `${
                    allStops
                      .slice(0, 5)
                      .filter((s) => s)
                      .reverse()[0]?.nameK
                  }から先は、後ほどご案内いたします。`
            }次は${nextStation?.nameK}、${nextStation?.nameK}です。`;
          default:
            return '';
        }
      };
      const getNextTextEnExpress = (terminal: boolean): string => {
        switch (theme) {
          case AppTheme.TokyoMetro:
          case AppTheme.Saikyo:
          case AppTheme.TY:
          case AppTheme.Yamanote:
            return `This train is bound for ${
              selectedBound?.nameR
            }, the ${trainTypeNameEn} on the ${currentLine?.nameR
              .replace('JR', 'J-R')
              .replace(parenthesisRegexp, '')}. The next station is ${
              nextStation?.nameR
            } ${terminal ? 'terminal' : ''}. The stop after ${
              nextStation?.nameR
            } is ${afterNextStation?.nameR}. ${
              betweenAfterNextStation.length
                ? 'For stations in between, please change trains at the next stop,'
                : ''
            } ${linesEn.length ? `and for the ${linesEn.join('')}` : ''}`;
          case AppTheme.JRWest:
            return `Thank you for using ${currentLine?.nameR
              .replace('JR', 'J-R')
              .replace(
                parenthesisRegexp,
                ''
              )}. This is the ${trainTypeNameEn} service bound for ${
              selectedBound?.nameR
            }. We will be stopping at ${allStops
              .slice(0, 5)
              .map((s, i, a) =>
                a.length - 1 !== i ? `${s.nameR}, ` : s.nameR
              )}${getHasTerminus(5) ? 'terminal' : ''}. ${
              getHasTerminus(5)
                ? ''
                : `Stops after ${
                    allStops
                      .slice(0, 5)
                      .filter((s) => s)
                      .reverse()[0]?.nameR
                  }, will be anounced later`
            }. The next stop is ${nextStation?.nameR}.`;
          default:
            return '';
        }
      };

      const getNextTextJaBase = (terminal: boolean): string => {
        switch (theme) {
          case AppTheme.TokyoMetro:
            return `次は、<break strength="weak"/>${nextStation?.nameK}${
              terminal ? '<break strength="weak"/>終点' : ''
            }です。`;
          case AppTheme.JRWest:
            return `次は${terminal ? '終点' : ''}、<break strength="weak"/>${
              nextStation?.nameK
            }、${nextStation?.nameK}です。`;
          case AppTheme.TY:
            return `次は、${
              terminal ? '<break strength="weak"/>終点' : ''
            }<break strength="weak"/>${nextStation?.nameK}に止まります。`;
          case AppTheme.Yamanote:
          case AppTheme.Saikyo:
            return `次は、${
              terminal ? '<break strength="weak"/>終点' : ''
            }<break strength="weak"/>${nextStation?.nameK}、${
              nextStation?.nameK
            }。`;
          default:
            return `次は、<break strength="weak"/>${nextStation?.nameK}${
              terminal ? '<break strength="weak"/>終点' : ''
            }です。`;
        }
      };

      const getNextTextJaWithTransfers = (terminal: boolean): string => {
        switch (theme) {
          case AppTheme.TokyoMetro:
          case AppTheme.TY:
          case AppTheme.Yamanote:
          case AppTheme.Saikyo:
          case AppTheme.JRWest:
            return `${getNextTextJaBase(
              terminal
            )}<break strength="medium"/>${lines.join(
              '、'
            )}は、お乗り換えです。`;
          default:
            return `${getNextTextJaBase(
              terminal
            )}<break strength="medium"/>${lines.join(
              '、'
            )}は、お乗り換えです。`;
        }
      };

      const getApproachingTextJaBase = (terminal: boolean): string => {
        switch (theme) {
          case AppTheme.TokyoMetro:
            return `まもなく<break strength="weak"/>${nextStation?.nameK}${
              terminal ? 'この電車の終点' : ''
            }です。`;
          case AppTheme.TY:
            return `まもなく<break strength="weak"/>${nextStation?.nameK}に到着いたします。`;
          case AppTheme.Yamanote:
          case AppTheme.Saikyo:
            return `まもなく${terminal ? '終点' : ''}<break strength="weak"/>${
              nextStation?.nameK
            }、${nextStation?.nameK}。${
              terminal
                ? `本日も、${currentLine?.nameK}をご利用くださいまして、ありがとうございました。`
                : ''
            }`;
          default:
            return `まもなく<break strength="weak"/>${nextStation?.nameK}${
              terminal ? 'この電車の終点' : ''
            }です。`;
        }
      };

      const getApproachingTextJaWithTransfers = (terminal: boolean): string => {
        switch (theme) {
          case AppTheme.TokyoMetro:
          case AppTheme.TY:
          case AppTheme.Yamanote:
          case AppTheme.Saikyo:
            return `${getApproachingTextJaBase(
              terminal
            )}<break strength="weak"/>${lines.join('、')}は、お乗り換えです。`;
          default:
            return `${getApproachingTextJaBase(
              terminal
            )}<break strength="weak"/>${lines.join('、')}は、お乗り換えです。`;
        }
      };

      const nameR = replaceSpecialChar(nextStation?.nameR)
        ?.split(/(\s+)/)
        .map((c) => capitalizeFirstLetter(c.toLowerCase()))
        .join('');

      const getNextTextEnBase = (terminal: boolean): string => {
        switch (theme) {
          case AppTheme.TokyoMetro:
          case AppTheme.JRWest:
            return `The next stop is<break strength="weak"/>${nameR} ${
              terminal ? 'terminal' : ''
            }.`;
          case AppTheme.TY:
          case AppTheme.Yamanote:
          case AppTheme.Saikyo:
            return `The next station is<break strength="weak"/>${nameR} ${
              terminal ? 'terminal' : ''
            }.`;
          default:
            return `The next station is<break strength="weak"/>${nameR} ${
              terminal ? 'terminal' : ''
            }.`;
        }
      };

      const getNextTextEnWithTransfer = (terminal: boolean): string => {
        if (!linesEn.length) {
          return getNextTextEnBase(terminal);
        }

        switch (theme) {
          case AppTheme.TokyoMetro:
          case AppTheme.Yamanote:
          case AppTheme.Saikyo:
            return `${getNextTextEnBase(
              terminal
            )}<break strength="weak"/>Please change here for ${linesEn.join(
              ''
            )}.`;
          case AppTheme.TY:
            return `${getNextTextEnBase(
              terminal
            )}<break strength="weak"/>Passengers changing to the ${linesEn.join(
              ''
            )}, Please transfer at this station.`;
          default:
            return `${getNextTextEnBase(
              terminal
            )}<break strength="weak"/>Please change here for ${linesEn.join(
              ''
            )}`;
        }
      };

      const getApproachingTextEnBase = (terminal: boolean): string => {
        switch (theme) {
          case AppTheme.TokyoMetro:
            return `Arriving at<break strength="weak"/>${nameR}.`;
          case AppTheme.TY:
            return `We will soon make a brief stop at<break strength="weak"/>${nameR}.`;
          case AppTheme.Yamanote:
          case AppTheme.Saikyo:
            return getNextTextEnBase(terminal);
          case AppTheme.JRWest:
            return `We will soon be making a brief stop at ${nameR}.`;
          default:
            return `Arriving at<break strength="weak"/>${nameR}.`;
        }
      };

      const getApproachingTextEnWithTransfers = (terminal: boolean): string => {
        switch (theme) {
          case AppTheme.TokyoMetro:
            return `${getApproachingTextEnBase(
              terminal
            )}<break strength="weak"/>Please change here for ${linesEn.join(
              ''
            )}`;
          case AppTheme.TY:
            return `${getApproachingTextEnBase(
              terminal
            )}<break strength="weak"/>Passengers changing to the ${linesEn.join(
              ''
            )}<break strength="weak"/>Please transfer at this station.`;
          case AppTheme.Yamanote:
          case AppTheme.Saikyo:
            return `${getApproachingTextEnBase(
              terminal
            )}<break strength="weak"/>Please change here for ${linesEn.join(
              ''
            )}<break strength="weak"/>${
              terminal
                ? 'Thank you for traveling with us. And we look forward to serving you again!'
                : ''
            }`;
          default:
            return `${getApproachingTextEnBase(
              terminal
            )}<break strength="weak"/>Please change here for ${linesEn.join(
              ''
            )}`;
        }
      };

      const nextStationIndex = stations.findIndex(
        (s) => s.id === nextStation?.id
      );
      const nextStationIsTerminus =
        !isLoopLine(currentLine) && selectedDirection === 'INBOUND'
          ? stations.length - 1 === nextStationIndex
          : nextStationIndex === 0;

      const loopLine = isLoopLine(currentLine);

      if (prevStateIsDifferent) {
        switch (headerState.split('_')[0]) {
          case 'NEXT':
            if (lines.length && loopLine) {
              speech({
                textJa: getNextTextJaWithTransfers(nextStationIsTerminus),
                textEn: getNextTextEnWithTransfer(nextStationIsTerminus),
              });
              return;
            }
            if (hasPassStations) {
              speech({
                textJa: getNextTextJaExpress(nextStationIsTerminus),
                textEn: getNextTextEnExpress(nextStationIsTerminus),
              });
              return;
            }
            speech({
              textJa: getNextTextJaBase(nextStationIsTerminus),
              textEn: getNextTextEnBase(nextStationIsTerminus),
            });
            break;
          case 'ARRIVING':
            if (loopLine) {
              return;
            }

            if (lines.length) {
              speech({
                textJa: getApproachingTextJaWithTransfers(
                  nextStationIsTerminus
                ),
                textEn: getApproachingTextEnWithTransfers(
                  nextStationIsTerminus
                ),
              });
              break;
            }
            speech({
              textJa: getApproachingTextJaBase(nextStationIsTerminus),
              textEn: getApproachingTextEnBase(nextStationIsTerminus),
            });
            break;
          default:
            break;
        }
      }
    };

    playAsync();
  }, [
    currentLine,
    enabled,
    headerState,
    joinedLineIds,
    leftStations,
    nextStation?.id,
    nextStation?.nameK,
    nextStation?.nameR,
    prevStateIsDifferent,
    selectedBound?.id,
    selectedBound?.nameK,
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
