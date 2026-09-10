import type * as Location from 'expo-location';
import getDistance from 'geolib/es/getDistance';
import { atom } from 'jotai';
import { LineType } from '~/@types/graphql';
import { BAD_ACCURACY_THRESHOLD } from '~/constants/threshold';
import { store } from '..';
import stationState from './station';

const MAX_ACCURACY_HISTORY = 12;

// 物理的にありえない速度でのジャンプを棄却する閾値(m/s ≒ 360km/h)
const MAX_PLAUSIBLE_SPEED = 100;

// スムージングスキップ経路(地下鉄かつ精度が不安定)で使う閾値(m/s ≒ 180km/h)。
// 新幹線を通すために緩めてある既定値(360km/h)をこの経路にも当てると、隣駅程度の
// 距離(500m〜1km)のワープが数秒で通ってしまう。GPSが届かずWi-Fi/基地局測位へ落ちる
// 区間ではその距離こそが典型的な誤りなので、棄却を保てる時間(距離÷この閾値)を
// 稼ぐために絞る。
//
// 値の根拠は「地下鉄の営業最高速度」ではなく「在来線の営業最高速度」に採る。
// 判定に使うlineTypeはstationState.station、すなわち最後に“到着した”駅のもので、
// 次駅へ到着するまで更新されない(useRefreshStation)。地下鉄から直通先へ抜けた
// 区間はまだSubway扱いのままこの経路を通るため、直通先の速度域を外すと正常な
// 走行を誤棄却する。在来線最速は京成成田スカイアクセス線の160km/hなので、
// それを上回る180km/hを採る。新幹線はlineTypeがBulletTrainでこの経路に入らない。
const MAX_PLAUSIBLE_SKIP_SMOOTHING_SPEED = 50;

// 速度フィルタが連続して棄却できる回数の上限。棄却しても基準座標は更新しないため、
// 基準側が実際の現在地から乖離している場合は正常な測位が延々と弾かれ、位置が
// 永久に凍結する。この回数に達したら「基準の方が誤っている」と判断し、届いた
// 測位で基準を張り直す(スキップ経路のみMIN_SPEED_REJECTION_STREAK_MSも課す)。
const MAX_CONSECUTIVE_SPEED_REJECTIONS = 5;

// スムージングスキップ経路(地下鉄)で基準を張り直すまでに最低限必要な経過時間(ms)。
// この経路は回数だけを条件にすると、ワープ耐性が測位の配信間隔に反比例してしまう。
// iOSはtimeIntervalが効かずdistanceInterval基準で概ね1Hz配信されるため5回=約5秒で
// 基準を明け渡すのに対し、Androidは10秒間隔なので約50秒粘る。同じ「配信間隔で
// 保護の強さが変わる」問題はEMAのα側では正規化済み(LEGACY_ALPHA_INTERVAL_SEC)。
//
// 本線経路にはこの条件を掛けない。あちらの閾値は360km/hで、超えるのは基準側が
// 誤っているときだけなので、#6898 は「5サンプルで即座に張り直す」ことで新幹線速度
// での現在地凍結を解消している。ここに経過時間を足すと凍結時間が配信の速い端末ほど
// 延び(1Hzなら5秒→20秒 ≒ 320km/hで1.8km)、その修正を打ち消してしまう。
// スキップ経路の閾値は120km/hで、誤測位のクラスタが数秒続く程度では基準を
// 明け渡さないことのほうが重要なため、こちらにだけ課す。
const MIN_SPEED_REJECTION_STREAK_MS = 20_000;

// 基準座標がこれ以上古い場合、EMAの基準としては意味を持たないため、速度フィルタを
// 通過したうえでスムージングせず新しい測位へスナップし、基準を張り直す。
// バックグラウンド測位の抑止(「常に許可」未設定)やトンネルで測位が数十分途切れた
// あと、EMAで混ぜると新しい測位のα割しか反映されず、残った遅れがそのまま次の
// 変位へ乗って再び速度超過になる、という復帰不能ループを防ぐ。
const STALE_REFERENCE_MS = 30_000;

