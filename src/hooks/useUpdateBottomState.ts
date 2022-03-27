import { useCallback, useEffect, useState } from 'react';
import { useRecoilState } from 'recoil';
import { BOTTOM_CONTENT_TRANSITION_INTERVAL } from '../constants';
import navigationState from '../store/atoms/navigation';
import useNextTrainTypeIsDifferent from './useNextTrainTypeIsDifferent';
import useTransferLines from './useTransferLines';
import useValueRef from './useValueRef';

const useUpdateBottomState = (): [() => void] => {
  const [{ bottomState }, setNavigation] = useRecoilState(navigationState);
  const [intervalId, setIntervalId] = useState<NodeJS.Timer>();
  const bottomStateRef = useValueRef(bottomState);

  useEffect(() => {
    return (): void => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [intervalId]);

  const nextTrainTypeIsDifferent = useNextTrainTypeIsDifferent();
  const nextTrainTypeIsDifferentRef = useValueRef(nextTrainTypeIsDifferent);

  const transferLines = useTransferLines();
  const transferLinesRef = useValueRef(transferLines);

  useEffect(() => {
    if (!transferLines.length) {
      setNavigation((prev) => ({ ...prev, bottomState: 'LINE' }));
    }
  }, [setNavigation, transferLines.length]);

  const updateFunc = useCallback(() => {
    const interval = setInterval(() => {
      switch (bottomStateRef.current) {
        case 'LINE':
          if (transferLinesRef.current.length) {
            setNavigation((prev) => ({ ...prev, bottomState: 'TRANSFER' }));
            return;
          }
          if (nextTrainTypeIsDifferentRef.current) {
            setNavigation((prev) => ({
              ...prev,
              bottomState: 'TYPE_CHANGE',
            }));
          }
          break;
        case 'TRANSFER':
          if (nextTrainTypeIsDifferentRef.current) {
            setNavigation((prev) => ({
              ...prev,
              bottomState: 'TYPE_CHANGE',
            }));
          } else {
            setNavigation((prev) => ({ ...prev, bottomState: 'LINE' }));
          }
          break;
        case 'TYPE_CHANGE':
          setNavigation((prev) => ({
            ...prev,
            bottomState: 'LINE',
          }));
          break;
        default:
          break;
      }
    }, BOTTOM_CONTENT_TRANSITION_INTERVAL);
    setIntervalId(interval);
  }, [
    bottomStateRef,
    nextTrainTypeIsDifferentRef,
    setNavigation,
    transferLinesRef,
  ]);

  return [updateFunc];
};

export default useUpdateBottomState;
