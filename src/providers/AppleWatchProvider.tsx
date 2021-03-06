import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, PlatformIOSStatic } from 'react-native';
import { sendMessage, watchEvents } from 'react-native-watch-connectivity';
import { useRecoilValue } from 'recoil';
import { parenthesisRegexp } from '../constants/regexp';
import lineState from '../store/atoms/line';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import getCurrentLine from '../utils/currentLine';
import { isLoopLine } from '../utils/loopLine';
import {
  getNextInboundStopStation,
  getNextOutboundStopStation,
} from '../utils/nextStation';

const { isPad } = Platform as PlatformIOSStatic;

type Props = {
  children: React.ReactNode;
};

const AppleWatchProvider: React.FC<Props> = ({ children }: Props) => {
  const { station, stations, selectedDirection } = useRecoilValue(stationState);
  const { headerState, leftStations, trainType } = useRecoilValue(
    navigationState
  );
  const { selectedLine } = useRecoilValue(lineState);
  const [wcReachable, setWCReachable] = useState(false);

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

  const switchedStation = useMemo(() => {
    switch (headerState) {
      case 'CURRENT':
      case 'CURRENT_EN':
      case 'CURRENT_KANA':
      case 'CURRENT_ZH':
      case 'CURRENT_KO':
        return station;
      default:
        return nextStation;
    }
  }, [headerState, nextStation, station]);

  const joinedLineIds = trainType?.lines.map((l) => l.id);
  const currentLine = getCurrentLine(leftStations, joinedLineIds, selectedLine);

  const inboundStations = useMemo(() => {
    if (isLoopLine(currentLine)) {
      return stations.slice().reverse();
    }
    return stations;
  }, [currentLine, stations]).map((s) => ({
    ...s,
    distance: -1,
  }));

  const outboundStations = useMemo(() => {
    if (isLoopLine(currentLine)) {
      return stations;
    }
    return stations.slice().reverse();
  }, [currentLine, stations]).map((s) => ({
    ...s,
    distance: -1,
  }));

  const sendToWatch = useCallback(async (): Promise<void> => {
    if (station) {
      sendMessage({
        state: headerState,
        station: {
          ...switchedStation,
          nameZh: '',
          nameKo: '',
          lines: switchedStation.lines.map((l) => ({
            ...l,
            nameZh: '',
            nameKo: '',
          })),
          distance: -1,
        },
      });
    }
    if (currentLine) {
      sendMessage({
        stationList:
          selectedDirection === 'INBOUND'
            ? inboundStations.map((s) => ({
                ...s,
                lines: s.lines.map((l) => ({
                  ...l,
                  nameZh: '',
                  nameKo: '',
                })),
                nameZh: s.nameZh || '',
                nameKo: s.nameKo || '',
              }))
            : outboundStations.map((s) => ({
                ...s,
                lines: s.lines.map((l) => ({
                  ...l,
                  nameZh: '',
                  nameKo: '',
                })),
                nameZh: '',
                nameKo: '',
              })),
        selectedLine: {
          ...currentLine,
          name: currentLine.name.replace(parenthesisRegexp, ''),
          nameR: currentLine.nameR.replace(parenthesisRegexp, ''),
          nameZh: '',
          nameKo: '',
        },
      });
    } else {
      sendMessage({
        stationList: [],
      });
    }
  }, [
    currentLine,
    headerState,
    inboundStations,
    outboundStations,
    selectedDirection,
    station,
    switchedStation,
  ]);

  useEffect(() => {
    if (Platform.OS === 'android' || isPad) {
      return (): void => undefined;
    }

    const unsubscribeReachabilitySub = watchEvents.addListener(
      'reachability',
      (reachable: boolean) => {
        setWCReachable(reachable);
      }
    );
    const unsubscribeInstalledSub = watchEvents.addListener(
      'installed',
      (installed: boolean) => {
        setWCReachable(installed);
      }
    );
    const unsubscribePairedSub = watchEvents.addListener(
      'paired',
      (paired: boolean) => {
        setWCReachable(paired);
      }
    );

    return (): void => {
      unsubscribeReachabilitySub();
      unsubscribeInstalledSub();
      unsubscribePairedSub();
    };
  }, []);

  useEffect(() => {
    if (wcReachable) {
      sendToWatch();
    }
  }, [sendToWatch, wcReachable]);

  return <>{children}</>;
};

export default AppleWatchProvider;
