import {
  getMaxPermitAccuracy,
  isForceNotArrivedOnLowAccuracyEnabled,
} from '~/lib/remoteConfig';

/**
 * 現在位置を信用できない状態かを返す。
 *
 * 判定材料は2系統ある:
 *   1. 継続測位: handleTrackingLocationが最大許容精度超の測位を棄却して座標を凍結する
 *      ため、精度悪化はlocationAtom側には現れない。棄却の事実は外れ値フラグから判定する。
 *   2. ワンショット取得・手動選択: フィルタを経由せず粗い精度の測位がlocationAtomへ
 *      入りうるため、保持している精度を直接検査する。
 *
 * Remote Configのフィーチャートグルで無効化でき、無効時は常にfalse(＝信用する)を返す。
 *
 * useRefreshStationの強制未到着と、useEtaAnchorの発車記録の抑止が同じ条件を参照する。
 * 条件を2箇所へ書くと、片方だけ変わったときに「発車していないのに発車として記録される」
 * 状態へ戻るため、ここへ集約する。
 */
export const isLocationUntrustworthy = ({
  isAccuracyOutlier,
  accuracy,
}: {
  isAccuracyOutlier: boolean;
  accuracy: number | null | undefined;
}): boolean =>
  isForceNotArrivedOnLowAccuracyEnabled() &&
  (isAccuracyOutlier ||
    (accuracy != null && accuracy > getMaxPermitAccuracy()));
