import { useCallback, useState, useEffect, useMemo } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import {
  getCurrentStationLinesWithoutCurrentLine,
  getNextStationLinesWithoutCurrentLine,
} from '../utils/line';
import { BOTTOM_CONTENT_TRANSITION_INTERVAL } from '../constants';
import useValueRef from './useValueRef';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import lineState from '../store/atoms/line';
import { isLoopLine } from '../utils/loopLine';
import getCurrentStationIndex from '../utils/currentStationIndex';

const useUpdateBottomState = (): [() => void] => {
  const [
    { bottomState, leftStations, trainType },
    setNavigation,
  ] = useRecoilState(navigationState);
  const { arrived, stations, selectedDirection } = useRecoilValue(stationState);
  const { selectedLine } = useRecoilValue(lineState);
  const [intervalId, setIntervalId] = useState<NodeJS.Timer>();
  const bottomStateRef = useValueRef(bottomState);

  const joinedLineIds = trainType?.lines.map((l) => l.id);
  const currentLine =
    leftStations.map((s) =>
      s.lines.find((l) => joinedLineIds?.find((il) => l.id === il))
    )[0] || selectedLine;

  const isInbound = selectedDirection === 'INBOUND';

  const slicedStations = useMemo(() => {
    const currentStationIndex = getCurrentStationIndex(
      stations,
      leftStations[0]
    );
    if (arrived) {
      return isInbound
        ? stations.slice(currentStationIndex)
        : stations.slice(0, currentStationIndex + 1).reverse();
    }

    if (isLoopLine(currentLine)) {
      return isInbound
        ? stations.slice(currentStationIndex - 1)
        : stations.slice(0, currentStationIndex + 2).reverse();
    }
    return isInbound
      ? stations.slice(currentStationIndex)
      : stations.slice(0, currentStationIndex).reverse();
  }, [arrived, currentLine, isInbound, leftStations, stations]);

  const nextStopStationIndex = slicedStations.findIndex((s) => {
    if (s.id === leftStations[0]?.id) {
      return false;
    }
    return !s.pass;
  });

  useEffect(() => {
    return (): void => {
      clearInterval(intervalId);
    };
  }, [intervalId]);

  const transferLines = useMemo(() => {
    if (arrived) {
      const currentStation = leftStations[0];
      if (currentStation?.pass) {
        return getNextStationLinesWithoutCurrentLine(
          slicedStations,
          currentLine,
          nextStopStationIndex
        );
      }
      return getCurrentStationLinesWithoutCurrentLine(
        slicedStations,
        currentLine
      );
    }
    return getNextStationLinesWithoutCurrentLine(
      slicedStations,
      currentLine,
      nextStopStationIndex
    );
  }, [
    arrived,
    currentLine,
    leftStations,
    nextStopStationIndex,
    slicedStations,
  ]);

  const transferLinesRef = useValueRef(transferLines).current;

  useEffect(() => {
    if (!transferLines.length) {
      setNavigation((prev) => ({ ...prev, bottomState: 'LINE' }));
    }
  }, [setNavigation, transferLines.length]);

  const updateFunc = useCallback(() => {
    const interval = setInterval(() => {
      switch (bottomStateRef.current) {
        case 'LINE':
          if (transferLinesRef.length) {
            setNavigation((prev) => ({ ...prev, bottomState: 'TRANSFER' }));
          }
          break;
        case 'TRANSFER':
          setNavigation((prev) => ({ ...prev, bottomState: 'LINE' }));
          break;
        default:
          break;
      }
    }, BOTTOM_CONTENT_TRANSITION_INTERVAL);
    setIntervalId(interval);
  }, [bottomStateRef, setNavigation, transferLinesRef.length]);

  return [updateFunc];
};

export default useUpdateBottomState;
