import { MAX_PERMIT_ACCURACY } from '~/constants/location';
import { workerUrl } from './workerApi';

// Cloudflare Worker(/config/remote) 配信の設定キー。Worker 側のレスポンスキーと一致させる。
export const REMOTE_CONFIG_KEYS = {
  // 継続測位で受理する測位精度の上限(m)。これを超える測位はワープ対策で棄却される。
  MAX_PERMIT_ACCURACY: 'max_permit_accuracy',
  // 精度が最大許容精度を超えた際に到着判定を強制的に未到着へ倒す機能の有効/無効。
  FORCE_NOT_ARRIVED_ON_LOW_ACCURACY: 'force_not_arrived_on_low_accuracy',
  // ETAフォールバック(GPS精度劣化・喪失時にETAデータで接近/到着状態を推定する機能)の有効/無効。
  ETA_ASSIST_ENABLED: 'eta_assist_enabled',
  // ETAフォールバックの到着確定マージン(秒)。ETA上の到着時刻からこの秒数が経過するまでは
  // 到着確定を保留し、遅延時に早すぎる到着確定を防ぐ。
  ETA_FALLBACK_ARRIVAL_CONFIRM_MARGIN_SEC:
    'eta_fallback_arrival_confirm_margin_sec',
  // ETAフォールバックを継続してよい最大時間(分)。GPS喪失がこれを超えて続く場合は
  // フォールバックを打ち切り、不確実な推定に依存し続けないようにする。
  ETA_FALLBACK_MAX_DURATION_MIN: 'eta_fallback_max_duration_min',
} as const;

type RemoteConfigResponse = {
  max_permit_accuracy?: number;
  force_not_arrived_on_low_accuracy?: boolean;
  eta_assist_enabled?: boolean;
  eta_fallback_arrival_confirm_margin_sec?: number;
  eta_fallback_max_duration_min?: number;
};

// 精度超過時に到着判定を未到着へ強制する機能のフォールバック既定値。
// 既存挙動（常時有効）を維持するため true をフォールバックとする。
const FORCE_NOT_ARRIVED_ON_LOW_ACCURACY_FALLBACK = true;

// ETAフォールバック機能自体のフォールバック既定値。安全側に倒し、既定では無効とする。
const ETA_ASSIST_ENABLED_FALLBACK = false;
// ETAフォールバックの到着確定マージン(秒)のフォールバック既定値。
const ETA_FALLBACK_ARRIVAL_CONFIRM_MARGIN_SEC_FALLBACK = 30;
// ETAフォールバックを継続してよい最大時間(分)のフォールバック既定値。
const ETA_FALLBACK_MAX_DURATION_MIN_FALLBACK = 30;

// リモート設定の数値は「有限かつ正」のみ受理する(0・負値・非数はフォールバックへ倒す)。
// 真偽値や配列は Number() で 1 や 5 に化けるため、number 型に限定してから検証する。
const parsePositiveFiniteNumber = (value: unknown): number | null => {
  if (typeof value !== 'number') {
    return null;
  }
  return Number.isFinite(value) && value > 0 ? value : null;
};

// getMaxPermitAccuracy / isForceNotArrivedOnLowAccuracyEnabled 等はGPS更新のたびに
// 呼ばれるホットパスのため、起動時に /config/remote から取得した値をモジュール内に
// キャッシュし、以降は同期的に返す。取得失敗時はキャッシュせずフォールバックを返す。
let cachedMaxPermitAccuracy: number | null = null;
let cachedForceNotArrivedEnabled: boolean | null = null;
let cachedEtaAssistEnabled: boolean | null = null;
let cachedEtaFallbackArrivalConfirmMarginSec: number | null = null;
let cachedEtaFallbackMaxDurationMin: number | null = null;

// テスト用および値の再取得時にキャッシュを破棄する。
export const resetRemoteConfigCache = (): void => {
  cachedMaxPermitAccuracy = null;
  cachedForceNotArrivedEnabled = null;
  cachedEtaAssistEnabled = null;
  cachedEtaFallbackArrivalConfirmMarginSec = null;
  cachedEtaFallbackMaxDurationMin = null;
};

