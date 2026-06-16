import { getInstallId } from './installId';
import { workerUrl } from './workerApi';

// Worker が発行する短期セッショントークン（Firebase ID トークンの代替）。
// /auth/token から取得し、有効期限手前まではメモリにキャッシュして使い回す。
let cached: { token: string; expiresAt: number } | null = null;
const EXPIRY_SKEW_MS = 60_000;

export const clearSessionToken = (): void => {
  cached = null;
};

export const getSessionToken = async (): Promise<string | null> => {
  const now = Date.now();
  if (cached && cached.expiresAt - EXPIRY_SKEW_MS > now) {
    return cached.token;
  }

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
