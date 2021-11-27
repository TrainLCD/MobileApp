import {
  PollyClient,
  SynthesizeSpeechCommand,
  TextType,
} from '@aws-sdk/client-polly';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import SSMLBuilder from 'ssml-builder';
import { parenthesisRegexp } from '../constants/regexp';
import useAppState from '../hooks/useAppState';
import useConnectedLines from '../hooks/useConnectedLines';
import useConnectivity from '../hooks/useConnectivity';
import useCurrentLine from '../hooks/useCurrentLine';
import useValueRef from '../hooks/useValueRef';
import { APITrainType } from '../models/StationAPI';
import AppTheme from '../models/Theme';
import navigationState from '../store/atoms/navigation';
import speechState from '../store/atoms/speech';
import stationState from '../store/atoms/station';
import themeState from '../store/atoms/theme';
import capitalizeFirstLetter from '../utils/capitalizeFirstLetter';
import getNextStation from '../utils/getNextStation';
import omitJRLinesIfThresholdExceeded from '../utils/jr';
import { getNextStationLinesWithoutCurrentLine } from '../utils/line';
import { getIsLoopLine } from '../utils/loopLine';
import {
  getNextInboundStopStation,
  getNextOutboundStopStation,
} from '../utils/nextStation';
import replaceSpecialChar from '../utils/replaceSpecialChar';
import getSlicedStations from '../utils/slicedStations';

type Props = {
  children: React.ReactNode;
};

