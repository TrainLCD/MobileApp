import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

// アプリがフォアグラウンドでアクティブかどうかを返す。
// バックグラウンドや PiP への移行時に、PiP ウィンドウへ写り込ませたくない
// 表示要素を出し分ける用途で使用する。
export const useIsAppActive = (): boolean => {
  const [isActive, setIsActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const handleChange = (state: AppStateStatus): void => {
      setIsActive(state === 'active');
    };

    const sub = AppState.addEventListener('change', handleChange);

    return () => {
      sub.remove();
    };
  }, []);

  return isActive;
};
