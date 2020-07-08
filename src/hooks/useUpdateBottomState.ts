import { useSelector, useDispatch } from 'react-redux';
import { useCallback, Dispatch, useState, useEffect } from 'react';
import { TrainLCDAppState } from '../store';
import {
  getCurrentStationLinesWithoutCurrentLine,
  getNextStationLinesWithoutCurrentLine,
} from '../utils/line';
import { NavigationActionTypes } from '../store/types/navigation';
import { updateBottomState } from '../store/actions/navigation';
import { BOTTOM_CONTENT_TRANSITION_INTERVAL } from '../constants';
import useValueRef from './useValueRef';

const useUpdateBottomState = (): [() => void] => {
  const { bottomState, leftStations } = useSelector(
    (state: TrainLCDAppState) => state.navigation
  );
  const { arrived } = useSelector((state: TrainLCDAppState) => state.station);
  const { selectedLine } = useSelector((state: TrainLCDAppState) => state.line);
  const dispatch = useDispatch<Dispatch<NavigationActionTypes>>();
  const [intervalId, setIntervalId] = useState<NodeJS.Timer>();
  const bottomStateRef = useValueRef(bottomState);
  const leftStationsRef = useValueRef(leftStations);
  const arrivedRef = useValueRef(arrived);

  useEffect(() => {
    return (): void => {
      clearInterval(intervalId);
    };
  }, [intervalId]);

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
            dispatch(updateBottomState('TRANSFER'));
          }
          break;
        case 'TRANSFER':
          dispatch(updateBottomState('LINE'));
          break;
        default:
          break;
      }
    }, BOTTOM_CONTENT_TRANSITION_INTERVAL);
    setIntervalId(interval);
  }, [arrivedRef, bottomStateRef, dispatch, leftStationsRef, selectedLine]);

  return [updateFunc];
};

export default useUpdateBottomState;