const pollyClient = new PollyClient({
  region: 'ap-northeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const SpeechProvider: React.FC<Props> = ({ children }: Props) => {
  const { leftStations, headerState, trainType } =
    useRecoilValue(navigationState);
  const { selectedBound, station, stations, selectedDirection, arrived } =
    useRecoilValue(stationState);
  const { theme } = useRecoilValue(themeState);
  const prevStateText = useValueRef(headerState).current;
  const { enabled, muted } = useRecoilValue(speechState);
  const soundJa = useMemo(() => new Audio.Sound(), []);
  const soundEn = useMemo(() => new Audio.Sound(), []);
  const appState = useAppState();

  const typedTrainType = trainType as APITrainType;

  const connectedLines = useConnectedLines();

  const unloadEnSpeech = useCallback(async () => {
    const enStatus = await soundEn.getStatusAsync();
    if (enStatus.isLoaded) {
      await soundEn.stopAsync();
      await soundEn.unloadAsync();
    }
  }, [soundEn]);
  const unloadJaSpeech = useCallback(async () => {
    const jaStatus = await soundJa.getStatusAsync();

    if (jaStatus.isLoaded) {
      await soundJa.stopAsync();
      await soundJa.unloadAsync();
    }
  }, [soundJa]);

  const unloadAllSpeech = useCallback(async () => {
    await unloadEnSpeech();
    await unloadJaSpeech();
  }, [unloadEnSpeech, unloadJaSpeech]);

  useEffect(() => {
    const unloadAsync = async () => {
      // もしかしたら `appState !== 'active` のほうが良いかもしれない
      if (appState === 'background') {
        await unloadAllSpeech();
      }
    };
    unloadAsync();
  }, [appState, unloadAllSpeech]);

  useEffect(() => {
    const unloadAsync = async () => {
      if (headerState.split('_')[0] === 'CURRENT') {
        // 日本語放送だけは最後まで流す
        await unloadEnSpeech();
      }
    };
    unloadAsync();
  }, [headerState, unloadEnSpeech]);

  useEffect(() => {
    const muteAsync = async () => {
      if (muted) {
        await unloadAllSpeech();
      }
    };
    muteAsync();
  }, [muted, unloadAllSpeech]);

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
    [soundEn, soundJa]
  );

  const actualNextStation = getNextStation(leftStations, station);

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

  const currentLine = useCurrentLine();
  const currentTrainType = useMemo(
    () =>
      typedTrainType?.allTrainTypes.find(
        (tt) => tt.line.id === currentLine?.id
      ),
    [currentLine?.id, typedTrainType?.allTrainTypes]
  );

  const slicedStations = getSlicedStations({
    stations,
    currentStation: station,
    isInbound: selectedDirection === 'INBOUND',
    arrived,
    currentLine,
    trainType: currentTrainType,
  });

  const isInternetAvailable = useConnectivity();

  useEffect(() => {
    if (!enabled || !isInternetAvailable) {
      return;
    }

    const playAsync = async () => {
      const nextStopStationIndex = slicedStations.findIndex((s) => {
        if (s.id === station?.id) {
          return false;
        }
        return !s.pass;
      });
      const afterNextStationIndex = slicedStations.findIndex((s) => {
        if (s.id === station?.id) {
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
      const betweenNextStation = slicedStations
        .slice(0, nextStopStationIndex)
        .filter((s) => s.groupId !== station?.groupId);

      const nextLines = omitJRLinesIfThresholdExceeded(
        getNextStationLinesWithoutCurrentLine(
          slicedStations,
          currentLine,
          nextStopStationIndex
        )
      );

      const lines = nextLines
        .map((l) => l.nameK)
        .filter((nameK) => nameK !== currentLine?.nameK);
      const linesEn = nextLines
        // J-Rにしないとジュニアと読まれちゃう
        .map((l) => l.nameR.replace(parenthesisRegexp, '').replace('JR', 'J-R'))
        .filter((nameR, idx, arr) => arr.indexOf(nameR) === idx)
        .filter((nameR) => nameR !== currentLine?.nameR)
        .map((nameR, i, arr) =>
          arr.length - 1 === i ? `and the ${nameR}` : `the ${nameR},`
        );

      const localJaNoun = theme === AppTheme.JRWest ? '普通' : '各駅停車';
      const trainTypeName =
        currentTrainType?.name?.replace(parenthesisRegexp, '') || localJaNoun;
      const trainTypeNameEn =
        currentTrainType?.nameR?.replace(parenthesisRegexp, '') || 'Local';

      const allStops = slicedStations.filter((s) => {
        if (s.id === station?.id) {
          return false;
        }
        return !s.pass;
      });

      const getHasTerminus = (hops: number) =>
        allStops.slice(0, hops).length < hops;

      // 次の駅のすべての路線に対して接続路線が存在する場合、次の鉄道会社に接続する判定にする
      const isNextLineOperatedOtherCompany =
        nextStation?.lines
          // 同じ会社の路線をすべてしばく
          ?.filter((l) => l.companyId !== currentLine?.companyId)
          ?.filter(
            (l) =>
              connectedLines.findIndex((cl) => cl.companyId === l.companyId) !==
              -1
          )
          // 池袋対策 次の次の駅の路線に選択中の路線がある場合、会社が変わっている判定をしない
          ?.filter(
            (l) =>
              afterNextStation.lines.findIndex((al) => al.id === l.id) !== -1
          )?.length > 0;

      const getNextTextJaExpress = (): string => {
        const ssmlBuiler = new SSMLBuilder();

        const bounds = allStops
          .slice(2, 5)
          .map((s, i, a) => (a.length - 1 !== i ? `${s.nameK}、` : s.nameK));

        switch (theme) {
          case AppTheme.TokyoMetro:
          case AppTheme.Saikyo:
          case AppTheme.TY:
          case AppTheme.Yamanote: {
            const base = ssmlBuiler
              .say(currentLine?.nameK)
              .say('をご利用くださいまして、ありがとうございます。この電車は、')
              .say(bounds.length ? bounds.join('') : '')
              .say(bounds.length ? '方面、' : '')
              .say(
                connectedLines.length
                  ? `${connectedLines.map((nl) => nl.nameK).join('、')}直通、`
                  : ''
              )
              .say(`${trainTypeName}、`)
              .say(selectedBound?.nameK)
              .say('ゆきです。次は、')
              .say(`${nextStation?.nameK}、`)
              .say(nextStation?.nameK)
              .say(getHasTerminus(2) ? '、終点' : '')
              .say('です。');

            if (!afterNextStation) {
              return base
                .say(
                  lines.length
                    ? `${lines.map((l, i, arr) =>
                        arr.length !== i ? `${l}、` : l
                      )}はお乗り換えください。`
                    : ''
                )
                .ssml(true);
            }

            return base
              .say(nextStation?.nameK)
              .say('の次は、')
              .say(getHasTerminus(3) ? '終点、' : '')
              .say(afterNextStation?.nameK)
              .say('に停まります。')
              .say(
                betweenAfterNextStation.length
                  ? `${betweenAfterNextStation.map((sta, idx, arr) =>
                      arr.length - 1 !== idx ? `${sta.nameK}、` : sta.nameK
                    )}へおいでのお客様${
                      lines.length ? 'と、' : 'はお乗り換えください。'
                    }`
                  : ''
              )
              .say(
                lines.length
                  ? `${lines.map((l, i, arr) =>
                      arr.length !== i ? `${l}、` : l
                    )}はお乗り換えください。`
                  : ''
              )
              .ssml(true);
          }
          case AppTheme.JRWest: {
            const base = ssmlBuiler
              .say('今日も、')
              .say(currentLine?.nameK)
              .say('をご利用くださいまして、ありがとうございます。この電車は、')
              .say(`${trainTypeName}、`)
              .say(selectedBound?.nameK)
              .say('ゆきです。');
            if (!afterNextStation) {
              return base
                .say('次は、')
                .say(`${nextStation?.nameK}、`)
                .say(nextStation?.nameK)
                .say('です。')
                .ssml(true);
            }
            return base
              .say(
                allStops
                  .slice(0, 5)
                  .map((s) =>
                    s.id !== selectedBound?.id
                      ? `${s.nameK}、`
                      : `終点、${s.nameK}`
                  )
                  .join('')
              )
              .say('の順に止まります。')
              .say(
                getHasTerminus(6)
                  ? ''
                  : `${
                      allStops
                        .slice(0, 5)
                        .filter((s) => s)
                        .reverse()[0]?.nameK
                    }から先は、後ほどご案内いたします。`
              )
              .say('次は、')
              .say(`${nextStation?.nameK}、`)
              .say(nextStation?.nameK)
              .say('です。')
              .ssml(true);
          }
          default:
            return '';
        }
      };
      const getNextTextEnExpress = (): string => {
        const ssmlBuiler = new SSMLBuilder();

        if (theme === AppTheme.TY && connectedLines[0]) {
          return ssmlBuiler
            .say('This train will merge and continue traveling as a')
            .say(trainTypeNameEn)
            .say('train, on the')
            .say(connectedLines[0].nameR)
            .pause('100ms')
            .say('to')
            .say(selectedBound?.nameR)
            .pause('100ms')
            .say('The next station is')
            .say(nextStation?.nameR)
            .say(getHasTerminus(2) ? 'terminal.' : '.')
            .ssml(true);
        }

        switch (theme) {
          case AppTheme.TokyoMetro:
          case AppTheme.Saikyo:
          case AppTheme.TY:
          case AppTheme.Yamanote: {
            const base = ssmlBuiler
              .say('This train is bound for')
              .say(selectedBound?.nameR)
              .pause('100ms')
              .say('the')
              .say(trainTypeNameEn)
              .say('on the')
              .say(
                `${currentLine?.nameR
                  .replace('JR', 'J-R')
                  .replace(parenthesisRegexp, '')}.`
              )
              .say('The next station is')
              .say(nextStation?.nameR)
              .say(getHasTerminus(2) ? 'terminal.' : '.');

            if (!afterNextStation) {
              return base
                .say(
                  linesEn.length
                    ? `Please change here for ${linesEn.join('')}`
                    : ''
                )
                .ssml(true);
            }
            return base
              .say('The stop after')
              .say(nextStation?.nameR)
              .say('is')
              .say(afterNextStation?.nameR)
              .say(getHasTerminus(3) ? 'terminal.' : '.')
              .say(
                betweenAfterNextStation.length
                  ? 'For stations in between, please change trains at the next stop,'
                  : ''
              )
              .say(linesEn.length ? `and for ${linesEn.join('')}` : '')
              .ssml(true)
              .replace(
                nextStation?.nameR,
                `<lang xml:lang="ja-JP">${nextStation?.nameR}</lang>`
              )
              .replace(
                afterNextStation?.nameR,
                `<lang xml:lang="ja-JP">${afterNextStation?.nameR}</lang>`
              )
              .replace(
                selectedBound?.nameR,
                `<lang xml:lang="ja-JP">${selectedBound?.nameR}</lang>`
              );
          }
          case AppTheme.JRWest: {
            const base = ssmlBuiler
              .say('Thank you for using')
              .say(
                currentLine?.nameR
                  .replace('JR', 'J-R')
                  .replace(parenthesisRegexp, '')
              )
              .say('. This is the')
              .say(trainTypeNameEn)
              .say('service bound for')
              .say(`${selectedBound?.nameR}.`);
            if (!afterNextStation) {
              return base
                .say('The next stop is')
                .say(nextStation?.nameR)
                .ssml(true)
                .replace(
                  selectedBound?.nameR,
                  `<lang xml:lang="ja-JP">${selectedBound?.nameR}</lang>`
                );
            }
            const prefix = base.say('We will be stopping at').ssml(true);
            const suffixBuilder = new SSMLBuilder();
            const suffix = suffixBuilder
              .say(getHasTerminus(6) ? 'terminal.' : '.')
              .say(
                getHasTerminus(6)
                  ? ''
                  : `Stops after ${
                      allStops
                        .slice(0, 5)
                        .filter((s) => s)
                        .reverse()[0]?.nameR
                    }, will be anounced later.`
              )
              .say('The next stop is')
              .say(nextStation?.nameR)
              .ssml(true)
              .replace(
                nextStation?.nameR,
                `<lang xml:lang="ja-JP">${nextStation?.nameR}</lang>`
              )
              .replace(
                allStops
                  .slice(0, 5)
                  .filter((s) => s)
                  .reverse()[0]?.nameR,
                `<lang xml:lang="ja-JP">${
                  allStops
                    .slice(0, 5)
                    .filter((s) => s)
                    .reverse()[0]?.nameR
                }</lang>`
              );

            return `${prefix} ${allStops
              .slice(0, 5)
              .map((s, i, a) =>
                a.length - 1 !== i
                  ? `<lang xml:lang="ja-JP">${s.nameR}</lang>, `
                  : `<lang xml:lang="ja-JP">${s.nameR}</lang>`
              )
              .join('')} ${suffix}`;
          }
          default:
            return '';
        }
      };

      const getNextTextJaBase = (): string => {
        const ssmlBuiler = new SSMLBuilder();

        switch (theme) {
          case AppTheme.TokyoMetro:
            return ssmlBuiler
              .say('次は、')
              .pause('100ms')
              .say(nextStation?.nameK)
              .pause(getHasTerminus(2) ? '100ms' : '0s')
              .say(getHasTerminus(2) ? '終点' : '')
              .say('です。')
              .ssml(true);
          case AppTheme.JRWest:
            return ssmlBuiler
              .say('次は、')
              .say(getHasTerminus(2) ? '終点' : '')
              .pause('100ms')
              .say(nextStation?.nameK)
              .pause('100ms')
              .say(nextStation?.nameK)
              .say('です。')
              .ssml(true);
          case AppTheme.TY:
            return ssmlBuiler
              .say(currentLine?.nameK)
              .say('をご利用くださいまして、ありがとうございます。この電車は、')
              .say(
                connectedLines.length
                  ? `${connectedLines.map((nl) => nl.nameK).join('、')}直通、`
                  : ''
              )
              .say(`${trainTypeName}、`)
              .say(selectedBound?.nameK)
              .say('ゆきです。次は、')
              .say(`${nextStation?.nameK}、`)
              .say(nextStation?.nameK)
              .say(getHasTerminus(2) ? '、終点' : '')
              .say('です。')
              .ssml(true);

          case AppTheme.Yamanote:
          case AppTheme.Saikyo:
            return ssmlBuiler
              .say('次は、')
              .pause('100ms')
              .say(getHasTerminus(2) ? '終点' : '')
              .pause(getHasTerminus(2) ? '100ms' : '0s')
              .say(nextStation?.nameK)
              .pause('100ms')
              .say(nextStation?.nameK)
              .ssml(true);
          default:
            return '';
        }
      };

      const getNextTextJaWithTransfers = (): string => {
        const ssmlBuiler = new SSMLBuilder();

        switch (theme) {
          case AppTheme.TokyoMetro:
          case AppTheme.TY:
          case AppTheme.Yamanote:
          case AppTheme.Saikyo:
          case AppTheme.JRWest:
            return `${getNextTextJaBase()} ${ssmlBuiler
              .pause('100ms')
              .say(lines.join('、'))
              .say('は、お乗り換えです。')
              .ssml(true)}`;
          default:
            return '';
        }
      };

      const getApproachingTextJaBase = (): string => {
        const ssmlBuiler = new SSMLBuilder();

        switch (theme) {
          case AppTheme.TokyoMetro: {
            const base = ssmlBuiler
              .say('まもなく')
              .pause('100ms')
              .say(nextStation?.nameK)
              .say(getHasTerminus(2) ? 'この電車の終点' : '')
              .say('です。');
            if (getHasTerminus(2) || isNextLineOperatedOtherCompany) {
              base
                .say(
                  `${currentLine?.company?.nameR}をご利用いただきまして、ありがとうございました。`
                )
                .ssml(true);
            }
            return base.ssml(true);
          }
          case AppTheme.TY: {
            const base = ssmlBuiler
              .say('まもなく')
              .pause('100ms')
              .say(getHasTerminus(2) ? 'この電車の終点' : '')
              .pause(getHasTerminus(2) ? '100ms' : '0s')
              .say(nextStation?.nameK)
              .say('に到着いたします。');

            if (getHasTerminus(2) || isNextLineOperatedOtherCompany) {
              base
                .say(
                  `${currentLine?.company?.nameR}をご利用いただきまして、ありがとうございました。`
                )
                .ssml(true);
            }
            return base.ssml(true);
          }
          case AppTheme.Yamanote:
          case AppTheme.Saikyo: {
            const base = ssmlBuiler
              .say('まもなく')
              .say(getHasTerminus(2) ? '終点' : '')
              .pause('100ms')
              .say(nextStation?.nameK)
              .pause('100ms')
              .say(`${nextStation?.nameK}。`);
            if (getHasTerminus(2) || isNextLineOperatedOtherCompany) {
              base
                .say('本日も、')
                .pause('100ms')
                .say(currentLine?.company.nameR)
                .say('をご利用くださいまして、ありがとうございました。')
                .ssml(true);
            }
            return base.ssml(true);
          }
          default:
            return '';
        }
      };

      const getApproachingTextJaWithTransfers = (): string => {
        const ssmlBuiler = new SSMLBuilder();

        switch (theme) {
          case AppTheme.TokyoMetro:
          case AppTheme.TY:
          case AppTheme.Yamanote:
          case AppTheme.Saikyo:
          case AppTheme.JRWest:
            return `${getApproachingTextJaBase()} ${ssmlBuiler
              .pause('100ms')
              .say(lines.join('、'))
              .say('は、お乗り換えです')
              .ssml(true)}`;
          default:
            return '';
        }
      };

      const nameR = replaceSpecialChar(nextStation?.nameR)
        ?.split(/(\s+)/)
        .map((c) => capitalizeFirstLetter(c.toLowerCase()))
        .join('');

      const getNextTextEnBase = (): string => {
        const ssmlBuiler = new SSMLBuilder();

        switch (theme) {
          case AppTheme.TokyoMetro:
          case AppTheme.JRWest:
            return ssmlBuiler
              .say('The next stop is')
              .pause('100ms')
              .say(nameR)
              .say(getHasTerminus(2) ? 'terminal.' : '.')
              .ssml(true)
              .replace(nameR, `<lang xml:lang="ja-JP">${nameR}</lang>`);
          case AppTheme.TY:
          case AppTheme.Yamanote:
          case AppTheme.Saikyo:
            return ssmlBuiler
              .say('The next station is')
              .pause('100ms')
              .say(nameR)
              .say(getHasTerminus(2) ? 'terminal.' : '.')
              .ssml(true)
              .replace(nameR, `<lang xml:lang="ja-JP">${nameR}</lang>`);
          default:
            return '';
        }
      };

      const getNextTextEnWithTransfers = (): string => {
        if (!linesEn.length) {
          return getNextTextEnBase();
        }
        const ssmlBuiler = new SSMLBuilder();

        switch (theme) {
          case AppTheme.TokyoMetro:
          case AppTheme.Yamanote:
          case AppTheme.Saikyo:
          case AppTheme.JRWest:
            return `${getNextTextEnBase()} ${ssmlBuiler
              .pause('100ms')
              .say('Please change here for')
              .say(linesEn.join(''))
              .ssml(true)}`;
          case AppTheme.TY:
            return `${getNextTextEnBase()} ${ssmlBuiler
              .pause('100ms')
              .say('Passengers changing to')
              .say(linesEn.join(''))
              .say(', Please transfer at this station.')
              .ssml(true)}`;
          default:
            return '';
        }
      };

      const getApproachingTextEnBase = (): string => {
        const ssmlBuiler = new SSMLBuilder();

        switch (theme) {
          case AppTheme.TokyoMetro:
            return ssmlBuiler
              .say('Arriving at')
              .pause('100ms')
              .say(nameR)
              .ssml(true)
              .replace(nameR, `<lang xml:lang="ja-JP">${nameR}</lang>`);
          case AppTheme.TY:
            return ssmlBuiler
              .say('We will soon make a brief stop at')
              .pause('100ms')
              .say(nameR)
              .ssml(true)
              .replace(nameR, `<lang xml:lang="ja-JP">${nameR}</lang>`);
          case AppTheme.Yamanote:
          case AppTheme.Saikyo:
            return getNextTextEnBase();
          case AppTheme.JRWest:
            return ssmlBuiler
              .say('We will soon be making a brief stop at')
              .pause('100ms')
              .say(nameR)
              .ssml(true)
              .replace(nameR, `<lang xml:lang="ja-JP">${nameR}</lang>`);
          default:
            return '';
        }
      };

      const getApproachingTextEnWithTransfers = (): string => {
        const ssmlBuiler = new SSMLBuilder();

        switch (theme) {
          case AppTheme.TokyoMetro:
          case AppTheme.JRWest:
            return `${getApproachingTextEnBase()} ${ssmlBuiler
              .pause('100ms')
              .say('Please change here for')
              .say(linesEn.join(''))
              .ssml(true)}`;

          case AppTheme.TY:
            return `${getApproachingTextEnBase()} ${ssmlBuiler
              .pause('100ms')
              .say('Passengers changing to the')
              .say(linesEn.join(''))
              .pause('100ms')
              .say('Please transfer at this station.')
              .ssml(true)}`;

          case AppTheme.Yamanote:
          case AppTheme.Saikyo:
            return `${getApproachingTextEnBase()} ${ssmlBuiler
              .pause('100ms')
              .say('Please change here for')
              .say(linesEn.join(''))
              .pause(getHasTerminus(2) ? '100ms' : '0s')
              .say(
                getHasTerminus(2)
                  ? 'Thank you for traveling with us. And we look forward to serving you again!'
                  : ''
              )
              .ssml(true)}`;
          default:
            return '';
        }
      };

      const loopLine = getIsLoopLine(currentLine, currentTrainType);

      if (prevStateIsDifferent) {
        switch (headerState.split('_')[0]) {
          case 'NEXT':
            if (lines.length && loopLine) {
              speech({
                textJa: getNextTextJaWithTransfers(),
                textEn: getNextTextEnWithTransfers(),
              });
              return;
            }
            if (betweenNextStation.length) {
              speech({
                textJa: getNextTextJaExpress(),
                textEn: getNextTextEnExpress(),
              });
              return;
            }
            speech({
              textJa: getNextTextJaBase(),
              textEn: getNextTextEnBase(),
            });
            break;
          case 'ARRIVING':
            if (loopLine) {
              return;
            }

            if (lines.length) {
              speech({
                textJa: getApproachingTextJaWithTransfers(),
                textEn: getApproachingTextEnWithTransfers(),
              });
              break;
            }
            speech({
              textJa: getApproachingTextJaBase(),
              textEn: getApproachingTextEnBase(),
            });
            break;
          default:
            break;
        }
      }
    };

    playAsync();
  }, [
    connectedLines,
    currentLine,
    currentTrainType,
    enabled,
    headerState,
    isInternetAvailable,
    nextStation?.id,
    nextStation?.lines,
    nextStation?.nameK,
    nextStation?.nameR,
    prevStateIsDifferent,
    selectedBound?.id,
    selectedBound?.nameK,
    selectedBound?.nameR,
    slicedStations,
    speech,
    station?.groupId,
    station?.id,
    theme,
  ]);

  return <>{children}</>;
};

export default SpeechProvider;