// 固定αのEMAの追従遅れは、定速・一定間隔のとき ((1-α)/α)·v·Δt で、配信間隔Δtに比例する。
// 旧実装は精度ごとに固定のαを返していたため、Δtが変わると遅れも比例して変わった。
// 実際 #6395 でAndroidの更新間隔を5秒→10秒へ緩めた際、遅れがそのまま倍増し、
// 到着判定と「まもなく」表示が駅の直前までずれ込んだ（#6916）。
//
// 固定αは iOS の配信間隔(distanceInterval基準で概ね1Hz)を前提に調整された値なので、
// その前提を「追従遅れ時間(秒)」として取り出し、Δtからαを毎回組み立て直す。
// α = Δt / (Δt + T) とすると定速時の追従遅れは常にT秒ぶんの距離に収まり、
// 配信間隔が変わっても遅れが変わらない。Δt=1秒では旧実装のαと完全に一致する。
const LEGACY_ALPHA_INTERVAL_SEC = 1;

// 旧実装のαが1秒間隔で持っていた追従遅れ時間(秒)へ変換する
const legacyAlphaToLagSec = (alpha: number): number =>
  ((1 - alpha) / alpha) * LEGACY_ALPHA_INTERVAL_SEC;

// 精度がBAD_ACCURACY_THRESHOLDを超える帯だけは間隔正規化せず固定αを維持する。
// この帯では測位ノイズ(σ≒accuracy)が到着圏に対して大きく、スムージングが判定の
// 安定性そのものを担っている。正規化してαを上げると追従遅れは詰まるが、平滑後の
// 座標が到着圏を出入りして到着表示がばたつく。片町線快速のGPXにσ=250mを乗せて
// 10秒間隔で流すと、1区間で到着判定が3回立った(location.gpxLag.test.ts)。
// 追従遅れと安定性の積は配信間隔で決まるため、10秒間隔・σ=250mでは許容遅れを
// どこに置いても両立しない。精度が良い帯(σが到着圏に対して十分小さい)に限って
// 正規化する。
const LOW_ACCURACY_ALPHA = 0.3;

// GPS精度に応じた許容追従遅れ(秒)を返す（精度が良いほど新しい値を信頼して遅れを詰める）
const getSmoothingLagSec = (accuracy: number | null): number => {
  if (accuracy != null && accuracy > 0 && accuracy < 50) {
    return legacyAlphaToLagSec(0.8);
  }
  return legacyAlphaToLagSec(0.6);
};

// GPS精度と配信間隔に応じたスムージング重みを返す
const getSmoothingAlpha = (accuracy: number | null, dtSec: number): number => {
  // 間隔が測れない場合はスムージングせず新しい測位へスナップする。
  // 遅れを持たせる根拠が無いのに古い座標を混ぜると、位置が理由なく後ろへ引かれる。
  if (!Number.isFinite(dtSec) || dtSec <= 0) {
    return 1;
  }
  if (accuracy != null && accuracy >= BAD_ACCURACY_THRESHOLD) {
    return LOW_ACCURACY_ALPHA;
  }
  return dtSec / (dtSec + getSmoothingLagSec(accuracy));
};

// 精度履歴の安定性を変動係数(CV)で判定する
const MIN_STABILITY_SAMPLES = 4;
const MAX_STABLE_CV = 0.5;

const isAccuracyStable = (history: number[]): boolean => {
  if (history.length < MIN_STABILITY_SAMPLES) {
    return false;
  }
  const mean = history.reduce((sum, v) => sum + v, 0) / history.length;
  if (mean <= 0 || mean >= BAD_ACCURACY_THRESHOLD) {
    return false;
  }
  const variance =
    history.reduce((sum, v) => sum + (v - mean) ** 2, 0) / history.length;
  const stddev = Math.sqrt(variance);
  return stddev / mean < MAX_STABLE_CV;
};

export const locationAtom = atom<Location.LocationObject | null>(null);
// MAX_PERMIT_ACCURACYフィルタで棄却される測位も含めた、継続測位の生の値。
// handleTrackingLocation経由でwatch/background双方が更新し、DevOverlayの診断表示で
// 「フィルタで棄却された精度」も確認できるようにする。
// DevOverlayはisDevApp時しか描画されないので、更新もそのとき（isDevApp）だけ行えば十分。
export const rawLocationAtom = atom<Location.LocationObject | null>(null);
export const accuracyHistoryAtom = atom<number[]>([]);
export const backgroundLocationTrackingAtom = atom(false);

