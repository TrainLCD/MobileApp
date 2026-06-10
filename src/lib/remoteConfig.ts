import {
  fetchAndActivate,
  getRemoteConfig,
  getValue,
  setConfigSettings,
  setDefaults,
} from '@react-native-firebase/remote-config';
import { MAX_PERMIT_ACCURACY } from '~/constants/location';

// Firebase Remote Config のパラメータキー。コンソール側のキー名と一致させる。
export const REMOTE_CONFIG_KEYS = {
  // 継続測位で受理する測位精度の上限(m)。これを超える測位はワープ対策で棄却される。
  MAX_PERMIT_ACCURACY: 'max_permit_accuracy',
  // 精度が最大許容精度を超えた際に到着判定を強制的に未到着へ倒す機能の有効/無効。
  FORCE_NOT_ARRIVED_ON_LOW_ACCURACY: 'force_not_arrived_on_low_accuracy',
} as const;

// 精度超過時に到着判定を未到着へ強制する機能のフォールバック既定値。
// 既存挙動（常時有効）を維持するため true をフォールバックとする。
const FORCE_NOT_ARRIVED_ON_LOW_ACCURACY_FALLBACK = true;

// フェッチ前・取得失敗時に参照する既定値。フォールバックは従来の挙動を流用する。
const REMOTE_CONFIG_DEFAULTS = {
  [REMOTE_CONFIG_KEYS.MAX_PERMIT_ACCURACY]: MAX_PERMIT_ACCURACY,
  [REMOTE_CONFIG_KEYS.FORCE_NOT_ARRIVED_ON_LOW_ACCURACY]:
    FORCE_NOT_ARRIVED_ON_LOW_ACCURACY_FALLBACK,
} as const;

// 過度なフェッチを避けつつ当日中の値更新を取り込める間隔。
const MINIMUM_FETCH_INTERVAL_MILLIS = 60 * 60 * 1000; // 1時間

// getMaxPermitAccuracy / isForceNotArrivedOnLowAccuracyEnabled はGPS更新のたびに
// 呼ばれるホットパスのため、確定値が得られた後はFirebase SDKへの問い合わせを
// 省略するモジュール内キャッシュを持つ。フォールバックへ倒れたケースはキャッシュ
// せず、setupRemoteConfig完了(値の有効化)後の初回読み取りで確定値を拾い直す。
let cachedMaxPermitAccuracy: number | null = null;
let cachedForceNotArrivedEnabled: boolean | null = null;

// テスト用および値の再有効化時にキャッシュを破棄する。
export const resetRemoteConfigCache = (): void => {
  cachedMaxPermitAccuracy = null;
  cachedForceNotArrivedEnabled = null;
};

// 起動時に一度だけ既定値を登録し、リモート値をフェッチ＆有効化する。
// フェッチに失敗してもアプリは既定値で動作を継続するため、呼び出し側で握り潰さず
// 例外を素通しし、ロギングはエントリポイント側（index.js）に委ねる。
export const setupRemoteConfig = async (): Promise<void> => {
  const remoteConfig = getRemoteConfig();
  await setConfigSettings(remoteConfig, {
    minimumFetchIntervalMillis: MINIMUM_FETCH_INTERVAL_MILLIS,
  });
  await setDefaults(remoteConfig, REMOTE_CONFIG_DEFAULTS);
  await fetchAndActivate(remoteConfig);
  // 有効化前に読み取られた値が残らないよう、フェッチ＆有効化後に読み直させる
  resetRemoteConfigCache();
};

// 最大許容精度(m)を同期的に取得する。setupRemoteConfig 完了後は有効化済みの
// リモート値を、未完了・未設定・取得失敗時は MAX_PERMIT_ACCURACY をフォールバックとして返す。
// 0 や負値・非数といった不正値もフォールバックへ倒し、フィルタが無効化されるのを防ぐ。
export const getMaxPermitAccuracy = (): number => {
  if (cachedMaxPermitAccuracy != null) {
    return cachedMaxPermitAccuracy;
  }
  try {
    const value = getValue(
      getRemoteConfig(),
      REMOTE_CONFIG_KEYS.MAX_PERMIT_ACCURACY
    ).asNumber();
    if (Number.isFinite(value) && value > 0) {
      cachedMaxPermitAccuracy = value;
      return value;
    }
  } catch {
    // Remote Config 未初期化などのケースはフォールバックへ倒す。
  }
  return MAX_PERMIT_ACCURACY;
};

// 精度超過時に到着判定を未到着へ強制する機能の有効/無効を同期的に取得する。
// setupRemoteConfig 完了後はリモート値（既定値含む）を、未設定・取得失敗時は
// フォールバック(true=既存挙動)を返す。false は明示的な無効化と区別できないため、
// 値が未設定(source==='static')かどうかで真にフォールバックすべきかを判定する。
export const isForceNotArrivedOnLowAccuracyEnabled = (): boolean => {
  if (cachedForceNotArrivedEnabled != null) {
    return cachedForceNotArrivedEnabled;
  }
  try {
    const configValue = getValue(
      getRemoteConfig(),
      REMOTE_CONFIG_KEYS.FORCE_NOT_ARRIVED_ON_LOW_ACCURACY
    );
    if (configValue.getSource() === 'static') {
      return FORCE_NOT_ARRIVED_ON_LOW_ACCURACY_FALLBACK;
    }
    const enabled = configValue.asBoolean();
    cachedForceNotArrivedEnabled = enabled;
    return enabled;
  } catch {
    return FORCE_NOT_ARRIVED_ON_LOW_ACCURACY_FALLBACK;
  }
};
