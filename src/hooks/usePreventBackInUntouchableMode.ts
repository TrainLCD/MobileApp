import { useIsFocused } from '@react-navigation/native';
import { useAtomValue } from 'jotai';
import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { untouchableModeEnabledAtom } from '~/store/atoms/tuning';

/**
 * タッチ不可モード中に、Androidの戻るキー・戻るジェスチャーで走行画面から
 * 前の画面へ抜けてしまうのを防ぐ。
 *
 * iOSの画面端スワイプはMainStack側の `gestureEnabled: false` でネイティブごと
 * 無効化しているため、ここではJS側へ伝播してくるAndroidの戻る操作だけを握りつぶす。
 * beforeRemoveでの一律ブロックにしないのは、ディープリンクやクイックアクション
 * 由来のreset遷移まで巻き込んでしまい、誤操作でない遷移まで止まるため。
 */
export const usePreventBackInUntouchableMode = (): void => {
  const untouchableModeEnabled = useAtomValue(untouchableModeEnabledAtom);
  // 走行画面が前面にあるときだけ握りつぶす。上に積まれた画面からは通常どおり戻れる
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!untouchableModeEnabled || !isFocused) {
      return;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => true
    );
    return () => subscription.remove();
  }, [untouchableModeEnabled, isFocused]);
};
