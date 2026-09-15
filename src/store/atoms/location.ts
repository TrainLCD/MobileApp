import type * as Location from 'expo-location';
import getDistance from 'geolib/es/getDistance';
import { atom } from 'jotai';
import { LineType } from '~/@types/graphql';
import { BAD_ACCURACY_THRESHOLD } from '~/constants/threshold';
import { getEtaPhaseNow } from '~/utils/etaPhaseNow';
import { isBeyondEtaProgress } from '~/utils/etaProgressBound';
import { store } from '..';
import { etaAnchorAtom, etaStopsAtom } from './etaFallback';
import stationState from './station';

const MAX_ACCURACY_HISTORY = 12;

// 物理的にありえない速度でのジャンプを棄却する閾値(m/s ≒ 360km/h)
const MAX_PLAUSIBLE_SPEED = 100;

// 速度フィルタが連続して棄却できる回数の上限。棄却しても基準座標は更新しないため、
// 基準側が実際の現在地から乖離している場合は正常な測位が延々と弾かれ、位置が
// 永久に凍結する。この回数に達したら「基準の方が誤っている」と判断し、届いた
// 測位で基準を張り直す。
const MAX_CONSECUTIVE_SPEED_REJECTIONS = 5;

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
// 地下鉄モード中はnullへ落とすため、モード復帰後の最初の測位がノイジーなprevと混ざらない
const lastFilteredLocationAtom = atom<Location.LocationObject | null>(null);

// 速度フィルタの基準として使う「最後に受理した“生の”座標」。地下鉄モード中も更新する
// (更新しないと地下にいるあいだ検査の相手が無く、速度フィルタが一度も働かない)。
// EMA後の座標を基準にすると、EMAの追従遅れ(定速時 ((1-α)/α)·v·dt)が変位へ上乗せ
// され、算出速度が実速度の 1/α 倍に膨らむ。実効的なしきい値が α×360km/h まで下がり、
// 精度が良くても288km/h、精度200m超では108km/hで棄却が始まるため、新幹線の320km/h
// 走行が丸ごと弾かれて位置が凍結していた。速度判定は生座標同士で行う。
const lastRawLocationAtom = atom<Location.LocationObject | null>(null);

// 速度フィルタが連続で棄却した回数。MAX_CONSECUTIVE_SPEED_REJECTIONSの判定に使う。
let consecutiveSpeedRejections = 0;

// テスト用: モジュール内部の状態をリセットする
export const resetLocationState = () => {
  store.set(locationAtom, null);
  store.set(rawLocationAtom, null);
  store.set(accuracyHistoryAtom, []);
  store.set(lastFilteredLocationAtom, null);
  store.set(lastRawLocationAtom, null);
  store.set(locationAccuracyOutlierAtom, false);
  consecutiveSpeedRejections = 0;
  resetEtaBoundHold();
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
  store.set(accuracyHistoryAtom, updatedHistory);
  consecutiveSpeedRejections = 0;
};

// ETAの進行量上限から外れた測位を、何駅ぶんまで許容するか。単位は「停車駅」で、
// 通過駅は数に入れない(isBeyondEtaProgressにstopStationIdsを渡す)。
// ETAは停車時間や加減速の見積もりぶん実際とずれるので、隣の停車駅1つぶんの余裕を持たせる。
const ETA_BOUND_TOLERANCE_STATIONS = 1;

// ETAによる棄却を続けてよい上限(ms)。ETA側が誤っている場合に位置が凍結し続けないための保険。
const ETA_BOUND_MAX_HOLD_MS = 90_000;

let etaBoundHoldStartedAtMs = 0;

// 上限時間に達して「ETA側が誤っている」と判断した状態。値は判断した時点のETAの文脈
// (アンカー駅・種別・対象駅)で、同じ文脈が続くあいだは棄却を再開しない。
// 1件だけ受理して棄却を再開すると、範囲外の測位が上限時間ごとに1件しか通らず、
// 位置が実質凍結したままになる(=保険が機能しない)。
let etaBoundBypassedContext: string | null = null;

const resetEtaBoundHold = () => {
  etaBoundHoldStartedAtMs = 0;
  etaBoundBypassedContext = null;
};

/** ETAの進行量上限の素の判定。打ち切り(ETA_BOUND_MAX_HOLD_MS)の状態は見ない。 */
const evaluateEtaProgressBound = (
  anchorStationId: number,
  targetStationId: number,
  location: Location.LocationObject
): boolean =>
  isBeyondEtaProgress({
    stations: store.get(stationState).stations,
    anchorStationId,
    targetStationId,
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    toleranceStations: ETA_BOUND_TOLERANCE_STATIONS,
    // 許容は停車駅単位で数える。stationsは通過駅を含むため、ETA側の停車駅リストを
    // 渡さないと急行の通過駅ぶんだけ許容が目減りする。
    stopStationIds: store.get(etaStopsAtom).map((s) => s.stationId),
  });

