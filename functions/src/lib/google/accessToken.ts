/**
 * Google サービスアカウント鍵から OAuth2 アクセストークンを発行する（JWT bearer grant）。
 * Workers では ADC が使えないため自前で RS256 署名する。用途は Android Publisher のみ。
 */
import { base64UrlEncode, pemToArrayBuffer } from '../crypto';

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

interface CachedToken {
  token: string;
  expiresAt: number; // epoch seconds
}

// scope 別に isolate 内でキャッシュ
const tokenCache = new Map<string, CachedToken>();

const importPrivateKey = (pem: string): Promise<CryptoKey> =>
  crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(pem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

/** scope に対する Google アクセストークンを取得（キャッシュ付き）。 */
export const getGoogleAccessToken = async (
  saKeyJson: string,
  scope: string
): Promise<string> => {
  const cached = tokenCache.get(scope);
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.expiresAt - 60 > now) {
    return cached.token;
  }

  const sa = JSON.parse(saKeyJson) as ServiceAccountKey;
  const tokenUri = sa.token_uri ?? 'https://oauth2.googleapis.com/token';

  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64UrlEncode(
    JSON.stringify({
      iss: sa.client_email,
      scope,
      aud: tokenUri,
      iat: now,
      exp: now + 3600,
    })
  );
  const signingInput = `${header}.${claims}`;

  const key = await importPrivateKey(sa.private_key);
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput)
  );
  const jwt = `${signingInput}.${base64UrlEncode(new Uint8Array(sig))}`;

  const res = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(
      `Google token exchange failed ${res.status}: ${detail.slice(0, 300)}`
    );
  }

  const json = (await res.json()) as {
    access_token?: unknown;
    expires_in?: unknown;
  };
  if (typeof json.access_token !== 'string' || json.access_token.length === 0) {
    throw new Error('Google token response missing access_token');
  }
  const expiresIn =
    typeof json.expires_in === 'number' && json.expires_in > 0
      ? json.expires_in
      : 3600;
  tokenCache.set(scope, {
    token: json.access_token,
    expiresAt: now + expiresIn,
  });
  return json.access_token;
};
