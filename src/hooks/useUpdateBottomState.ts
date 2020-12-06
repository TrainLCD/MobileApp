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

const useUpdateBottomState = (): [() => void] => {
  const [{ bottomState, leftStations }, setNavigation] = useRecoilState(
    navigationState
  );
  const { arrived } = useRecoilValue(stationState);
  const { selectedLine } = useRecoilValue(lineState);
  const [intervalId, setIntervalId] = useState<NodeJS.Timer>();
  const bottomStateRef = useValueRef(bottomState);
  const leftStationsRef = useValueRef(leftStations);
  const arrivedRef = useValueRef(arrived);

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
      const transferLines = arrivedRef.current
        ? getCurrentStationLinesWithoutCurrentLine(
            leftStationsRef.current,
            selectedLine
          )
        : getNextStationLinesWithoutCurrentLine(
            leftStationsRef.current,
            selectedLine
          );

      switch (bottomStateRef.current) {
        case 'LINE':
          if (transferLines.length) {
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
  }, [
    arrivedRef,
    bottomStateRef,
    leftStationsRef,
    selectedLine,
    setNavigation,
  ]);

  return [updateFunc];
};

export default useUpdateBottomState;
