/** Web Crypto / Buffer ベースの共有暗号ユーティリティ（nodejs_compat 前提）。 */

const encoder = new TextEncoder();

export const utf8Bytes = (s: string): Uint8Array => encoder.encode(s);

export const base64UrlEncode = (input: Uint8Array | string): string => {
  const bytes = typeof input === 'string' ? encoder.encode(input) : input;
  return Buffer.from(bytes).toString('base64url');
};

export const base64UrlDecode = (input: string): Uint8Array =>
  new Uint8Array(Buffer.from(input, 'base64url'));

export const bytesToBase64 = (bytes: Uint8Array | ArrayBuffer): string =>
  Buffer.from(
    bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes
  ).toString('base64');

export const base64ToBytes = (b64: string): Uint8Array =>
  new Uint8Array(Buffer.from(b64, 'base64'));

/** SHA-256 を 16 進文字列で返す。 */
export const sha256Hex = async (input: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(input));
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

/** PEM(PKCS8) を ArrayBuffer に変換する。 */
export const pemToArrayBuffer = (pem: string): ArrayBuffer => {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s+/g, '');
  return Buffer.from(body, 'base64').buffer as ArrayBuffer;
};

/** タイミング安全な文字列比較。 */
export const timingSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
};