// 直近の継続測位がMAX_PERMIT_ACCURACYを超え、ワープ対策フィルタで棄却されたかを表す。
// 棄却時は座標を捨てる（=locationAtomが前回値で凍結する）ため、精度の悪化は
// locationAtom側の精度には現れない。この事実を別フラグとして残すことで、到着判定など
// 下流の処理が「現在位置を信用できない＝走行中」と扱えるようにする。
export const locationAccuracyOutlierAtom = atom(false);

// EMAスムージングの基準として使う「最後にフィルタ処理を通過した位置」
// 地下鉄モード中は更新しないため、モード復帰後にノイジーなprevで誤棄却されるのを防ぐ
const lastFilteredLocationAtom = atom<Location.LocationObject | null>(null);

// 速度フィルタの基準として使う「最後に受理した“生の”座標」。
// EMA後の座標を基準にすると、EMAの追従遅れ(定速時 ((1-α)/α)·v·dt)が変位へ上乗せ
// され、算出速度が実速度の 1/α 倍に膨らむ。実効的なしきい値が α×360km/h まで下がり、
// 精度が良くても288km/h、精度200m超では108km/hで棄却が始まるため、新幹線の320km/h
// 走行が丸ごと弾かれて位置が凍結していた。速度判定は生座標同士で行う。
const lastRawLocationAtom = atom<Location.LocationObject | null>(null);

// スムージングスキップ経路(地下鉄)専用の速度フィルタ基準。
// この経路はEMAを通さず生の座標をそのままUIへ反映するが、ワープ対策の速度フィルタまで
// 一緒に外すと、GPSが届かずWi-Fi/基地局測位へ落ちる地下鉄区間——もっともワープしやすい
// 場所——が無防備になる。EMA用の基準(lastFilteredLocationAtom / lastRawLocationAtom)は
// 地上復帰時にSTALE_REFERENCE_MSで張り直させるため据え置く必要があるので、
// 速度判定にだけ使う基準を別に持つ。
const lastSkipSmoothingLocationAtom = atom<Location.LocationObject | null>(
  null
);

// 速度フィルタが連続で棄却した回数。MAX_CONSECUTIVE_SPEED_REJECTIONSの判定に使う。
let consecutiveSpeedRejections = 0;
// 現在の連続棄却が始まった測位のタイムスタンプ(ms)。
// MIN_SPEED_REJECTION_STREAK_MSの判定に使う。
let speedRejectionStreakStartedAtMs = 0;

// テスト用: モジュール内部の状態をリセットする
export const resetLocationState = () => {
  store.set(locationAtom, null);
  store.set(rawLocationAtom, null);
  store.set(accuracyHistoryAtom, []);
  store.set(lastFilteredLocationAtom, null);
  store.set(lastRawLocationAtom, null);
  store.set(lastSkipSmoothingLocationAtom, null);
  store.set(locationAccuracyOutlierAtom, false);
  consecutiveSpeedRejections = 0;
  speedRejectionStreakStartedAtMs = 0;
};

// ワープ対策フィルタによる棄却有無を記録する。handleTrackingLocationから
// フィルタ判定の都度呼び出すこと。
export const setLocationAccuracyOutlier = (isOutlier: boolean) => {
  store.set(locationAccuracyOutlierAtom, isOutlier);
};

// MAX_PERMIT_ACCURACYフィルタで棄却される測位も含め、生の測位値を記録する。
// startLocationUpdatesAsync経路ではフィルタがsetLocation到達前に値を捨てるため、
// フィルタ前に本関数を呼ぶことで生の精度をDevOverlayから観測できるようにする。
// 呼び出し側でisDevApp判定を行い、本番ビルドでは更新しないこと。
export const setRawLocation = (location: Location.LocationObject) => {
  store.set(rawLocationAtom, location);
};

// 2点間の見かけの速度が物理的にありえない水準かを判定する。
// 経過時間が延びても「変位÷経過時間」の妥当性検査は成立するため、測位が長く途切れた
// 直後の1点にも適用できる。
const isImplausibleJump = (
  prev: Location.LocationObject,
  next: Location.LocationObject,
  maxSpeed: number
): boolean => {
  const dtSec = (next.timestamp - prev.timestamp) / 1000;
  if (!(dtSec > 0)) {
    return false;
  }
  const dist = getDistance(
    { latitude: prev.coords.latitude, longitude: prev.coords.longitude },
    { latitude: next.coords.latitude, longitude: next.coords.longitude }
  );
  return dist / dtSec > maxSpeed;
};

