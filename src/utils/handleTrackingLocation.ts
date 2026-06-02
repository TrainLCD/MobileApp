import type * as Location from 'expo-location';
import { MAX_PERMIT_ACCURACY } from '~/constants/location';
import { setLocation, setRawLocation } from '~/store/atoms/location';
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
  if (accuracy != null && accuracy > MAX_PERMIT_ACCURACY) {
    return;
  }

  setLocation(location);
};
