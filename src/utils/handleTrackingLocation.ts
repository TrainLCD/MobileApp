import type * as Location from 'expo-location';
import { getMaxPermitAccuracy } from '~/lib/remoteConfig';
import {
  setLocation,
  setLocationAccuracyOutlier,
  setRawLocation,
} from '~/store/atoms/location';
import { isDevApp } from './isDevApp';
import {
  countLocationRejectedAsDuplicate,
  countLocationRejectedByAccuracy,
  recordLocationInput,
} from './locationPipelineStats';
import { monotonicNow } from './monotonicNow';

// システム時計の巻き戻りとみなす閾値(ms)。処理済みタイムスタンプが現在時刻より
// これ以上未来にある場合は時計が巻き戻されたと判断し、重複排除ガードをリセットする
// (リセットしないと時計が追いつくまで全測位が「古い」と誤判定され凍結する)。
const CLOCK_ROLLBACK_TOLERANCE_MS = 5_000;

// 継続・ワンショット測位で共有する処理済みタイムスタンプ。Android 16ではTaskManagerと
// watchPositionAsyncの2系統が同じ測位を配信するため(useStartBackgroundLocationUpdates)、
// これ以下のタイムスタンプの測位を重複・遅延再配信として破棄する基準に使う。
let lastProcessedTimestampMs = 0;

// 最後に本関数が測位を処理した時刻(monotonicNow基準)。配信からの経過時間を記録する。
// 精度フィルタで棄却される測位も配信は届いているので、棄却の前に記録する。
// 補完測位はこの経過時間に受信時の古さを足し、測位が更新されているかを判定する。
let lastProcessedAtMs: number | null = null;

// 受信時点で測位が既に何ms古かったか。配信の経過時間とは分けて持つ。
// #6969の配信記録は維持しつつ、補完測位では遅延配信を復旧と誤認しない。
// Date.nowとの比較は受信時だけ行い、その後は単調時計で経過を加算する。
let lastLocationAgeAtDeliveryMs = 0;

// テスト用: モジュール内部の重複排除状態をリセットする
export const resetTrackingLocationDedup = () => {
  lastProcessedTimestampMs = 0;
  lastProcessedAtMs = null;
  lastLocationAgeAtDeliveryMs = 0;
};

// 継続測位を最後に処理してからの経過時間(ms)。一度も処理していなければnull。
// 時刻ではなく経過時間を返すのは、呼び出し側が別の時計(Date.now)と引き算して
// しまう余地を無くすため。
export const getMsSinceLastTrackedLocation = (): number | null =>
  lastProcessedAtMs === null ? null : monotonicNow() - lastProcessedAtMs;

// iOS補完測位の途絶判定用。配信が来た直後でも、測位自体が古ければ取得を待たない。
// 単調時計のフォールバックが巻き戻った場合は負値をそのまま返し、既存の復旧経路へ渡す。
export const getTrackedLocationAgeMs = (): number | null => {
  const sinceDeliveryMs = getMsSinceLastTrackedLocation();
  if (sinceDeliveryMs === null || sinceDeliveryMs < 0) {
    return sinceDeliveryMs;
  }
  return lastLocationAgeAtDeliveryMs + sinceDeliveryMs;
};

// 補完測位は重複を受け取っても購読を閉じず、新しい測位を待つ。
// 時計が巻き戻った場合は共通入口と同じ条件で過去の基準を無効にする。
export const isNewTrackingLocation = (timestamp: number): boolean =>
  Number.isFinite(timestamp) &&
  timestamp >
    (lastProcessedTimestampMs > Date.now() + CLOCK_ROLLBACK_TOLERANCE_MS
      ? 0
      : lastProcessedTimestampMs);

// 時刻の判定と更新を同期して行う。ワンショットでは継続測位の配信時刻や
// 受信時の古さを更新せず、補完測位の開始を先送りしない。
const acceptLocationTimestamp = (timestamp: number): boolean => {
  if (!Number.isFinite(timestamp)) return false;
  if (lastProcessedTimestampMs > Date.now() + CLOCK_ROLLBACK_TOLERANCE_MS) {
    lastProcessedTimestampMs = 0;
  }
  if (timestamp <= lastProcessedTimestampMs) return false;
  lastProcessedTimestampMs = timestamp;
  return true;
};

// 駅検索・初回位置取得は最大許容精度による棄却を通さず、従来どおり
// setLocationへ渡す。古い応答では位置の更新だけを省略し、呼出元の検索は続行する。
export const setOneShotLocation = (location: Location.LocationObject): void => {
  if (!acceptLocationTimestamp(location.timestamp)) {
    countLocationRejectedAsDuplicate();
    return;
  }
  setLocation(location);
};

// watchPositionAsync / startLocationUpdatesAsync 双方の継続測位の共通入口。
// 経路ごとにMAX_PERMIT_ACCURACYの適用漏れが起きないよう、精度フィルタをここへ集約する。
// （駅検索などのワンショットはsetOneShotLocationへ通し、時刻判定だけ共有する）
export const handleTrackingLocation = (location: Location.LocationObject) => {
  // 重複・順序逆転した測位の破棄。Android 16(API 36)ではJobSchedulerクォータ対策で
  // TaskManagerとwatchPositionAsyncの直接コールバックを併用しており、同一の測位が
  // 2系統から届く。破棄しないと同じ測位にEMAスムージングが二重適用されて座標が歪み、
  // 下流の最寄り駅探索・到着判定・再レンダーも全て二重に走って電池を無駄に消費する。
  // また、クォータでスロットルされたTaskManagerのバッチが遅れて届いた場合、直接
  // コールバック済みの新しい測位より古い座標へ位置が引き戻されるのもここで防ぐ。
  if (!acceptLocationTimestamp(location.timestamp)) {
    // 破棄した事実だけ数える。重複排除はlastProcessedAtMsを更新する前に抜けるので、
    // 経過時間からは「OSが呼んでいない」状態と区別が付かない(locationPipelineStats)。
    countLocationRejectedAsDuplicate();
    return;
  }
  lastProcessedAtMs = monotonicNow();
  lastLocationAgeAtDeliveryMs = Number.isFinite(location.timestamp)
    ? Math.max(0, Date.now() - location.timestamp)
    : Number.POSITIVE_INFINITY;

  // 診断用の飛び幅記録。精度フィルタより前に置くのが要点で、地下で最も知りたい
  // 「棄却された生座標がどれだけ飛んでいたか」はここでしか観測できない
  // (rawLocationAtomは最新1件しか持たない)。
  recordLocationInput(location);

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
    countLocationRejectedByAccuracy();
    return;
  }

  setLocation(location);
};