const resetSpeedRejectionStreak = () => {
  consecutiveSpeedRejections = 0;
  speedRejectionStreakStartedAtMs = 0;
};

// 速度フィルタによる棄却を記録し、基準を張り直すべきか(=基準側が誤っていると
// 判断すべきか)を返す。棄却が規定回数に達し、かつ経過時間の下限(minStreakMs、
// 本線経路は0)を満たしたときにだけ真を返す。
const registerSpeedRejection = (
  timestampMs: number,
  minStreakMs: number
): boolean => {
  // 連続棄却の開始時、および時計の巻き戻りで経過時間が測れなくなった場合は数え直す
  if (
    consecutiveSpeedRejections === 0 ||
    timestampMs < speedRejectionStreakStartedAtMs
  ) {
    consecutiveSpeedRejections = 0;
    speedRejectionStreakStartedAtMs = timestampMs;
  }
  consecutiveSpeedRejections += 1;

  return (
    consecutiveSpeedRejections >= MAX_CONSECUTIVE_SPEED_REJECTIONS &&
    timestampMs - speedRejectionStreakStartedAtMs >= minStreakMs
  );
};

// スムージングせず測位をそのまま反映し、EMA基準・速度フィルタ基準の双方を張り直す。
// 基準が無い(初回起動・地下鉄からの復帰)、基準が古すぎる、基準が誤っていると判断した
// 場合に使う。基準を両方とも生の測位へ揃えるのが要点で、片方だけ残すと次回の変位に
// 古い遅れが乗って誤棄却の引き金になる。
const resyncLocationReference = (
  location: Location.LocationObject,
  updatedHistory: number[]
) => {
  store.set(locationAtom, location);
  store.set(lastFilteredLocationAtom, location);
  store.set(lastRawLocationAtom, location);
  store.set(lastSkipSmoothingLocationAtom, location);
  store.set(accuracyHistoryAtom, updatedHistory);
  resetSpeedRejectionStreak();
};

