/**
 * メンテ用 CLI から Cloudflare KV / R2 を操作する共有ヘルパー。
 * KV は Cloudflare REST API、R2 は S3 互換 API（aws4fetch で SigV4 署名）を使う。
 *
 * 必要な環境変数:
 *   CF_ACCOUNT_ID         Cloudflare アカウント ID
 *   CF_API_TOKEN          KV 読み書き権限を持つ API トークン
 *   CF_KV_NAMESPACE_ID    対象環境の TTS_KV ネームスペース ID
 *   R2_ACCESS_KEY_ID      R2 の S3 アクセスキー ID
 *   R2_SECRET_ACCESS_KEY  R2 の S3 シークレットアクセスキー
 *   R2_BUCKET             対象環境の音声バケット名（例: trainlcd-tts / trainlcd-tts-dev）
 */
import { AwsClient } from 'aws4fetch';

const API_BASE = 'https://api.cloudflare.com/client/v4';

export interface CfConfig {
  accountId: string;
  apiToken: string;
  kvNamespaceId: string;
  r2AccessKeyId: string;
  r2SecretAccessKey: string;
  r2Bucket: string;
}

export function loadConfig(overrides: Partial<CfConfig> = {}): CfConfig {
  const cfg: CfConfig = {
    accountId: overrides.accountId ?? process.env.CF_ACCOUNT_ID ?? '',
    apiToken: overrides.apiToken ?? process.env.CF_API_TOKEN ?? '',
    kvNamespaceId:
      overrides.kvNamespaceId ?? process.env.CF_KV_NAMESPACE_ID ?? '',
    r2AccessKeyId:
      overrides.r2AccessKeyId ?? process.env.R2_ACCESS_KEY_ID ?? '',
    r2SecretAccessKey:
      overrides.r2SecretAccessKey ?? process.env.R2_SECRET_ACCESS_KEY ?? '',
    r2Bucket: overrides.r2Bucket ?? process.env.R2_BUCKET ?? '',
  };
  return cfg;
}

export function requireKvConfig(cfg: CfConfig): void {
  const missing = (
    ['accountId', 'apiToken', 'kvNamespaceId'] as (keyof CfConfig)[]
  ).filter((k) => !cfg[k]);
  if (missing.length) {
    throw new Error(
      `KV 操作に必要な設定が不足しています: ${missing
        .map((k) => k)
        .join(', ')}（CF_ACCOUNT_ID / CF_API_TOKEN / CF_KV_NAMESPACE_ID）`
    );
  }
}

export function requireR2Config(cfg: CfConfig): void {
  const missing = (
    [
      'accountId',
      'r2AccessKeyId',
      'r2SecretAccessKey',
      'r2Bucket',
    ] as (keyof CfConfig)[]
  ).filter((k) => !cfg[k]);
  if (missing.length) {
    throw new Error(
      `R2 操作に必要な設定が不足しています: ${missing.join(
        ', '
      )}（CF_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET）`
    );
  }
}

// --- KV (Cloudflare REST API) ---

const kvUrl = (cfg: CfConfig, path: string): string =>
  `${API_BASE}/accounts/${cfg.accountId}/storage/kv/namespaces/${cfg.kvNamespaceId}${path}`;

const kvHeaders = (cfg: CfConfig) => ({
  Authorization: `Bearer ${cfg.apiToken}`,
});

export async function kvListKeys(
  cfg: CfConfig,
  prefix: string
): Promise<string[]> {
  const keys: string[] = [];
  let cursor = '';
  do {
    const qs = new URLSearchParams({ limit: '1000', prefix });
    if (cursor) qs.set('cursor', cursor);
    const res = await fetch(kvUrl(cfg, `/keys?${qs.toString()}`), {
      headers: kvHeaders(cfg),
    });
    if (!res.ok) {
      throw new Error(`KV list failed ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as {
      result: { name: string }[];
      result_info?: { cursor?: string };
    };
    for (const k of json.result) keys.push(k.name);
    cursor = json.result_info?.cursor ?? '';
  } while (cursor);
  return keys;
}

export async function kvGet(
  cfg: CfConfig,
  key: string
): Promise<string | null> {
  const res = await fetch(kvUrl(cfg, `/values/${encodeURIComponent(key)}`), {
    headers: kvHeaders(cfg),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`KV get failed ${res.status}: ${await res.text()}`);
  }
  return res.text();
}

export async function kvDelete(cfg: CfConfig, key: string): Promise<void> {
  const res = await fetch(kvUrl(cfg, `/values/${encodeURIComponent(key)}`), {
    method: 'DELETE',
    headers: kvHeaders(cfg),
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`KV delete failed ${res.status}: ${await res.text()}`);
  }
}

// --- R2 (S3 互換 API) ---

const decodeXmlEntities = (s: string): string =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

const r2Endpoint = (cfg: CfConfig): string =>
  `https://${cfg.accountId}.r2.cloudflarestorage.com`;

const r2Client = (cfg: CfConfig): AwsClient =>
  new AwsClient({
    accessKeyId: cfg.r2AccessKeyId,
    secretAccessKey: cfg.r2SecretAccessKey,
    region: 'auto',
    service: 's3',
  });

export async function r2ListKeys(
  cfg: CfConfig,
  prefix: string
): Promise<string[]> {
  const aws = r2Client(cfg);
  const keys: string[] = [];
  let token = '';
  do {
    const url = new URL(`${r2Endpoint(cfg)}/${cfg.r2Bucket}`);
    url.searchParams.set('list-type', '2');
    url.searchParams.set('prefix', prefix);
    url.searchParams.set('max-keys', '1000');
    if (token) url.searchParams.set('continuation-token', token);
    const res = await aws.fetch(url.toString(), { method: 'GET' });
    if (!res.ok) {
      throw new Error(`R2 list failed ${res.status}: ${await res.text()}`);
    }
    const xml = await res.text();
    for (const m of xml.matchAll(/<Key>([^<]+)<\/Key>/g)) {
      keys.push(decodeXmlEntities(m[1]));
    }
    const truncated = /<IsTruncated>\s*true\s*<\/IsTruncated>/.test(xml);
    const next = xml.match(
      /<NextContinuationToken>([^<]+)<\/NextContinuationToken>/
    );
    token = truncated && next ? decodeXmlEntities(next[1]) : '';
  } while (token);
  return keys;
}

export async function r2Delete(cfg: CfConfig, key: string): Promise<void> {
  const aws = r2Client(cfg);
  const encodedKey = key
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
  const res = await aws.fetch(
    `${r2Endpoint(cfg)}/${cfg.r2Bucket}/${encodedKey}`,
    {
      method: 'DELETE',
    }
  );
  if (!res.ok && res.status !== 404) {
    throw new Error(`R2 delete failed ${res.status}: ${await res.text()}`);
  }
}

// --- 共有: 標準入力での確認プロンプト ---
import * as readline from 'node:readline';

export function confirm(prompt: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

// --- 共有: voice メタの型 ---
export interface VoiceCacheRecord {
  id: string;
  ssmlJa?: string;
  ssmlEn?: string;
  pathJa?: string;
  pathEn?: string;
  voiceJa?: string;
  voiceEn?: string;
  createdAt?: string;
}
