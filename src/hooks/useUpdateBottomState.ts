import { useEffect, useRef, useState } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import navigationState from '../store/atoms/navigation';
import tuningState from '../store/atoms/tuning';
import useNextTrainTypeIsDifferent from './useNextTrainTypeIsDifferent';
import useShouldHideTypeChange from './useShouldHideTypeChange';
import useTransferLines from './useTransferLines';
import useValueRef from './useValueRef';

const useUpdateBottomState = (): void => {
  const [{ bottomState }, setNavigation] = useRecoilState(navigationState);
  const { bottomTransitionInterval } = useRecoilValue(tuningState);
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

  const shouldHideTypeChange = useShouldHideTypeChange();
  const shouldHideTypeChangeRef = useRef(shouldHideTypeChange);

  useEffect(() => {
    const interval = setInterval(() => {
      switch (bottomStateRef.current) {
        case 'LINE':
          if (transferLinesRef.current.length) {
            setNavigation((prev) => ({ ...prev, bottomState: 'TRANSFER' }));
            return;
          }
          if (
            nextTrainTypeIsDifferentRef.current &&
            !shouldHideTypeChangeRef.current
          ) {
            setNavigation((prev) => ({
              ...prev,
              bottomState: 'TYPE_CHANGE',
            }));
          }
          break;
        case 'TRANSFER':
          if (
            nextTrainTypeIsDifferentRef.current &&
            !shouldHideTypeChangeRef.current
          ) {
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
    }, bottomTransitionInterval);
    setIntervalId(interval);
  }, [
    bottomStateRef,
    bottomTransitionInterval,
    nextTrainTypeIsDifferentRef,
    setNavigation,
    transferLinesRef,
  ]);
};

export default useUpdateBottomState;
