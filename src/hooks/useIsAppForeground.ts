import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

// iOSの'inactive'は前景の一部で、通知センターやコントロールセンターを引き下ろした間、
// Appスイッチャーを開いた間、着信や画面ロックへ移る一瞬などに入る。アプリは画面に
// 出たままで、CoreLocationも前景と同じように測位を届ける。
// 'unknown'(初期状態が読めない環境)は前景と見なさない。前景でだけ動いてよい処理が
// 対象なので、判断が付かない間は動かさない側へ倒す。
const isForegroundState = (state: AppStateStatus): boolean =>
  state === 'active' || state === 'inactive';

/**
 * アプリが前景にあるかどうかを返す。
 *
 * useIsAppActiveとの違いは'inactive'の扱いだけで、あちらは'active'以外をすべてfalseに
 * する。表示要素の出し分け(PiPへ写り込ませない等)はそれでよいが、「前景でしか成立しない
 * 処理を動かしてよいか」の判断には狭すぎる。コントロールセンターを引き下ろしただけで
 * falseになり、進行中の処理が畳まれてしまう。
 */
export const useIsAppForeground = (): boolean => {
  const [isForeground, setIsForeground] = useState(() =>
    isForegroundState(AppState.currentState)
  );

  useEffect(() => {
    const handleChange = (state: AppStateStatus): void => {
      setIsForeground(isForegroundState(state));
    };

    const sub = AppState.addEventListener('change', handleChange);

    return () => {
      sub.remove();
    };
  }, []);

  return isForeground;
};
