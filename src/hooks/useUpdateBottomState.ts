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
  const transferLines = useTransferLines();
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
      // ref オブジェクト自体は安定なので deps はコンパクトにする。
      // 以前は `xxxRef.current` を deps に入れていたが lint 違反のうえ、
      // ref の current は React のレンダリング・サイクルでは追跡されず、
      // 結果として callback identity が不必要に揺れて useInterval を再生成していた。
    }, [
      bottomStateRef,
      isTypeWillChangeRef,
      isLEDThemeRef,
      shouldHideTypeChangeRef,
      setNavigation,
      transferLines.length,
    ]),
    bottomTransitionInterval
  );

  return { pause };
};
