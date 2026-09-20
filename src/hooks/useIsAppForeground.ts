import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

// React Nativeのドキュメント(AppState)によると、'inactive'はiOSにだけある状態で、
// 「前景と背景を行き来する間」と「マルチタスク画面を開く・通知センターを開く・着信が
// あるといった、操作が一時的に届かない間」に入る。つまりアプリはまだ背景に入っていない。
// 'background'は「別のアプリにいる」「ホーム画面にいる」ときの状態で、こちらが背景。
// 'unknown'(初期状態が読めない環境)は前景と見なさない。前景でだけ動いてよい処理が
// 対象なので、判断が付かない間は動かさない側へ倒す。
const isForegroundState = (state: AppStateStatus): boolean =>
  state === 'active' || state === 'inactive';

/**
 * アプリが前景にあるかどうかを返す。
 *
 * useIsAppActiveとの違いは'inactive'の扱いだけで、あちらは'active'以外をすべてfalseに
 * する。表示要素の出し分け(PiPへ写り込ませない等)はそれでよいが、「前景でしか成立しない
 * 処理を動かしてよいか」の判断には狭すぎる。通知センターを開いただけでfalseになり、
 * このフックを依存に持つeffectが張り直される。
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
