import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect } from 'react';
import { AppState } from 'react-native';

const KEEP_AWAKE_TAG = 'TrainLCDMainKeepAwake';

// expo-keep-awake (Android) の ExpoKeepAwakeManager.deactivate は currentActivity 取得時に
// 例外が発生すると tags Set からタグが除去されないまま中断する。その結果、次の activate が
// `if (!isActivated)` で短絡し、新しい Activity の window へ FLAG_KEEP_SCREEN_ON が
// 付け直されずに画面がスリープしてしまう（路線選択を繰り返すと再現）。
// マウント時と AppState 復帰時に deactivate → activate を順に呼び、ネイティブ側の tags Set を
// 強制的にクリアしてから新しい window にフラグを付け直す。cleanup の deactivate 例外は握りつぶす。
export const useKeepAwake = (): void => {
  useEffect(() => {
    let cancelled = false;

    const ensureActivated = async () => {
      try {
        await deactivateKeepAwake(KEEP_AWAKE_TAG);
      } catch {}
      if (cancelled) return;
      try {
        await activateKeepAwakeAsync(KEEP_AWAKE_TAG);
      } catch {}
    };

    ensureActivated();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        ensureActivated();
      }
    });

    return () => {
      cancelled = true;
      sub.remove();
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, []);
};
