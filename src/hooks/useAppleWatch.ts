import { useCallback, useEffect, useMemo } from 'react';
import { sendMessage, useReachability } from 'react-native-watch-connectivity';
import { useRecoilValue } from 'recoil';
import { parenthesisRegexp } from '../constants/regexp';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import getNextStation from '../utils/getNextStation';
import getIsPass from '../utils/isPass';
import { getIsLoopLine } from '../utils/loopLine';
import {
  getNextInboundStopStation,
  getNextOutboundStopStation,
} from '../utils/nextStation';
import useCurrentLine from './useCurrentLine';
import useNumbering from './useNumbering';

const useAppleWatch = (): void => {
  const { station, stations, selectedDirection } = useRecoilValue(stationState);
  const { headerState, leftStations, trainType } =
    useRecoilValue(navigationState);
  const reachable = useReachability();
  const currentLine = useCurrentLine();
  const [currentNumbering] = useNumbering();

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

  const inboundStations = useMemo(() => {
    if (getIsLoopLine(currentLine, trainType)) {
      return stations.slice().reverse();
    }
    return stations;
  }, [currentLine, stations, trainType]).map((s) => ({
    ...s,
    distance: -1,
  }));

  const outboundStations = useMemo(() => {
    if (getIsLoopLine(currentLine, trainType)) {
      return stations;
    }
    return stations.slice().reverse();
  }, [currentLine, stations, trainType]).map((s) => ({
    ...s,
    distance: -1,
  }));

  const sendToWatch = useCallback(async (): Promise<void> => {
    if (switchedStation) {
      const msg = {
        state: headerState,
        station: {
          id: switchedStation.id,
          name: switchedStation.name,
          nameR: switchedStation.nameR,
          lines: switchedStation.lines
            .filter((l) => l.id !== currentLine?.id)
            .map((l) => ({
              id: l.id,
              lineColorC: l.lineColorC,
              name: l.name.replace(parenthesisRegexp, ''),
              nameR: l.nameR.replace(parenthesisRegexp, ''),
            })),
          stationNumber: currentNumbering?.stationNumber,
          pass: false,
        },
      };
      sendMessage(msg);
    }
    if (currentLine) {
      const switchedStations =
        selectedDirection === 'INBOUND' ? inboundStations : outboundStations;
      const msg = {
        stationList: switchedStations.map((s) => ({
          id: s.id,
          name: s.name,
          nameR: s.nameR,
          lines: s.lines
            .filter((l) => l.id !== currentLine.id)
            .map((l) => ({
              id: l.id,
              lineColorC: l.lineColorC,
              name: l.name.replace(parenthesisRegexp, ''),
              nameR: l.nameR.replace(parenthesisRegexp, ''),
            })),
          stationNumber: s?.stationNumbers?.[0]?.stationNumber,
          pass: getIsPass(s),
        })),
        selectedLine: {
          id: currentLine.id,
          name: currentLine.name.replace(parenthesisRegexp, ''),
          nameR: currentLine.nameR.replace(parenthesisRegexp, ''),
        },
      };
      sendMessage(msg);
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
    currentNumbering,
    switchedStation,
  ]);

  useEffect(() => {
    if (reachable) {
      sendToWatch();
    }
  }, [sendToWatch, reachable]);
};

export default useAppleWatch;
