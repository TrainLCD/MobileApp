import { z } from 'zod';
import {
  manifestFileSchema,
  manifestVersionSchema,
  relativePathSchema,
} from '~/lib/assetManifestSchema';

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

// パス・URL・ファイルの検証は VITS 側と共通 (src/lib/assetManifestSchema.ts)。
// 取得先ディレクトリの外へ書き込ませない判定が片方だけ緩むのを防ぐため。
export const voicevoxManifestFileSchema = manifestFileSchema;

export const voicevoxManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    // 資産セットの識別子。変わると全ファイルを取り直し、旧ディレクトリを消す
    version: manifestVersionSchema,
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

/** マニフェスト JSON を検証して返す。不正なら zod のエラーを投げる。 */
export const parseVoicevoxManifest = (json: unknown): VoicevoxManifest =>
  voicevoxManifestSchema.parse(json);
