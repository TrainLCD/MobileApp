import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo } from 'react';
import {
  sendMessage,
  updateApplicationContext,
  useReachability,
} from 'react-native-watch-connectivity';
import type { Station } from '~/gen/proto/stationapi_pb';
import { isJapanese } from '~/translation';
import { parenthesisRegexp } from '../constants';
import stationState from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import { useBounds } from './useBounds';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentStation } from './useCurrentStation';
import { useLoopLine } from './useLoopLine';
import { useNextStation } from './useNextStation';
import { useNumbering } from './useNumbering';
import { useStoppingState } from './useStoppingState';

export const useAppleWatch = (): void => {
  const { arrived, stations, selectedDirection } = useAtomValue(stationState);
  const station = useCurrentStation();
  const currentLine = useCurrentLine();

  const reachable = useReachability();
  const [currentNumbering] = useNumbering();
  const nextStation = useNextStation();
  const stoppingState = useStoppingState();
  const { isLoopLine: isFullLoopLine, isPartiallyLoopLine } = useLoopLine();
  const { directionalStops } = useBounds();

  const switchedStation = useMemo<Station | null>(
    () => (arrived && !getIsPass(station) ? station : (nextStation ?? null)),
    [arrived, nextStation, station]
  );

  const inboundStations = useMemo<Station[]>(() => {
    if (isFullLoopLine) {
      return stations.slice().reverse();
    }
    return stations;
  }, [isFullLoopLine, stations]);

  const outboundStations = useMemo<Station[]>(() => {
    if (isFullLoopLine) {
      return stations;
    }
    return stations.slice().reverse();
  }, [isFullLoopLine, stations]);

  const boundStationName = useMemo(() => {
    const jaSuffix = isFullLoopLine || isPartiallyLoopLine ? '方面' : 'ゆき';

    return `${directionalStops
      .map((s) => (isJapanese ? s.name : s.nameRoman))
      .join(isJapanese ? '・' : '/')}${isJapanese ? jaSuffix : ''}`;
  }, [directionalStops, isFullLoopLine, isPartiallyLoopLine]);

  const essentialMessage = useMemo(() => {
    if (!switchedStation) {
      return;
    }

    return {
      state: stoppingState,
      station: {
        id: switchedStation.id,
        name: isJapanese ? switchedStation.name : switchedStation.nameRoman,
        lines: switchedStation.lines
          .filter((l) => l.id !== currentLine?.id)
          .map((l) => ({
            id: l.id,
            lineColorC: l.color,
            name: isJapanese
              ? l.nameShort.replace(parenthesisRegexp, '')
              : l.nameRoman?.replace(parenthesisRegexp, ''),
            lineSymbol: currentNumbering?.lineSymbol ?? '',
          })),
        stationNumber: currentNumbering?.stationNumber,
        pass: false,
      },
    };
  }, [currentLine, currentNumbering, switchedStation, stoppingState]);

  const additionalMessage = useMemo(() => {
    if (!currentLine) {
      return;
    }

    const switchedStations =
      selectedDirection === 'INBOUND' ? inboundStations : outboundStations;

    return {
      stationList: switchedStations.map((s) => ({
        id: s.id,
        name: isJapanese ? s.name : s.nameRoman,
        lines: s.lines
          .filter((l) => l.id !== currentLine.id)
          .map((l) => ({
            id: l.id,
            lineColorC: l.color,
            name: isJapanese
              ? l.nameShort.replace(parenthesisRegexp, '')
              : l.nameRoman?.replace(parenthesisRegexp, ''),
            lineSymbol: currentNumbering?.lineSymbol ?? '',
          })),
        stationNumber: s?.stationNumbers?.[0]?.stationNumber,
        pass: getIsPass(s),
      })),
      selectedLine: {
        id: currentLine.id,
        name: isJapanese
          ? currentLine.nameShort.replace(parenthesisRegexp, '')
          : currentLine.nameRoman?.replace(parenthesisRegexp, ''),
        lineColorC: currentLine.color,
        lineSymbol: currentNumbering?.lineSymbol ?? '',
      },
      boundStationName,
    };
  }, [
    currentLine,
    currentNumbering,
    inboundStations,
    outboundStations,
    selectedDirection,
    boundStationName,
  ]);

  const sendMessagesToWatch = useCallback(async (): Promise<void> => {
    if (essentialMessage) {
      sendMessage(essentialMessage, console.log, (err) => {
        console.error(err);
        updateApplicationContext(essentialMessage);
      });
    }

    if (additionalMessage) {
      sendMessage(additionalMessage, console.log, (err) => {
        console.error(err);
        updateApplicationContext(additionalMessage);
      });
    } else {
      sendMessage({
        stationList: [],
      });
    }
  }, [essentialMessage, additionalMessage]);

  const updateWatchApplicationContext = useCallback(() => {
    if (essentialMessage) {
      updateApplicationContext(essentialMessage);
    }
    if (additionalMessage) {
      updateApplicationContext(additionalMessage);
    }
  }, [essentialMessage, additionalMessage]);

  useEffect(() => {
    if (reachable) {
      sendMessagesToWatch();
    } else {
      updateWatchApplicationContext();
    }
  }, [reachable, sendMessagesToWatch, updateWatchApplicationContext]);
};
