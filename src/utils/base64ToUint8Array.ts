const BASE64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

export const base64ToUint8Array = (input: string): Uint8Array => {
  const sanitized = input.replace(/[^A-Za-z0-9+/=]/g, '');
  // パディング無し（長さが 4 の倍数でない）入力でも整数長になるよう計算する。
  // 非整数を new Uint8Array へ渡すと RangeError で落ちるため。
  const remainder = sanitized.length % 4;
  const padding = sanitized.endsWith('==')
    ? 2
    : sanitized.endsWith('=')
      ? 1
      : 0;
  const length =
    Math.floor(sanitized.length / 4) * 3 -
    padding +
    (remainder === 2 ? 1 : remainder === 3 ? 2 : 0);
  const bytes = new Uint8Array(length);

  let byteIndex = 0;
  // 末尾チャンクが 4 文字未満だと undefined が渡るため、パディングと同じ 0 として扱う
  const decodeChar = (char: string | undefined): number => {
    if (char === undefined || char === '=') {
      return 0;
    }
    const index = BASE64_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error('Invalid base64 character.');
    }
    return index;
  };

  for (let i = 0; i < sanitized.length; i += 4) {
    const third = sanitized[i + 2];
    const fourth = sanitized[i + 3];
    const chunk =
      (decodeChar(sanitized[i]) << 18) |
      (decodeChar(sanitized[i + 1]) << 12) |
      (decodeChar(third) << 6) |
      decodeChar(fourth);

    bytes[byteIndex++] = (chunk >> 16) & 0xff;
    if (third !== undefined && third !== '=') {
      bytes[byteIndex++] = (chunk >> 8) & 0xff;
    }
    if (fourth !== undefined && fourth !== '=') {
      bytes[byteIndex++] = chunk & 0xff;
    }
  }

  return bytes;
};
