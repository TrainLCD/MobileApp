/** POST /feedback/upload-image — フィードバック画像を R2 に保存し公開 URL を返す。 */
import { verifySessionToken } from '../lib/auth/session';
import {
  CallableError,
  callableSuccess,
  parseCallableData,
} from '../lib/callable';
import { base64ToBytes } from '../lib/crypto';
import type { Env } from '../types';

interface UploadRequest {
  feedbackId?: unknown;
  imageBase64?: unknown;
}

// フィードバック ID はアプリ生成。パストラバーサル防止のため英数記号に限定。
const FEEDBACK_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB

export const handleUploadImage = async (
  req: Request,
  env: Env
): Promise<Response> => {
  await verifySessionToken(env, req.headers.get('Authorization'));

  const data = await parseCallableData<UploadRequest>(req);
  const feedbackId = typeof data.feedbackId === 'string' ? data.feedbackId : '';
  const imageBase64 =
    typeof data.imageBase64 === 'string' ? data.imageBase64 : '';

  if (!FEEDBACK_ID_PATTERN.test(feedbackId)) {
    throw new CallableError('invalid-argument', 'invalid feedbackId');
  }
  if (imageBase64.length === 0) {
    throw new CallableError('invalid-argument', 'imageBase64 required');
  }

  const bytes = base64ToBytes(imageBase64);
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new CallableError('invalid-argument', 'image too large');
  }

  const key = `report-images/${feedbackId}.png`;
  await env.UPLOAD_BUCKET.put(key, bytes, {
    httpMetadata: { contentType: 'image/png' },
  });

  const imageUrl = `${env.UPLOAD_PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}`;
  return callableSuccess({ imageUrl });
};
