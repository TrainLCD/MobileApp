import {
  DEV_WORKER_API_URL,
  PRODUCTION_WORKER_API_URL,
} from 'react-native-dotenv';
import { isDevApp } from '../utils/isDevApp';

// Cloudflare Worker のベース URL。全エンドポイント（/auth/token・/tts・/postFeedback・
// /config/*・/feedback/upload-image）をこのベースから組み立てる。
export const workerBaseUrl = (): string =>
  ((isDevApp ? DEV_WORKER_API_URL : PRODUCTION_WORKER_API_URL) ?? '').replace(
    /\/$/,
    ''
  );

export const workerUrl = (path: string): string =>
  `${workerBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
