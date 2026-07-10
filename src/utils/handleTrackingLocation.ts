import type * as Location from 'expo-location';
import { getMaxPermitAccuracy } from '~/lib/remoteConfig';
import {
  setLocation,
  setLocationAccuracyOutlier,
  setRawLocation,
} from '~/store/atoms/location';
import { isDevApp } from './isDevApp';

// システム時計の巻き戻りとみなす閾値(ms)。処理済みタイムスタンプが現在時刻より
// これ以上未来にある場合は時計が巻き戻されたと判断し、重複排除ガードをリセットする
// (リセットしないと時計が追いつくまで全測位が「古い」と誤判定され凍結する)。
const CLOCK_ROLLBACK_TOLERANCE_MS = 5_000;

// 最後に本関数で処理した測位のタイムスタンプ。Android 16ではTaskManagerと
// watchPositionAsyncの2系統が同じ測位を配信するため(useStartBackgroundLocationUpdates)、
// これ以下のタイムスタンプの測位を重複・遅延再配信として破棄する基準に使う。
let lastProcessedTimestampMs = 0;

// テスト用: モジュール内部の重複排除状態をリセットする
export const resetTrackingLocationDedup = () => {
  lastProcessedTimestampMs = 0;
};

// watchPositionAsync / startLocationUpdatesAsync 双方の継続測位の共通入口。
// 経路ごとにMAX_PERMIT_ACCURACYの適用漏れが起きないよう、精度フィルタをここへ集約する。
// （getCurrentPositionAsyncによるワンショット取得や手動選択はsetLocationを直接呼ぶため対象外）
export const handleTrackingLocation = (location: Location.LocationObject) => {
  // 重複・順序逆転した測位の破棄。Android 16(API 36)ではJobSchedulerクォータ対策で
  // TaskManagerとwatchPositionAsyncの直接コールバックを併用しており、同一の測位が
  // 2系統から届く。破棄しないと同じ測位にEMAスムージングが二重適用されて座標が歪み、
  // 下流の最寄り駅探索・到着判定・再レンダーも全て二重に走って電池を無駄に消費する。
  // また、クォータでスロットルされたTaskManagerのバッチが遅れて届いた場合、直接
  // コールバック済みの新しい測位より古い座標へ位置が引き戻されるのもここで防ぐ。
  if (lastProcessedTimestampMs > Date.now() + CLOCK_ROLLBACK_TOLERANCE_MS) {
    lastProcessedTimestampMs = 0;
  }
  if (location.timestamp <= lastProcessedTimestampMs) {
    return;
  }
  lastProcessedTimestampMs = location.timestamp;

  // DevOverlayの診断表示用に、フィルタで棄却される測位も生の値として記録する。
  // DevOverlayはisDevApp時しか描画されないため、本番ビルドでは記録しない。
  if (isDevApp) {
    setRawLocation(location);
  }

  const { accuracy } = location.coords;
  if (accuracy != null && accuracy > getMaxPermitAccuracy()) {
    // ワープ対策として座標自体は破棄するが、棄却が起きたことは記録する。
    // 座標を捨てるとlocationAtomが前回値で凍結し精度悪化が下流から見えなくなるため、
    // この外れ値フラグを介して到着判定に「位置を信用できない」状態を伝える。
    // フラグの解除は受理側のsetLocationに集約している（ワンショット取得・手動選択など
    // 本関数を経由しない経路でも確実に解除するため）。
    setLocationAccuracyOutlier(true);
    return;
  }

  setLocation(location);
};
