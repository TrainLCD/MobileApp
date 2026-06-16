/**
 * セッション JWT（HS256）の発行・検証。Firebase 匿名認証の代替。
 * インストール ID を `sub` に持つ短期トークンを Worker が署名し、保護ルートで検証する。
 */
import type { Env } from '../../types';
import { CallableError } from '../callable';
import { base64UrlDecode, base64UrlEncode, timingSafeEqual } from '../crypto';

interface SessionPayload {
  sub: string;
  iat: number;
  exp: number;
}

const importHmacKey = (secret: string): Promise<CryptoKey> =>
  crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );

const sign = async (data: string, secret: string): Promise<string> => {
  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(data)
  );
  return base64UrlEncode(new Uint8Array(sig));
};

/** インストール ID から短期セッショントークンを発行する。 */
export const issueSessionToken = async (
  env: Env,
  installId: string
): Promise<{ token: string; expiresIn: number }> => {
  const ttl = Number(env.SESSION_TOKEN_TTL_SECONDS) || 3600;
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64UrlEncode(
    JSON.stringify({ sub: installId, iat: now, exp: now + ttl })
  );
  const signingInput = `${header}.${payload}`;
  const signature = await sign(signingInput, env.SESSION_JWT_SECRET);
  return { token: `${signingInput}.${signature}`, expiresIn: ttl };
};

/**
 * `Authorization: Bearer <jwt>` を検証し、uid（= sub）を返す。
 * 失敗時は CallableError('unauthenticated') を投げる。
 */
export const verifySessionToken = async (
  env: Env,
  authHeader: string | null
): Promise<string> => {
  const unauthenticated = () =>
    new CallableError('unauthenticated', 'Authentication required');

  if (!authHeader?.startsWith('Bearer ')) {
    throw unauthenticated();
  }
  const token = authHeader.slice('Bearer '.length).trim();
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw unauthenticated();
  }
  const [header, payload, signature] = parts;

  const expected = await sign(`${header}.${payload}`, env.SESSION_JWT_SECRET);
  if (!timingSafeEqual(expected, signature)) {
    throw unauthenticated();
  }

  let decoded: SessionPayload;
  try {
    decoded = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payload))
    ) as SessionPayload;
  } catch {
    throw unauthenticated();
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof decoded.exp !== 'number' || decoded.exp < now) {
    throw unauthenticated();
  }
  if (typeof decoded.sub !== 'string' || decoded.sub.length === 0) {
    throw unauthenticated();
  }
  return decoded.sub;
};
