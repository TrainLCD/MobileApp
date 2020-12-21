import React, { useCallback, useEffect, useMemo } from 'react';
import { Platform, PlatformIOSStatic } from 'react-native';
import { sendMessage, watchEvents } from 'react-native-watch-connectivity';
import { useRecoilValue } from 'recoil';
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
  const { headerState, leftStations } = useRecoilValue(navigationState);
  const { selectedLine } = useRecoilValue(lineState);

  const nextStation = leftStations[1];

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

  const inboundStations = useMemo(() => {
    if (isLoopLine(selectedLine)) {
      return stations.slice().reverse();
    }
    return stations;
  }, [selectedLine, stations]);

  const outboundStations = useMemo(() => {
    if (isLoopLine(selectedLine)) {
      return stations;
    }
    return stations.slice().reverse();
  }, [selectedLine, stations]);

  const sendToWatch = useCallback(async (): Promise<void> => {
    if (station) {
      sendMessage({
        state: headerState,
        station: switchedStation,
      });
      if (selectedLine) {
        sendMessage({
          stationList:
            selectedDirection === 'INBOUND'
              ? inboundStations
              : outboundStations,
          selectedLine,
        });
      }
    }
  }, [
    headerState,
    inboundStations,
    outboundStations,
    selectedDirection,
    selectedLine,
    station,
    switchedStation,
  ]);

  useEffect(() => {
    if (Platform.OS === 'android' || isPad) {
      return (): void => {
        // nothing to do.
      };
    }
    sendToWatch();
    const unsubscribeReachabilitySub = watchEvents.addListener(
      'reachability',
      () => {
        sendToWatch();
      }
    );

    return (): void => {
      unsubscribeReachabilitySub();
    };
  }, [sendToWatch]);

  return <>{children}</>;
};

export default AppleWatchProvider;
