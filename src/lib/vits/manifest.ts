import { z } from 'zod';
import {
  manifestFileSchema,
  manifestVersionSchema,
  relativePathSchema,
} from '~/lib/assetManifestSchema';

// VITS の音声モデル (ONNX) と発音辞書を列挙するマニフェスト。Remote Config の
// vits_tts_manifest_url_ios が指す JSON で、scripts/build-vits-manifest.mjs が
// 生成する。アプリはこれをもとに資産を取得・検証し、version ごとのディレクトリへ置く。
//
// {
//   "schemaVersion": 1,
//   "version": "2026-09-15",
//   "model": "vits-ljs.onnx",
//   "tokens": "tokens.txt",
//   "lexicon": "lexicon.txt",
//   "files": [
//     { "path": "vits-ljs.onnx", "url": "https://…/vits-ljs.onnx",
//       "sha256": "…", "bytes": 114124456 },
//     …
//   ]
// }
//
// サンプリングレートや add_blank はモデル本体の ONNX メタデータに入っており、
// ネイティブ側がそこから読む。マニフェストへ二重に持たせると、モデルを差し替えた
// ときに片方だけ古い値が残りうるため、あえて持たせていない。

export const vitsManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    version: manifestVersionSchema,
    // 音声モデル (ONNX)。拡張子まで見るのは、辞書のパスを取り違えたマニフェストを
    // 配ると、ネイティブ側がテキストを ONNX として開こうとして合成が丸ごと失敗するため
    model: relativePathSchema.refine((path) => path.endsWith('.onnx'), {
      message: 'model must be an .onnx file',
    }),
    // 音素 → トークン ID の対応表
    tokens: relativePathSchema,
    // 単語 → 音素列の発音辞書
    lexicon: relativePathSchema,
    files: z.array(manifestFileSchema).min(1),
  })
  .superRefine((manifest, ctx) => {
    const paths = new Set(manifest.files.map((file) => file.path));
    if (paths.size !== manifest.files.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'files must not contain duplicate paths',
      });
    }
    const roles = [
      ['model', manifest.model],
      ['tokens', manifest.tokens],
      ['lexicon', manifest.lexicon],
    ] as const;
    for (const [key, value] of roles) {
      if (!paths.has(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${key} ${value} is not listed in files`,
        });
      }
    }
    // 3 つが同じファイルを指すマニフェストは、役割を取り違えて生成された証拠。
    // 通してしまうと端末は資産を取得できても合成できない
    if (new Set(roles.map(([, value]) => value)).size !== roles.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'model, tokens and lexicon must reference different files',
      });
    }
  });

export type VitsManifest = z.infer<typeof vitsManifestSchema>;

/** マニフェスト JSON を検証して返す。不正なら zod のエラーを投げる。 */
export const parseVitsManifest = (json: unknown): VitsManifest =>
  vitsManifestSchema.parse(json);
