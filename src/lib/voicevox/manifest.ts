import { z } from 'zod';

// VOICEVOX の辞書・音声モデルを列挙するマニフェスト。Remote Config の
// voicevox_tts_manifest_url_ios が指す JSON で、scripts/build-voicevox-manifest.mjs が
// 生成する。アプリはこれをもとに資産を取得・検証し、version ごとのディレクトリへ置く。
//
// {
//   "schemaVersion": 1,
//   "version": "2026-09-08",
//   "openJtalkDicDir": "open_jtalk_dic_utf_8-1.11",
//   "voiceModels": ["6.vvm"],
//   "files": [
//     { "path": "open_jtalk_dic_utf_8-1.11/sys.dic", "url": "https://…/sys.dic",
//       "sha256": "…", "bytes": 103123456 },
//     …
//   ]
// }

// ディレクトリ配下に閉じた相対パスだけを許す。`..`・先頭 `/`・空セグメントは
// 取得先ディレクトリの外へ書き込みうるため弾く。
const RELATIVE_PATH_SEGMENT = /^[A-Za-z0-9._-]+$/;
const isSafeRelativePath = (value: string): boolean => {
  const segments = value.split('/');
  return segments.every(
    (segment) =>
      segment.length > 0 &&
      segment !== '.' &&
      segment !== '..' &&
      RELATIVE_PATH_SEGMENT.test(segment)
  );
};

const relativePathSchema = z
  .string()
  .min(1)
  .refine(isSafeRelativePath, { message: 'unsafe relative path' });

const httpsUrlSchema = z
  .string()
  .url()
  .refine((value) => value.startsWith('https://'), {
    message: 'url must use https',
  });

export const voicevoxManifestFileSchema = z.object({
  path: relativePathSchema,
  url: httpsUrlSchema,
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  bytes: z.number().int().positive(),
});

export const voicevoxManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    // 資産セットの識別子。変わると全ファイルを取り直し、旧ディレクトリを消す
    version: z
      .string()
      .min(1)
      .regex(/^[A-Za-z0-9._-]+$/),
    openJtalkDicDir: relativePathSchema,
    voiceModels: z.array(relativePathSchema).min(1),
    files: z.array(voicevoxManifestFileSchema).min(1),
  })
  .superRefine((manifest, ctx) => {
    const paths = new Set(manifest.files.map((file) => file.path));
    if (paths.size !== manifest.files.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'files must not contain duplicate paths',
      });
    }
    for (const model of manifest.voiceModels) {
      if (!paths.has(model)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `voice model ${model} is not listed in files`,
        });
      }
    }
    const dicPrefix = `${manifest.openJtalkDicDir}/`;
    if (!manifest.files.some((file) => file.path.startsWith(dicPrefix))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'openJtalkDicDir has no files',
      });
    }
  });

export type VoicevoxManifest = z.infer<typeof voicevoxManifestSchema>;
export type VoicevoxManifestFile = z.infer<typeof voicevoxManifestFileSchema>;

export const parseVoicevoxManifest = (json: unknown): VoicevoxManifest =>
  voicevoxManifestSchema.parse(json);
