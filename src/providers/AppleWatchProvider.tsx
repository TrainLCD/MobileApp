import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, PlatformIOSStatic } from 'react-native';
import { sendMessage, watchEvents } from 'react-native-watch-connectivity';
import { useRecoilValue } from 'recoil';
import { parenthesisRegexp } from '../constants/regexp';
import lineState from '../store/atoms/line';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { isLoopLine } from '../utils/loopLine';

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

  const outboundCurrentStationIndex = stations
    .slice()
    .reverse()
    .findIndex((s) => {
      if (s?.name === station.name) {
        return true;
      }
      return false;
    });

  const actualNextStation = leftStations[1];

  const nextOutboundStopStation = actualNextStation?.pass
    ? stations
        .slice()
        .reverse()
        .slice(outboundCurrentStationIndex - stations.length + 1)
        .find((s, i) => {
          if (i && !s.pass) {
            return true;
          }
          return false;
        })
    : actualNextStation;

  const inboundCurrentStationIndex = stations.slice().findIndex((s) => {
    if (s?.name === station.name) {
      return true;
    }
    return false;
  });
  const nextInboundStopStation = actualNextStation?.pass
    ? stations
        .slice(inboundCurrentStationIndex - stations.length + 1)
        .find((s, i) => {
          if (i && !s.pass) {
            return true;
          }
          return false;
        })
    : actualNextStation;

  const nextStation =
    selectedDirection === 'INBOUND'
      ? nextInboundStopStation
      : nextOutboundStopStation;

  const switchedStation = useMemo(() => {
    switch (headerState) {
      case 'CURRENT':
      case 'CURRENT_EN':
      case 'CURRENT_KANA':
        return station;
      default:
        return nextStation;
    }
  }, [headerState, nextStation, station]);

  const joinedLineIds = trainType?.lines.map((l) => l.id);
  const currentLine =
    leftStations.map((s) =>
      s.lines.find((l) => joinedLineIds?.find((il) => l.id === il))
    )[0] || selectedLine;

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
          distance: -1,
        },
      });
    }
    if (currentLine) {
      sendMessage({
        stationList:
          selectedDirection === 'INBOUND' ? inboundStations : outboundStations,
        selectedLine: {
          ...currentLine,
          name: currentLine.name.replace(parenthesisRegexp, ''),
          nameR: currentLine.nameR.replace(parenthesisRegexp, ''),
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

    return (): void => {
      unsubscribeReachabilitySub();
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
