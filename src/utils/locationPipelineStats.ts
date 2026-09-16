import type * as Location from 'expo-location';
import getDistance from 'geolib/es/getDistance';

/**
 * 測位パイプラインの判定内訳と、入力座標の飛び幅を数える。DevOverlayの診断表示専用で、
 * パイプラインの判定には一切使わない。
 *
 * 受理済みの測位(locationAtom)の値だけでは「測位がそもそも届いていない」のか
 * 「届いているがどこかで捨てている」のかが区別できない。とりわけ
 * handleTrackingLocation の重複排除は lastProcessedAtMs を更新する**前**に return
 * するため、経過時間からは「OSが呼んでいない」状態と見分けが付かない。どの門で何件
 * 落ちたかは、判定箇所そのもので数える以外に取る方法がない。
 *
 * isDevApp や Remote Config で分岐させない。カナリアやフラグでだけ通る経路を測位
 * パイプラインへ作ると、本番と挙動が違うことを忘れたまま次の変更を重ねることになる。
 * ここで行うのは整数のインクリメントと固定長配列への push だけで、atom を書かない
 * ため購読側の再レンダーも起きない。
 */

/**
 * 測位1件あたりの排他的な処理結果。すべて足すとパイプラインへ入った件数になる。
 *
 * 排他にするのは、内訳の合計が入力件数と一致しないと「落ちていない」のか
 * 「数え漏らしている」のかが読めなくなるため。速度フィルタが連続棄却の上限に達して
 * 基準を張り直す経路は locationAtom を書くので accepted に数える(棄却ではない)。
 */
export type LocationPipelineCounts = {
  /**
   * setLocation が locationAtom を書いた件数。継続測位に加え、ワンショット取得・
   * 手動選択も含む。オートモードのシミュレーション(useSimulationMode)と NowHeader は
   * setLocation を経由せず locationAtom を直接書くため、これらは含まない。
   */
  accepted: number;
  /** handleTrackingLocation の最大許容精度フィルタで棄却した件数 */
  rejectedByAccuracy: number;
  /** handleTrackingLocation の重複排除(同一・逆転タイムスタンプ)で棄却した件数 */
  rejectedAsDuplicate: number;
  /** setLocation でETAが許す進行量を超えたとして棄却した件数 */
  rejectedByEta: number;
  /** setLocation の速度フィルタで棄却した件数(基準を張り直した回は含まない) */
  rejectedBySpeed: number;
};

const createCounts = (): LocationPipelineCounts => ({
  accepted: 0,
  rejectedByAccuracy: 0,
  rejectedAsDuplicate: 0,
  rejectedByEta: 0,
  rejectedBySpeed: 0,
});

let counts = createCounts();

// 入力座標の飛び幅の履歴長。精度履歴(MAX_ACCURACY_HISTORY)と同じ長さに揃え、
// 診断表示で同じ時間幅を見ているようにする。
const MAX_DISPLACEMENT_HISTORY = 12;

let displacementHistory: number[] = [];
let lastInputCoords: { latitude: number; longitude: number } | null = null;

export const countAcceptedLocation = (): void => {
  counts.accepted += 1;
};

export const countLocationRejectedByAccuracy = (): void => {
  counts.rejectedByAccuracy += 1;
};

export const countLocationRejectedAsDuplicate = (): void => {
  counts.rejectedAsDuplicate += 1;
};

export const countLocationRejectedByEta = (): void => {
  counts.rejectedByEta += 1;
};

export const countLocationRejectedBySpeed = (): void => {
  counts.rejectedBySpeed += 1;
};

/**
 * 継続測位で届いた測位を記録し、直前の入力からの距離(m)を履歴へ積む。
 *
 * handleTrackingLocation が重複排除を通ったあと、**精度フィルタより前**に呼ぶ。
 * 地下で知りたいのは「棄却された生座標がどれだけ飛んでいたか」で、精度フィルタの
 * あとに置くとその一番見たい区間が丸ごと抜ける(rawLocationAtomは最新1件しか持たない)。
 *
 * 逆に、setLocation を直接呼ぶ経路(手動での駅選択・起動時のワンショット取得)は
 * 対象外にしている。手動選択は意図的な瞬間移動なので、測位の飛び幅として混ぜると
 * 履歴の意味が壊れる。
 *
 * 棄却された測位でも基準は常に更新するため、次の距離は隣り合う入力同士の距離になる。
 * セッション最初の1件は基準が無いので積まない(履歴が1件短くなる)。
 */
export const recordLocationInput = (
  location: Location.LocationObject
): void => {
  const { latitude, longitude } = location.coords;
  const current = { latitude, longitude };
  if (lastInputCoords !== null) {
    displacementHistory = [
      ...displacementHistory,
      getDistance(lastInputCoords, current),
    ].slice(-MAX_DISPLACEMENT_HISTORY);
  }
  lastInputCoords = current;
};

export const getLocationPipelineCounts = (): LocationPipelineCounts => ({
  ...counts,
});

export const getLocationInputDisplacementHistory = (): number[] => [
  ...displacementHistory,
];

/** テスト用・状態リセット用: 集計をすべて初期化する */
export const resetLocationPipelineStats = (): void => {
  counts = createCounts();
  displacementHistory = [];
  lastInputCoords = null;
};
