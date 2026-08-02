import { getInstallId } from './installId';
import { workerUrl } from './workerApi';

// Worker が発行する短期セッショントークン（Firebase ID トークンの代替）。
// /auth/token から取得し、有効期限手前まではメモリにキャッシュして使い回す。
let cached: { token: string; expiresAt: number } | null = null;
// 取得中の Promise。先読み(チャット画面マウント時)と初回送信が競合したとき、
// /auth/token への POST を 1 回に共有するために保持する
let inflight: Promise<string | null> | null = null;
const EXPIRY_SKEW_MS = 60_000;

export const clearSessionToken = (): void => {
  cached = null;
};

const fetchSessionToken = async (): Promise<string | null> => {
  const now = Date.now();
  try {
    const installId = await getInstallId();
    const res = await fetch(workerUrl('/auth/token'), {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ installId }),
    });
    if (!res.ok) {
      console.warn(`[session] /auth/token returned ${res.status}`);
      return null;
    }
    const json = (await res.json()) as {
      token?: string;
      expiresIn?: number;
    };
    if (!json.token) {
      return null;
    }
    cached = {
      token: json.token,
      expiresAt: now + (json.expiresIn ?? 3600) * 1000,
    };
    return json.token;
  } catch (e) {
    console.warn('[session] failed to fetch session token:', e);
    return null;
  }
};

export const getSessionToken = async (): Promise<string | null> => {
  if (cached && cached.expiresAt - EXPIRY_SKEW_MS > Date.now()) {
    return cached.token;
  }
  // 取得中なら同じ Promise を返して二重 POST を避ける。失敗(null)も共有され、
  // 解決・拒否後は必ずクリアされるため次回呼び出しでは再取得される
  if (!inflight) {
    inflight = fetchSessionToken().finally(() => {
      inflight = null;
    });
  }
  return inflight;
};
