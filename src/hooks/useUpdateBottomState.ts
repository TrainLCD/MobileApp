import { useCallback, useState, useEffect } from 'react';
import { useRecoilState } from 'recoil';
import { BOTTOM_CONTENT_TRANSITION_INTERVAL } from '../constants';
import useValueRef from './useValueRef';
import navigationState from '../store/atoms/navigation';
import useTransferLines from './useTransferLines';
import useNextTrainTypeIsDifferent from './useNextTrainTypeIsDifferent';

const useUpdateBottomState = (): [() => void] => {
  const [{ bottomState }, setNavigation] = useRecoilState(navigationState);
  const [intervalId, setIntervalId] = useState<NodeJS.Timer>();
  const bottomStateRef = useValueRef(bottomState);

  useEffect(() => {
    return (): void => {
      clearInterval(intervalId);
    };
  }, [intervalId]);

  const nextTrainTypeIsDifferent = useNextTrainTypeIsDifferent();

  const transferLines = useTransferLines();

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
            return;
          }
          if (nextTrainTypeIsDifferent) {
            setNavigation((prev) => ({
              ...prev,
              bottomState: 'TYPE_CHANGE',
            }));
          }
          break;
        case 'TRANSFER':
          if (nextTrainTypeIsDifferent) {
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
    nextTrainTypeIsDifferent,
    setNavigation,
    transferLinesRef.length,
  ]);

  return [updateFunc];
};

export default useUpdateBottomState;
