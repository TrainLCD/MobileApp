import type * as Location from 'expo-location';
import { getMaxPermitAccuracy } from '~/lib/remoteConfig';
import {
  setLocation,
  setLocationAccuracyOutlier,
  setRawLocation,
} from '~/store/atoms/location';
import { isDevApp } from './isDevApp';

// watchPositionAsync / startLocationUpdatesAsync 双方の継続測位の共通入口。
// 経路ごとにMAX_PERMIT_ACCURACYの適用漏れが起きないよう、精度フィルタをここへ集約する。
// （getCurrentPositionAsyncによるワンショット取得や手動選択はsetLocationを直接呼ぶため対象外）
export const handleTrackingLocation = (location: Location.LocationObject) => {
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
