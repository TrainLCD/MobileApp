import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useEffect } from 'react';
import { portraitModeEnabledAtom } from '../store/atoms/experimental';
import navigationState, { bottomStateAtom } from '../store/atoms/navigation';
import { isLEDThemeAtom } from '../store/atoms/theme';
import tuningState from '../store/atoms/tuning';
import { useInterval } from './useInterval';
import { useLandscapeWindowDimensions } from './useLandscapeWindowDimensions';
import { useShouldHideTypeChange } from './useShouldHideTypeChange';
import { useTransferLines } from './useTransferLines';
import { useTypeWillChange } from './useTypeWillChange';
import { useValueRef } from './useValueRef';

export const useUpdateBottomState = () => {
  const bottomState = useAtomValue(bottomStateAtom);
  const setNavigation = useSetAtom(navigationState);
  const { bottomTransitionInterval } = useAtomValue(tuningState);
  const bottomStateRef = useValueRef(bottomState);
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const portraitModeEnabled = useAtomValue(portraitModeEnabledAtom);
  const { isPortrait } = useLandscapeWindowDimensions();
  // ポートレートレイアウトは路線テーマに依存しない独自の画面なので、電光掲示板風
  // テーマを選んでいても下部の表示は切り替える。横画面の電光掲示板風テーマは
  // 下部の領域自体を持たないため、そちらは従来どおり止めたままにする。
  const isPortraitLayout = portraitModeEnabled && isPortrait;

  const isTypeWillChange = useTypeWillChange();
  const isTypeWillChangeRef = useValueRef(isTypeWillChange);
  const transferLines = useTransferLines();
  const isLEDThemeRef = useValueRef(isLEDTheme);
  const isPortraitLayoutRef = useValueRef(isPortraitLayout);
  const shouldHideTypeChange = useShouldHideTypeChange();
  const shouldHideTypeChangeRef = useValueRef(shouldHideTypeChange);

  useEffect(() => {
    if (!transferLines.length) {
      setNavigation((prev) => ({ ...prev, bottomState: 'LINE' }));
    }
  }, [setNavigation, transferLines.length]);

  const { pause } = useInterval(
    useCallback(() => {
      if (isLEDThemeRef.current && !isPortraitLayoutRef.current) {
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
      isPortraitLayoutRef,
      shouldHideTypeChangeRef,
      setNavigation,
      transferLines.length,
    ]),
    bottomTransitionInterval
  );

  return { pause };
};
