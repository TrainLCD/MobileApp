import {
  DEV_WORKER_API_URL,
  PRODUCTION_WORKER_API_URL,
} from 'react-native-dotenv';
import { isDevApp } from '../utils/isDevApp';

// Cloudflare Worker のベース URL（auth/config/upload など新規エンドポイント用）。
// TTS / フィードバック送信は従来どおり個別の *_TTS_API_URL / *_FEEDBACK_API_URL を使う。
export const workerBaseUrl = (): string =>
  (isDevApp ? DEV_WORKER_API_URL : PRODUCTION_WORKER_API_URL).replace(
    /\/$/,
    ''
  );

export const workerUrl = (path: string): string =>
  `${workerBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
