const BASE64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

export const base64ToUint8Array = (input: string): Uint8Array => {
  const sanitized = input.replace(/[^A-Za-z0-9+/=]/g, '');
  const length =
    (sanitized.length * 3) / 4 -
    (sanitized.endsWith('==') ? 2 : sanitized.endsWith('=') ? 1 : 0);
  const bytes = new Uint8Array(length);

  let byteIndex = 0;
  const decodeChar = (char: string): number => {
    if (char === '=') {
      return 0;
    }
    const index = BASE64_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error('Invalid base64 character.');
    }
    return index;
  };

  for (let i = 0; i < sanitized.length; i += 4) {
    const chunk =
      (decodeChar(sanitized[i]) << 18) |
      (decodeChar(sanitized[i + 1]) << 12) |
      (decodeChar(sanitized[i + 2]) << 6) |
      decodeChar(sanitized[i + 3]);

    bytes[byteIndex++] = (chunk >> 16) & 0xff;
    if (sanitized[i + 2] !== '=') {
      bytes[byteIndex++] = (chunk >> 8) & 0xff;
    }
    if (sanitized[i + 3] !== '=') {
      bytes[byteIndex++] = chunk & 0xff;
    }
  }

  return bytes;
};
