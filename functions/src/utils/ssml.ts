/** SSML タグを除去してプレーンテキストに変換する（byte 数検証や可視テキスト判定用）。 */
export const stripSsml = (text: string): string =>
  text
    .replace(
      /<sub\s+alias="([^"]*)">([^<]*)<\/sub>/gi,
      (_match, alias) => alias
    )
    .replace(
      /<say-as\s+interpret-as="cardinal">(\d+)<\/say-as>/gi,
      (_match, num) => String(num)
    )
    .replace(/<break\s*[^/]*\/>/gi, ' ')
    .replace(/<speak>|<\/speak>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

/** UTF-8 バイト長。 */
export const utf8ByteLength = (s: string): number =>
  new TextEncoder().encode(s).length;
