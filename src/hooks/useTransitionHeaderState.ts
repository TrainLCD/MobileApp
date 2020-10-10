import { useSelector, useDispatch } from 'react-redux';
import { Dispatch, useState, useEffect } from 'react';
import { TrainLCDAppState } from '../store';
import { NavigationActionTypes } from '../store/types/navigation';
import { updateHeaderState } from '../store/actions/navigation';
import { HEADER_CONTENT_TRANSITION_INTERVAL } from '../constants';
import useValueRef from './useValueRef';
import { isJapanese } from '../translation';

const useTransitionHeaderState = (): void => {
  const { arrived } = useSelector((state: TrainLCDAppState) => state.station);
  const { headerState, leftStations } = useSelector(
    (state: TrainLCDAppState) => state.navigation
  );
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout>();
  const dispatch = useDispatch<Dispatch<NavigationActionTypes>>();
  const headerStateRef = useValueRef(headerState);
  const leftStationsRef = useValueRef(leftStations);
  const arrivedRef = useValueRef(arrived);

  useEffect(() => {
    return (): void => clearInterval(intervalId);
  }, [intervalId]);

  useEffect(() => {
    const interval = setInterval(() => {
      switch (headerStateRef.current) {
        case 'CURRENT':
          if (leftStationsRef.current.length > 1 && !arrivedRef.current) {
            dispatch(updateHeaderState('NEXT'));
            break;
          }
          dispatch(updateHeaderState('CURRENT_KANA'));
          break;
        case 'CURRENT_KANA':
          if (leftStationsRef.current.length > 1 && !arrivedRef.current) {
            if (isJapanese) {
              dispatch(updateHeaderState('NEXT'));
            } else {
              dispatch(updateHeaderState('NEXT_EN'));
            }
            break;
          }
          if (isJapanese) {
            dispatch(updateHeaderState('CURRENT'));
          } else {
            dispatch(updateHeaderState('CURRENT_EN'));
          }
          break;
        case 'CURRENT_EN':
          if (leftStationsRef.current.length > 1 && !arrivedRef.current) {
            dispatch(updateHeaderState('NEXT'));
            break;
          }
          dispatch(updateHeaderState('CURRENT'));
          break;
        case 'NEXT':
          if (arrivedRef.current) {
            dispatch(updateHeaderState('CURRENT'));
          } else {
            dispatch(updateHeaderState('NEXT_KANA'));
          }
          break;
        case 'NEXT_KANA':
          if (arrivedRef.current) {
            if (isJapanese) {
              dispatch(updateHeaderState('CURRENT'));
            } else {
              dispatch(updateHeaderState('CURRENT_EN'));
            }
          } else if (isJapanese) {
            dispatch(updateHeaderState('NEXT'));
          } else {
            dispatch(updateHeaderState('NEXT_EN'));
          }
          break;
        case 'NEXT_EN':
          if (arrivedRef.current) {
            dispatch(updateHeaderState('CURRENT'));
          } else {
            dispatch(updateHeaderState('NEXT'));
          }
          break;
        default:
          break;
      }
    }, HEADER_CONTENT_TRANSITION_INTERVAL);
    setIntervalId(interval);
  }, [arrivedRef, dispatch, headerStateRef, leftStationsRef]);
};

export default useTransitionHeaderState;