/**
 * ETAから見て「そこまで進んでいるはずがない」位置か。打ち切りの状態を見ない素の判定で、
 * ETAが無効・アンカーが無い等で判断できない場合は false(＝意見なし)を返す。
 *
 * isImplausibleByEta と違い、こちらは「受理するか」ではなく「基準として採用してよいか」を
 * 決めるために使う。打ち切りは位置が凍結し続けないための保険なので、打ち切り中でも
 * 「ETAはここまで進めないと言っている」という事実自体は残り、基準の張り直しには使える。
 */
const isBeyondEtaProgressNow = (location: Location.LocationObject): boolean => {
  const anchor = store.get(etaAnchorAtom);
  const phase = getEtaPhaseNow(location.timestamp);
  if (!anchor || !phase) {
    return false;
  }
  const targetStationId =
    phase.kind === 'DWELLING' ? phase.stationId : phase.targetStationId;
  return evaluateEtaProgressBound(anchor.stationId, targetStationId, location);
};

/**
 * ETAが許す進行量を超えた測位か。超えていれば受理せず、位置を据え置く。
 * ETAは位置を進めない(#6369の方針)ので、棄却にのみ使う。
 */
const isImplausibleByEta = (location: Location.LocationObject): boolean => {
  const anchor = store.get(etaAnchorAtom);
  const phase = getEtaPhaseNow(location.timestamp);
  if (!anchor || !phase) {
    resetEtaBoundHold();
    return false;
  }
  const targetStationId =
    phase.kind === 'DWELLING' ? phase.stationId : phase.targetStationId;

  // アンカーが張り直された(次駅へ到着した等)ならETAは新しい観測に基づくので、
  // 打ち切り状態を解除して再び信用する。
  const context = `${anchor.stationId}:${anchor.kind}:${targetStationId}`;
  if (etaBoundBypassedContext !== null && etaBoundBypassedContext !== context) {
    resetEtaBoundHold();
  }

  const beyond = evaluateEtaProgressBound(
    anchor.stationId,
    targetStationId,
    location
  );
  if (!beyond) {
    // 範囲内の測位が届いた＝ETAと実測が再び噛み合った
    resetEtaBoundHold();
    return false;
  }
  if (etaBoundBypassedContext === context) {
    return false;
  }
  if (
    etaBoundHoldStartedAtMs === 0 ||
    location.timestamp < etaBoundHoldStartedAtMs
  ) {
    etaBoundHoldStartedAtMs = location.timestamp;
  }
  if (location.timestamp - etaBoundHoldStartedAtMs >= ETA_BOUND_MAX_HOLD_MS) {
    etaBoundBypassedContext = context;
    etaBoundHoldStartedAtMs = 0;
    return false;
  }
  return true;
};

/**
 * ノイズ控除に使える精度(m)。未取得・非数・負値はノイズの大きさを表さないので0として扱う。
 * NaNをそのまま控除に使うと比較が常にfalseになり、フィルタが静かに無効化される。
 */
const usableAccuracy = (accuracy: number | null | undefined): number =>
  accuracy != null && Number.isFinite(accuracy) && accuracy > 0 ? accuracy : 0;

/**
 * 見かけ速度が物理的にありえない跳躍か。判定は生座標同士で行う(lastRawLocationAtom参照)。
 *
 * noiseMarginMeters は「変位のうち測位ノイズで説明が付く量」で、これを差し引いた残りだけを
 * 実際の移動とみなす。地下鉄分岐は平滑化を掛けない生の座標を相手にするため、控除が無いと
 * ノイズだけで閾値へ届き、#5665 が分岐ごとフィルタを外す原因になった誤棄却が再発する。
 * 平滑化を通す本線側は控除しない(0を渡す)。精度が安定した帯でしか通らない経路なので、
 * 控除すると 1Hz 配信では予算(MAX_PLAUSIBLE_SPEED×Δt=100m)を精度が上回り、フィルタが
 * 実質無効になる。
 */
const isImplausibleBySpeed = (
  location: Location.LocationObject,
  rawPrev: Location.LocationObject,
  noiseMarginMeters: number
): boolean => {
  const dt = (location.timestamp - rawPrev.timestamp) / 1000; // 秒
  if (dt <= 0) {
    return false;
  }
  const dist = getDistance(
    {
      latitude: rawPrev.coords.latitude,
      longitude: rawPrev.coords.longitude,
    },
    {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    }
  );
  const explainedByNoise = Math.max(dist - noiseMarginMeters, 0);
  return explainedByNoise / dt > MAX_PLAUSIBLE_SPEED;
};

