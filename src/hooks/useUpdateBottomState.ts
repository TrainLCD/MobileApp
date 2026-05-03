import { useAtom, useAtomValue } from 'jotai';
import { useCallback, useEffect } from 'react';
import navigationState from '../store/atoms/navigation';
import { isLEDThemeAtom } from '../store/atoms/theme';
import tuningState from '../store/atoms/tuning';
import { useInterval } from './useInterval';
import { useShouldHideTypeChange } from './useShouldHideTypeChange';
import { useTransferLines } from './useTransferLines';
import { useTypeWillChange } from './useTypeWillChange';
import { useValueRef } from './useValueRef';

export const useUpdateBottomState = () => {
  const [{ bottomState }, setNavigation] = useAtom(navigationState);
  const { bottomTransitionInterval } = useAtomValue(tuningState);
  const bottomStateRef = useValueRef(bottomState);
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  const isTypeWillChange = useTypeWillChange();
  const isTypeWillChangeRef = useValueRef(isTypeWillChange);
  // Transfers 画面と同じ条件で件数を見る必要があるため
  // 直通運転で到達できる路線は除外する
  const transferLines = useTransferLines({ omitThroughService: true });
  const isLEDThemeRef = useValueRef(isLEDTheme);
  const shouldHideTypeChange = useShouldHideTypeChange();
  const shouldHideTypeChangeRef = useValueRef(shouldHideTypeChange);

  useEffect(() => {
    if (!transferLines.length) {
      setNavigation((prev) => ({ ...prev, bottomState: 'LINE' }));
    }
  }, [setNavigation, transferLines.length]);

  const { pause } = useInterval(
    useCallback(() => {
      if (isLEDThemeRef.current) {
        return;
      }

      switch (bottomStateRef.current) {
        case 'LINE':
          if (transferLines.length) {
            setNavigation((prev) => ({ ...prev, bottomState: 'TRANSFER' }));
            return;
          }
          if (isTypeWillChangeRef.current && !shouldHideTypeChangeRef.current) {
            setNavigation((prev) => ({
              ...prev,
              bottomState: 'TYPE_CHANGE',
            }));
          }
          break;
        case 'TRANSFER':
          if (isTypeWillChangeRef.current && !shouldHideTypeChangeRef.current) {
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
    }, [
      bottomStateRef,
      isTypeWillChangeRef,
      setNavigation,
      transferLines.length,
      isLEDThemeRef.current,
      shouldHideTypeChangeRef.current,
    ]),
    bottomTransitionInterval
  );

  return { pause };
};