// 起動時に一度だけ Worker からリモート設定を取得しキャッシュへ格納する。
// 取得に失敗してもアプリは既定値で動作を継続するため、呼び出し側で握り潰さず
// 例外を素通しし、ロギングはエントリポイント側（index.js）に委ねる。
export const setupRemoteConfig = async (): Promise<void> => {
  resetRemoteConfigCache();
  const res = await fetch(workerUrl('/config/remote'));
  if (!res.ok) {
    throw new Error(`remote config fetch failed: ${res.status}`);
  }
  const data = (await res.json()) as RemoteConfigResponse;

  const maxAccuracy = parsePositiveFiniteNumber(data.max_permit_accuracy);
  if (maxAccuracy != null) {
    cachedMaxPermitAccuracy = maxAccuracy;
  }
  if (typeof data.force_not_arrived_on_low_accuracy === 'boolean') {
    cachedForceNotArrivedEnabled = data.force_not_arrived_on_low_accuracy;
  }
  if (typeof data.eta_assist_enabled === 'boolean') {
    cachedEtaAssistEnabled = data.eta_assist_enabled;
  }
  const arrivalConfirmMarginSec = parsePositiveFiniteNumber(
    data.eta_fallback_arrival_confirm_margin_sec
  );
  if (arrivalConfirmMarginSec != null) {
    cachedEtaFallbackArrivalConfirmMarginSec = arrivalConfirmMarginSec;
  }
  const maxDurationMin = parsePositiveFiniteNumber(
    data.eta_fallback_max_duration_min
  );
  if (maxDurationMin != null) {
    cachedEtaFallbackMaxDurationMin = maxDurationMin;
  }
};

// 最大許容精度(m)を同期的に取得する。setupRemoteConfig 完了後は取得済みの
// リモート値を、未完了・未設定・取得失敗時は MAX_PERMIT_ACCURACY をフォールバックとして返す。
// 0 や負値・非数といった不正値もフォールバックへ倒し、フィルタが無効化されるのを防ぐ。
export const getMaxPermitAccuracy = (): number => {
  if (cachedMaxPermitAccuracy != null) {
    return cachedMaxPermitAccuracy;
  }
  return MAX_PERMIT_ACCURACY;
};

// 精度超過時に到着判定を未到着へ強制する機能の有効/無効を同期的に取得する。
// setupRemoteConfig 完了後は取得済みのリモート値を、未設定・取得失敗時は
// フォールバック(true=既存挙動)を返す。
export const isForceNotArrivedOnLowAccuracyEnabled = (): boolean => {
  if (cachedForceNotArrivedEnabled != null) {
    return cachedForceNotArrivedEnabled;
  }
  return FORCE_NOT_ARRIVED_ON_LOW_ACCURACY_FALLBACK;
};

// ETAフォールバック機能の有効/無効を同期的に取得する。setupRemoteConfig 完了後は
// 取得済みのリモート値を、未設定・取得失敗時はフォールバック(false=既定無効)を返す。
export const isEtaAssistEnabled = (): boolean => {
  if (cachedEtaAssistEnabled != null) {
    return cachedEtaAssistEnabled;
  }
  return ETA_ASSIST_ENABLED_FALLBACK;
};

// ETAフォールバックの到着確定マージン(秒)を同期的に取得する。setupRemoteConfig 完了後は
// 取得済みのリモート値を、未完了・未設定・取得失敗時はフォールバックを返す。
// 0 や負値・非数といった不正値もフォールバックへ倒す。
export const getEtaFallbackArrivalConfirmMarginSec = (): number => {
  if (cachedEtaFallbackArrivalConfirmMarginSec != null) {
    return cachedEtaFallbackArrivalConfirmMarginSec;
  }
  return ETA_FALLBACK_ARRIVAL_CONFIRM_MARGIN_SEC_FALLBACK;
};

// ETAフォールバックを継続してよい最大時間(分)を同期的に取得する。setupRemoteConfig 完了後は
// 取得済みのリモート値を、未完了・未設定・取得失敗時はフォールバックを返す。
// 0 や負値・非数といった不正値もフォールバックへ倒す。
export const getEtaFallbackMaxDurationMin = (): number => {
  if (cachedEtaFallbackMaxDurationMin != null) {
    return cachedEtaFallbackMaxDurationMin;
  }
  return ETA_FALLBACK_MAX_DURATION_MIN_FALLBACK;
};
