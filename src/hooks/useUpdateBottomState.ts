import { useAtom, useAtomValue } from 'jotai';
import { useCallback, useEffect, useRef } from 'react';
import { APP_THEME } from '../models/Theme';
import navigationState from '../store/atoms/navigation';
import tuningState from '../store/atoms/tuning';
import { useInterval } from './useInterval';
import { useShouldHideTypeChange } from './useShouldHideTypeChange';
import { useThemeStore } from './useThemeStore';
import { useTransferLines } from './useTransferLines';
import { useTypeWillChange } from './useTypeWillChange';
import { useValueRef } from './useValueRef';

export const useUpdateBottomState = () => {
  const [{ bottomState }, setNavigation] = useAtom(navigationState);
  const { bottomTransitionInterval } = useAtomValue(tuningState);
  const bottomStateRef = useValueRef(bottomState);
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);

  const isTypeWillChange = useTypeWillChange();
  const isTypeWillChangeRef = useValueRef(isTypeWillChange);
  const transferLines = useTransferLines();
  const isLEDThemeRef = useRef(isLEDTheme);
  const shouldHideTypeChange = useShouldHideTypeChange();
  const shouldHideTypeChangeRef = useRef(shouldHideTypeChange);

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
    ]),
    bottomTransitionInterval
  );

  return { pause };
};
