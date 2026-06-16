/**
 * GET /config/maintenance, GET /config/remote — KV 配信のアプリ設定。
 * Firestore(appConfig/maintenance) と Remote Config の代替。認証不要。
 */
import type { Env } from '../types';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=UTF-8',
  // 起動時 1 回取得 + 端末キャッシュ運用。エッジでも短時間キャッシュ。
  'cache-control': 'public, max-age=60',
};

interface MaintenanceConfig {
  underMaintenance: boolean;
}

interface RemoteConfig {
  max_permit_accuracy: number;
  force_not_arrived_on_low_accuracy: boolean;
}

// Remote Config のフォールバック既定（アプリ側 constants/location.ts と一致させる）
const REMOTE_DEFAULTS: RemoteConfig = {
  max_permit_accuracy: 1500,
  force_not_arrived_on_low_accuracy: true,
};

export const handleMaintenanceConfig = async (env: Env): Promise<Response> => {
  // KV 値が壊れた JSON だと get が例外を投げるため、フォールバックで握る
  const stored = await env.CONFIG_KV.get<MaintenanceConfig>(
    'config:maintenance',
    'json'
  ).catch(() => null);
  const body: MaintenanceConfig = {
    underMaintenance: stored?.underMaintenance === true,
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: JSON_HEADERS,
  });
};

export const handleRemoteConfig = async (env: Env): Promise<Response> => {
  const stored = await env.CONFIG_KV.get<Partial<RemoteConfig>>(
    'config:remote',
    'json'
  ).catch(() => null);
  const maxAccuracy = Number(stored?.max_permit_accuracy);
  const body: RemoteConfig = {
    max_permit_accuracy:
      Number.isFinite(maxAccuracy) && maxAccuracy > 0
        ? maxAccuracy
        : REMOTE_DEFAULTS.max_permit_accuracy,
    force_not_arrived_on_low_accuracy:
      typeof stored?.force_not_arrived_on_low_accuracy === 'boolean'
        ? stored.force_not_arrived_on_low_accuracy
        : REMOTE_DEFAULTS.force_not_arrived_on_low_accuracy,
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: JSON_HEADERS,
  });
};
