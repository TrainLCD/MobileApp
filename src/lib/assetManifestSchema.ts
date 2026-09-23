import { z } from 'zod';

// 端末へ資産をダウンロードするマニフェスト (VOICEVOX / VITS) が共通で使う検証。
// 取得先ディレクトリの外へ書き込ませない・平文 HTTP から実行に直結するバイナリを
// 取らせない、という安全側の判定なので、片方だけ緩まないよう 1 か所にまとめている。

// ディレクトリ配下に閉じた相対パスだけを許す。`..`・先頭 `/`・空セグメントは
// 取得先ディレクトリの外へ書き込みうるため弾く。
const RELATIVE_PATH_SEGMENT = /^[A-Za-z0-9._-]+$/;

export const isSafeRelativePath = (value: string): boolean => {
  const segments = value.split('/');
  return segments.every(
    (segment) =>
      segment.length > 0 &&
      segment !== '.' &&
      segment !== '..' &&
      RELATIVE_PATH_SEGMENT.test(segment)
  );
};

export const relativePathSchema = z
  .string()
  .min(1)
  .refine(isSafeRelativePath, { message: 'unsafe relative path' });

export const httpsUrlSchema = z
  .string()
  .url()
  .refine((value) => value.startsWith('https://'), {
    message: 'url must use https',
  });

/** マニフェストが列挙する 1 ファイル。サイズと SHA-256 で取得結果を検証する。 */
export const manifestFileSchema = z.object({
  path: relativePathSchema,
  url: httpsUrlSchema,
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  bytes: z.number().int().positive(),
});

export type ManifestFile = z.infer<typeof manifestFileSchema>;

/** 資産セットの識別子。変わると全ファイルを取り直し、旧ディレクトリを消す。 */
export const manifestVersionSchema = z
  .string()
  .min(1)
  .regex(/^[A-Za-z0-9._-]+$/);