/** 速度フィルタが棄却した測位の後始末。棄却を数え、上限に達したら基準を張り直す。 */
const handleSpeedRejection = (
  location: Location.LocationObject,
  updatedHistory: number[]
) => {
  consecutiveSpeedRejections += 1;
  // 棄却が続くのは基準側が誤っている可能性が高い。位置が凍結したまま復帰できなく
  // なるのを避けるため、上限に達したら届いた測位で基準を張り直す。
  //
  // ただしETAが「そこまで進んでいるはずがない」と言える測位では張り直さない。
  // ETA側の打ち切り(ETA_BOUND_MAX_HOLD_MS)は「位置を永久に凍結させない」ための保険で、
  // 打ち切り後は範囲外の測位も受理へ回るため、ここで無条件に基準を張り直すと
  // 一貫した誤測位のクラスタが上限回数ぶん粘っただけで基準ごと乗っ取られる
  // (地下鉄で数駅先へ飛んで戻らない)。ETAが判断できない場合(無効・アンカー無し)は
  // 意見なしとして従来どおり張り直す。張り直さなかった場合も棄却数は数え続けるので、
  // ETAが認める測位が届いた時点で即座に張り直される。
  if (
    consecutiveSpeedRejections >= MAX_CONSECUTIVE_SPEED_REJECTIONS &&
    !isBeyondEtaProgressNow(location)
  ) {
    resyncLocationReference(location, updatedHistory);
    return;
  }
  store.set(accuracyHistoryAtom, updatedHistory);
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

  // 変位のうち測位ノイズで説明が付く量。基準側と今回の精度の和で見積もる。
  // 平滑化を通さない経路(地下鉄分岐と、その直後にEMA基準が無いまま本経路へ移った場合)は
  // 生のノイズをそのまま相手にするため、この控除が要る。
  const noiseMarginMeters =
    usableAccuracy(rawPrev?.coords.accuracy) + usableAccuracy(newAccuracy);

  // ETAが許す進行量を超えた測位は、どちらの経路へも通さない
  if (isImplausibleByEta(location)) {
    store.set(accuracyHistoryAtom, updatedHistory);
    return;
  }

  // スムージングスキップ時はEMAを掛けず、UIへ生の座標をそのまま反映する。
  //
  // 平滑化だけを外し、ワープ対策の速度フィルタは通す。#5665 がこの分岐ごと速度フィルタを
  // 外したのは、当時の基準がEMA後の座標で追従遅れが変位へ乗っていたうえ、誤棄却からの
  // 脱出口(MAX_CONSECUTIVE_SPEED_REJECTIONS / STALE_REFERENCE_MS)も無く、一度弾き始めると
  // 位置が永久に凍結したためで、フィルタが不要と判断されたわけではない。基準は生座標へ
  // 移り(lastRawLocationAtom)、脱出口も揃った現在は、測位ノイズぶんを差し引いた妥当性検査を
  // 掛けられる。掛けないと、地下で基地局測位が数km離れた駅へ張り付いたときに、その座標が
  // 検査を一切受けずにlocationAtomへ入る。
  if (skipSmoothing) {
    if (
      rawPrev != null &&
      isImplausibleBySpeed(location, rawPrev, noiseMarginMeters)
    ) {
      handleSpeedRejection(location, updatedHistory);
      return;
    }
    store.set(locationAtom, location);
    // 速度フィルタの基準としては維持する。維持しないと次の測位を検査する相手が無く、
    // 地下にいるあいだフィルタが一度も働かない。
    store.set(lastRawLocationAtom, location);
    // EMAの基準にはしない。地上復帰後の最初の測位はノイジーなこの座標と混ぜず、
    // 基準が無い場合の経路(resyncLocationReference)で張り直させる。
    store.set(lastFilteredLocationAtom, null);
    store.set(accuracyHistoryAtom, updatedHistory);
    consecutiveSpeedRejections = 0;
    return;
  }

  // 基準が無い場合（初回起動時）
  if (rawPrev == null) {
    resyncLocationReference(location, updatedHistory);
    return;
  }

  // 速度フィルタの基準はあるがEMAの基準が無い場合（地下鉄分岐からの復帰直後）。
  // 平滑化はできないので生の測位へスナップするが、妥当性の検査は通す。
  // 素通りさせると、地下鉄分岐で棄却が続いている最中に精度履歴が安定して本経路へ
  // 移った瞬間、その測位が無検査で受理され、連続棄却の上限(#6899)も回避される。
  // 基準が地下鉄分岐由来のノイジーな座標でありうるので、控除は地下鉄分岐と同じにする。
  if (filteredPrev == null) {
    if (isImplausibleBySpeed(location, rawPrev, noiseMarginMeters)) {
      handleSpeedRejection(location, updatedHistory);
      return;
    }
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
  if (isImplausibleBySpeed(location, rawPrev, 0)) {
    handleSpeedRejection(location, updatedHistory);
    return;
  }

  consecutiveSpeedRejections = 0;

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
  store.set(accuracyHistoryAtom, updatedHistory);
};
