import { useCallback, useState, useEffect } from 'react';
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
import { Line } from '../models/StationAPI';

const useUpdateBottomState = (): [() => void] => {
  const [{ bottomState, leftStations }, setNavigation] = useRecoilState(
    navigationState
  );
  const { arrived } = useRecoilValue(stationState);
  const { selectedLine } = useRecoilValue(lineState);
  const [intervalId, setIntervalId] = useState<NodeJS.Timer>();
  const bottomStateRef = useValueRef(bottomState);

  useEffect(() => {
    return (): void => {
      clearInterval(intervalId);
    };
  }, [intervalId]);

  useEffect(() => {
    const transferLines = arrived
      ? getCurrentStationLinesWithoutCurrentLine(leftStations, selectedLine)
      : getNextStationLinesWithoutCurrentLine(leftStations, selectedLine);
    if (!transferLines.length) {
      setNavigation((prev) => ({ ...prev, bottomState: 'LINE' }));
    }
  }, [arrived, leftStations, selectedLine, setNavigation]);

  const updateFunc = useCallback(() => {
    const interval = setInterval(() => {
      const nextStopStationIndex = leftStations
        .slice(1)
        .findIndex((s) => !s.pass);

      const transferLines = (): Line[] => {
        if (arrived) {
          const currentStation = leftStations[0];
          if (currentStation.pass) {
            return getNextStationLinesWithoutCurrentLine(
              leftStations,
              selectedLine,
              nextStopStationIndex === -1 ? undefined : nextStopStationIndex + 1
            );
          }
          return getCurrentStationLinesWithoutCurrentLine(
            leftStations,
            selectedLine
          );
        }
        return getNextStationLinesWithoutCurrentLine(
          leftStations,
          selectedLine,
          nextStopStationIndex === -1 ? undefined : nextStopStationIndex + 1
        );
      };
      switch (bottomStateRef.current) {
        case 'LINE':
          if (transferLines().length) {
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
  }, [arrived, bottomStateRef, leftStations, selectedLine, setNavigation]);

  return [updateFunc];
};

export default useUpdateBottomState;
