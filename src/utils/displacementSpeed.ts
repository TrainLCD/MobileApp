import type * as Location from 'expo-location';
import getDistance from 'geolib/es/getDistance';

type SpeedSample = Pick<Location.LocationObject, 'coords' | 'timestamp'>;

// 測位が速度を運んでこない環境向けに、直近 2 点の変位から速度(m/s)を求める。
//
// Android のテストプロバイダ(`adb shell cmd location providers`)には速度を渡す
// 引数が無い。`set-test-provider-location` が受けるのは --location / --accuracy /
// --time だけで、`add-test-provider --supportsSpeed` はプロバイダの能力を宣言する
// だけの値である。さらに expo-location は `Location#getSpeed()` を素通しするため
// (LocationResults.kt)、速度が無い測位は null ではなく 0 として届く。
// 結果として GPX 再生中は DEV OVERLAY の速度が 0km/h に張り付く。
//
// 実測の速度が取れているならそちらが常に優先で、この算出値は実測が出てこない間の
// 代替にすぎない。呼び出し側(DevOverlay)が実測の有無を判定して使い分ける。
export const getDisplacementSpeed = (
  prev: SpeedSample | null | undefined,
  current: SpeedSample | null | undefined
): number | null => {
  if (!prev || !current) {
    return null;
  }

  // 同一タイムスタンプの再配信では変位も経過時間も意味を持たない。
  // 0 除算で Infinity を出すより、算出不能として前回値を残させる。
  const dt = (current.timestamp - prev.timestamp) / 1000;
  if (!Number.isFinite(dt) || dt <= 0) {
    return null;
  }

  const dist = getDistance(
    { latitude: prev.coords.latitude, longitude: prev.coords.longitude },
    {
      latitude: current.coords.latitude,
      longitude: current.coords.longitude,
    }
  );
  if (!Number.isFinite(dist)) {
    return null;
  }

  return dist / dt;
};

// 測位が「実際に速度を持っている」と言えるかを判定する。
// Android は速度が未設定でも 0 を返すため、0 と欠測を値だけでは区別できない。
// 正の値を一度でも観測できたかどうかで判断し、観測できた以降は 0(停車)も
// 実測として扱う ―― 判定を呼び出し側で保持させるための述語。
export const hasMeasuredSpeed = (
  speed: number | null | undefined
): speed is number => speed != null && Number.isFinite(speed) && speed > 0;
