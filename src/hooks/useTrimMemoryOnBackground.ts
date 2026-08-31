import { Image } from 'expo-image';
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

// expo-image のメモリキャッシュをバックグラウンド遷移時に破棄する。
//
// 本アプリは乗車中、位置情報フォアグラウンドサービスによってプロセスを常駐させる
// (useStartBackgroundLocationUpdates 参照)。そのため画面が見えていない間もデコード済み
// ビットマップが Glide のメモリキャッシュに残り続け、退去する契機がない。
// Google Play の技術品質要件 (2027年2月施行) は user-perceived service / background 状態で
// 200MB、cached 状態で 400MB のビットマップ使用量を上限としており、テーマプレビューのような
// 大判画像が滞留するとこれに抵触しうる。
//
// ディスクキャッシュは残す。次回表示のデコードが走るだけで、メモリ使用量には影響しないため。
export const useTrimMemoryOnBackground = (): void => {
  useEffect(() => {
    const handleChange = (state: AppStateStatus): void => {
      // 'inactive' は iOS のアプリスイッチャー表示などで頻発し、すぐ 'active' へ戻る。
      // ここで破棄すると復帰のたびに再デコードが走るため 'background' のみを対象にする。
      if (state !== 'background') {
        return;
      }
      Image.clearMemoryCache().catch(() => {});
    };

    const sub = AppState.addEventListener('change', handleChange);

    return () => {
      sub.remove();
    };
  }, []);
};
