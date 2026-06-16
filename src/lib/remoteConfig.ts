import { MAX_PERMIT_ACCURACY } from '~/constants/location';
import { workerUrl } from './workerApi';

// Cloudflare Worker(/config/remote) 配信の設定キー。Worker 側のレスポンスキーと一致させる。
export const REMOTE_CONFIG_KEYS = {
  // 継続測位で受理する測位精度の上限(m)。これを超える測位はワープ対策で棄却される。
  MAX_PERMIT_ACCURACY: 'max_permit_accuracy',
  // 精度が最大許容精度を超えた際に到着判定を強制的に未到着へ倒す機能の有効/無効。
  FORCE_NOT_ARRIVED_ON_LOW_ACCURACY: 'force_not_arrived_on_low_accuracy',
} as const;

type RemoteConfigResponse = {
  max_permit_accuracy?: number;
  force_not_arrived_on_low_accuracy?: boolean;
};

// 精度超過時に到着判定を未到着へ強制する機能のフォールバック既定値。
// 既存挙動（常時有効）を維持するため true をフォールバックとする。
const FORCE_NOT_ARRIVED_ON_LOW_ACCURACY_FALLBACK = true;

// getMaxPermitAccuracy / isForceNotArrivedOnLowAccuracyEnabled はGPS更新のたびに
// 呼ばれるホットパスのため、起動時に /config/remote から取得した値をモジュール内に
// キャッシュし、以降は同期的に返す。取得失敗時はキャッシュせずフォールバックを返す。
let cachedMaxPermitAccuracy: number | null = null;
let cachedForceNotArrivedEnabled: boolean | null = null;

// テスト用および値の再取得時にキャッシュを破棄する。
export const resetRemoteConfigCache = (): void => {
  cachedMaxPermitAccuracy = null;
  cachedForceNotArrivedEnabled = null;
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

  const maxAccuracy = Number(data.max_permit_accuracy);
  if (Number.isFinite(maxAccuracy) && maxAccuracy > 0) {
    cachedMaxPermitAccuracy = maxAccuracy;
  }
  if (typeof data.force_not_arrived_on_low_accuracy === 'boolean') {
    cachedForceNotArrivedEnabled = data.force_not_arrived_on_low_accuracy;
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
