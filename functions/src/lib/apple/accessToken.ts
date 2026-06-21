/**
 * App Store Connect API 用 JWT を生成する（ES256 署名）。
 * Workers では Apple SDK が使えないため自前で署名する。
 */
import { base64UrlEncode, pemToArrayBuffer } from '../crypto';

interface AppStoreConnectKey {
  keyId: string;
  issuerId: string;
  privateKey: string;
}

const importEcPrivateKey = (pem: string): Promise<CryptoKey> =>
  crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(pem),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

export const createAppStoreConnectJwt = async (
  keyJson: string
): Promise<string> => {
  const key = JSON.parse(keyJson) as AppStoreConnectKey;
  const now = Math.floor(Date.now() / 1000);

  const header = base64UrlEncode(
    JSON.stringify({ alg: 'ES256', kid: key.keyId, typ: 'JWT' })
  );
  const claims = base64UrlEncode(
    JSON.stringify({
      iss: key.issuerId,
      iat: now,
      exp: now + 1200,
      aud: 'appstoreconnect-v1',
    })
  );
  const signingInput = `${header}.${claims}`;

  const cryptoKey = await importEcPrivateKey(key.privateKey);
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${base64UrlEncode(new Uint8Array(sig))}`;
};