// 受理した測位が反映される唯一の入口。継続測位の正常系に加え、ワンショット取得や
// 手動選択(StationSearchModal/useInitialNearbyStation/Privacy等)もここを通る。
export const setLocation = (location: Location.LocationObject) => {
  // 新しい測位を受け取った時点で「直近の測位が精度外れ値だった」状態は解消されるため、
  // ここで外れ値フラグを解除する。解除をhandleTrackingLocationだけに置くと、継続測位で
  // 一度立ったフラグがdirect setLocation経由の良好な測位では解除されず、arrivedがfalseに
  // 張り付く。座標棄却(speedフィルタ)で早期returnする経路でも精度自体は良好なため、
  // フィルタ判定より前で解除する。
  store.set(locationAccuracyOutlierAtom, false);

  const filteredPrev = store.get(lastFilteredLocationAtom);
  const rawPrev = store.get(lastRawLocationAtom);
  const currentHistory = store.get(accuracyHistoryAtom);
  const newAccuracy = location.coords.accuracy;

  const updatedHistory =
    newAccuracy != null && Number.isFinite(newAccuracy) && newAccuracy >= 0
      ? [...currentHistory, newAccuracy].slice(-MAX_ACCURACY_HISTORY)
      : currentHistory;

  // 地下鉄ではGPS信号が不安定なため原則スムージングをスキップするが、
  // 精度が安定している場合（地上区間など）はスムージングを適用する
  const currentLineType = store.get(stationState).station?.line?.lineType;
  const skipSmoothing =
    currentLineType === LineType.Subway && !isAccuracyStable(updatedHistory);

  // スムージングスキップ時はEMAを掛けず生の座標をUIへ反映するが、ワープ対策の
  // 速度フィルタだけは通す。地下鉄ではGPSが届かずWi-Fi/基地局測位へ落ちるため、
  // もっともらしい精度のまま数百m〜数km離れた別の駅付近の座標が届くことがあり、
  // ここを素通しにすると届いた瞬間に無関係な駅へ飛ぶ。iOSはtimeIntervalが効かず
  // 配信が速いぶん、この素通しがそのままワープの多さとして表面化する。
  //
  // EMA基準(lastFilteredLocationAtom)と速度フィルタ基準(lastRawLocationAtom)は
  // 従来どおり更新しない。地上復帰時に基準が古いままSTALE_REFERENCE_MSの判定へ
  // 掛かって張り直される流れを保つため。速度判定にはこの経路専用の基準を使う。
  if (skipSmoothing) {
    const skipPrev = store.get(lastSkipSmoothingLocationAtom);
    if (
      skipPrev != null &&
      isImplausibleJump(
        skipPrev,
        location,
        MAX_PLAUSIBLE_SKIP_SMOOTHING_SPEED
      ) &&
      // 棄却が続くのは基準側が誤っている可能性が高い。位置が凍結したまま復帰
      // できなくなるのを避けるため、上限に達したら棄却せず基準を張り直す。
      !registerSpeedRejection(location.timestamp, MIN_SPEED_REJECTION_STREAK_MS)
    ) {
      store.set(accuracyHistoryAtom, updatedHistory);
      return;
    }

    resetSpeedRejectionStreak();
    store.set(locationAtom, location);
    store.set(lastSkipSmoothingLocationAtom, location);
    store.set(accuracyHistoryAtom, updatedHistory);
    return;
  }

  // 基準が無い場合（初回起動時や地下鉄→地上の復帰直後）
  if (filteredPrev == null || rawPrev == null) {
    resyncLocationReference(location, updatedHistory);
    return;
  }

  // 前回の座標が存在する場合、速度ベースの異常値フィルタを適用する。
  // 基準は「生の前回座標」であってEMA後の座標ではない（lastRawLocationAtom参照）。
  //
  // 測位が長く途切れたあとでも、このフィルタは先に必ず通す。意味を失うのはEMAの方
  // (下のSTALE_REFERENCE_MS判定)だけで、変位÷経過時間という速度の妥当性検査は
  // 経過時間が延びても成立するため。ここを飛ばすと、間隔が空いた直後の1点に限って
  // ワープ対策が無効になる。
  // 物理的にありえない速度の場合は座標を棄却し、前回値を維持する
  if (isImplausibleJump(rawPrev, location, MAX_PLAUSIBLE_SPEED)) {
    // 棄却が続くのは基準側が誤っている可能性が高い。位置が凍結したまま
    // 復帰できなくなるのを避けるため、上限に達したら即座に基準を張り直す
    // (#6898: 新幹線速度での現在地凍結の解消。経過時間の条件は課さない)。
    if (registerSpeedRejection(location.timestamp, 0)) {
      resyncLocationReference(location, updatedHistory);
      return;
    }
    store.set(accuracyHistoryAtom, updatedHistory);
    return;
  }

  resetSpeedRejectionStreak();

  // 速度としては妥当だが基準が古すぎる場合、EMAの基準としては使えないため
  // スムージングせず生の座標へスナップして基準を張り直す。長く途切れたあとに
  // EMAで混ぜると新しい測位のα割しか反映されず、残った遅れが次回の変位へ乗って
  // 再棄却…という復帰不能ループの原因になる。
  if (location.timestamp - rawPrev.timestamp >= STALE_REFERENCE_MS) {
    resyncLocationReference(location, updatedHistory);
    return;
  }

  // EMA(指数移動平均)で座標をスムージングする
  // 精度が良いほど、また配信間隔が空くほどαが大きくなり、新しい測位値をより信頼する。
  // 間隔で正規化することで、追従遅れが配信間隔に依存しなくなる。
  const alpha = getSmoothingAlpha(
    newAccuracy,
    (location.timestamp - rawPrev.timestamp) / 1000
  );
  const smoothedLat =
    alpha * location.coords.latitude +
    (1 - alpha) * filteredPrev.coords.latitude;
  const smoothedLon =
    alpha * location.coords.longitude +
    (1 - alpha) * filteredPrev.coords.longitude;

  const smoothedLocation: Location.LocationObject = {
    ...location,
    coords: {
      ...location.coords,
      latitude: smoothedLat,
      longitude: smoothedLon,
    },
  };

  store.set(locationAtom, smoothedLocation);
  store.set(lastFilteredLocationAtom, smoothedLocation);
  // 速度フィルタの基準はスムージング前の生座標を保持する
  store.set(lastRawLocationAtom, location);
  // 地上→地下鉄の切り替わり直後の1点にもワープ対策が効くよう、スキップ経路の
  // 基準もここで揃えておく
  store.set(lastSkipSmoothingLocationAtom, location);
  store.set(accuracyHistoryAtom, updatedHistory);
};
