import { useSelector, useDispatch } from 'react-redux';
import { Dispatch, useCallback, useState, useEffect } from 'react';
import i18n from 'i18n-js';
import { TrainLCDAppState } from '../store';
import { updateHeaderState } from '../store/actions/navigation';
import { NavigationActionTypes } from '../store/types/navigation';
import { HEADER_CONTENT_TRANSITION_INTERVAL } from '../constants';

const useWatchApproaching = (): [() => void] => {
  const { arrived, approaching } = useSelector(
    (state: TrainLCDAppState) => state.station
  );
  const { headerState } = useSelector(
    (state: TrainLCDAppState) => state.navigation
  );
  const dispatch = useDispatch<Dispatch<NavigationActionTypes>>();
  const [intervalId, setIntervalId] = useState<NodeJS.Timer>();

  useEffect(() => {
    return (): void => {
      clearInterval(intervalId);
    };
  }, [intervalId]);

  const startFunc = useCallback(() => {
    if (arrived) {
      switch (headerState) {
        case 'NEXT':
        case 'NEXT_KANA':
        case 'NEXT_EN':
        case 'ARRIVING':
        case 'ARRIVING_KANA':
        case 'ARRIVING_EN':
          dispatch(
            updateHeaderState(i18n.locale === 'ja' ? 'CURRENT' : 'CURRENT_EN')
          );
          break;
        default:
          break;
      }
      return;
    }

    if (approaching) {
      const interval = setInterval(() => {
        switch (headerState) {
          case 'CURRENT':
          case 'CURRENT_KANA':
          case 'CURRENT_EN':
          case 'NEXT':
          case 'NEXT_KANA':
          case 'NEXT_EN':
            dispatch(updateHeaderState('ARRIVING'));
            break;
          case 'ARRIVING':
            dispatch(updateHeaderState('ARRIVING_KANA'));
            break;
          case 'ARRIVING_KANA':
            if (i18n.locale === 'ja') {
              dispatch(updateHeaderState('ARRIVING'));
            } else {
              dispatch(updateHeaderState('ARRIVING_EN'));
            }
            break;
          case 'ARRIVING_EN':
            dispatch(updateHeaderState('ARRIVING'));
            break;
          default:
            break;
        }
      }, HEADER_CONTENT_TRANSITION_INTERVAL);
      setIntervalId(interval);
    }
  }, [approaching, arrived, dispatch, headerState]);

  return [startFunc];
};

export default useWatchApproaching;
