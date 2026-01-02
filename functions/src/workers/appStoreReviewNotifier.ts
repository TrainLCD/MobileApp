import { onSchedule } from 'firebase-functions/v2/scheduler';
import { Storage } from '@google-cloud/storage';
import dayjs from 'dayjs';
import type { DiscordEmbed } from '../models/common';

type AppStoreReview = {
  id: string;
  updated: string; // ISO8601
  title: string;
  content: string;
  rating: number; // 1..5
  version?: string;
  author?: string;
  url?: string;
};

type ReviewState = {
  lastUpdated?: string | null;
  lastIds?: string[]; // optional ring buffer of recent ids
};

const storage = new Storage();

function parseGsUri(
  uri: string | undefined | null
): { bucket: string; file: string } | null {
  if (!uri) return null;
  const m = uri.match(/^gs:\/\/([^/]+)\/(.+)$/);
  if (!m) return null;
  const [, bucket, file] = m;
  return { bucket, file };
}

async function loadState(uri: string | undefined | null): Promise<ReviewState> {
  const loc = parseGsUri(uri);
  if (!loc) return {};
  try {
    const buf = await storage.bucket(loc.bucket).file(loc.file).download();
    const json = JSON.parse(buf[0].toString('utf8')) as ReviewState;
    return json ?? {};
  } catch {
    return {};
  }
}

async function saveState(uri: string | undefined | null, state: ReviewState) {
  const loc = parseGsUri(uri);
  if (!loc) return;
  await storage
    .bucket(loc.bucket)
    .file(loc.file)
    .save(JSON.stringify(state), { contentType: 'application/json' });
}

type JsonObj = Record<string, unknown>;

function deepGet(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as JsonObj)) {
      return (acc as JsonObj)[key];
    }
    return undefined;
  }, obj);
}

function labelOf(v: unknown, d = ''): string {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object' && 'label' in (v as JsonObj)) {
    const lv = (v as JsonObj)['label'];
    if (typeof lv === 'string') return lv;
  }
  return d;
}

function hrefOf(link: unknown): string | undefined {
  if (Array.isArray(link)) {
    for (const it of link) {
      const href = deepGet(it, 'attributes.href');
      if (typeof href === 'string') return href;
    }
  }
  const single = deepGet(link, 'attributes.href');
  return typeof single === 'string' ? single : undefined;
}

function parseAppStoreJson(jsonText: string): AppStoreReview[] {
  try {
    const data = JSON.parse(jsonText) as unknown;
    const entryNode = deepGet(data, 'feed.entry');
    const entries: unknown[] = Array.isArray(entryNode)
      ? entryNode
      : entryNode != null
        ? [entryNode]
        : [];

    const reviews: AppStoreReview[] = [];
    for (const e of entries) {
      const id = labelOf(deepGet(e, 'id'));
      const updated = labelOf(deepGet(e, 'updated'));
      const title = labelOf(deepGet(e, 'title'));
      const content = labelOf(deepGet(e, 'content'));
      const ratingStr = labelOf(deepGet(e, 'im:rating'));
      const version = labelOf(deepGet(e, 'im:version')) || undefined;
      const author =
        labelOf(deepGet(e, 'author.name')) ||
        labelOf(deepGet(e, 'author')) ||
        undefined;
      const url = hrefOf(deepGet(e, 'link')) || id;
      if (!id || !updated) continue;
      const rating = Number(ratingStr) || 0;
      reviews.push({
        id,
        updated,
        title,
        content,
        rating,
        version,
        author,
        url,
      });
    }
    return reviews;
  } catch {
    return [];
  }
}

// for unit testing
export const __test_parseAppStoreJson = parseAppStoreJson;

async function postToDiscord(webhookUrl: string, reviews: AppStoreReview[]) {
  if (!reviews.length) return;
  // 10件ずつバッチ送信
  const chunk = <T>(arr: T[], size: number) =>
    arr.reduce<T[][]>(
      (a, _, i) => (i % size ? a : [...a, arr.slice(i, i + size)]),
      []
    );
  const batches = chunk(reviews, 10);
  for (const group of batches) {
    const embeds: DiscordEmbed[] = group.map((r) => {
      const r5 = Math.max(0, Math.min(5, Math.floor(r.rating)));
      const stars = '★'.repeat(r5) + '☆'.repeat(5 - r5);
      const ratingText = r5 === 0 ? '評価なし (0/5)' : `${stars} (${r5}/5)`;
      const contentVal = (r.content || '(本文なし)').slice(0, 1000);
      return {
        fields: [
          { name: 'プラットフォーム', value: 'App Store' },
          { name: '評価', value: ratingText },
          { name: 'タイトル', value: r.title || '(タイトルなし)' },
          { name: '本文', value: contentVal },
          { name: 'バージョン', value: r.version || '不明' },
          { name: '投稿者', value: r.author || '不明' },
          {
            name: '投稿日',
            value: dayjs(r.updated).format('YYYY/MM/DD HH:mm:ss'),
          },
          { name: 'リンク', value: r.url || r.id },
        ],
      };
    });
    const content = '**📝 App Storeに新しいレビューが投稿されました**';
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, embeds }),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => '');
      console.error('Discord Review webhook failed', res.status, msg);
    }
  }
}

export async function runAppStoreReviewJob() {
  const debug = process.env.REVIEWS_DEBUG === '1';
  const dryRun = process.env.REVIEWS_DRY_RUN === '1';
  const forceCount = Number(process.env.REVIEWS_FORCE_LATEST_COUNT ?? 0);
  const defaultUrl =
    'https://itunes.apple.com/jp/rss/customerreviews/page=1/id=1486355943/sortBy=mostRecent/json';
  const appStoreUrl = process.env.APPSTORE_REVIEW_FEED_URL || defaultUrl;
  const stateUri = process.env.APPSTORE_REVIEW_STATE_GCS_URI; // e.g. gs://<bucket>/states/appstore-reviews.json
  const discordWebhook = process.env.DISCORD_REVIEW_WEBHOOK_URL;

  if (!discordWebhook) {
    throw new Error('process.env.DISCORD_REVIEW_WEBHOOK_URL is not set');
  }
  if (!stateUri) {
    throw new Error('process.env.APPSTORE_REVIEW_STATE_GCS_URI is not set');
  }

  if (debug) {
    console.log('[AppStoreJob] start', {
      hasStateUri: Boolean(stateUri),
      hasWebhook: Boolean(discordWebhook),
      appStoreUrl,
    });
  }

  // 1) Load last state
  const state = await loadState(stateUri);
  const lastUpdated = state.lastUpdated ? dayjs(state.lastUpdated) : null;
  const lastIds = new Set(state.lastIds ?? []);
  if (debug) {
    console.log('[AppStoreJob] loaded state', {
      lastUpdated: state.lastUpdated ?? null,
      lastIdsSize: lastIds.size,
    });
  }

  // 2) JSONフィードを取得（UA付与 + タイムアウト）
  const ac = new AbortController();
  const tmo = setTimeout(() => ac.abort(), 15_000);
  const r = await fetch(appStoreUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
      Accept: 'application/json',
    },
    signal: ac.signal,
  });
  clearTimeout(tmo);
  if (!r.ok) throw new Error(`App Store Reviews fetch failed: ${r.status}`);
  const t = await r.text();
  if (debug) {
    type MaybeHeaders = { get(name: string): string | null };
    const ct =
      (r.headers as MaybeHeaders | undefined)?.get('content-type') ?? '';
    console.log('[AppStoreJob] json fetched', {
      url: appStoreUrl,
      contentType: ct,
      preview: t.slice(0, 200).replace(/\s+/g, ' '),
    });
  }
  const items = parseAppStoreJson(t);
  if (debug) console.log('[AppStoreJob] json parsed', { count: items.length });
  if (debug) {
    console.log('[AppStoreJob] parsed items', { count: items.length });
  }

  // 3) Filter new items by updated timestamp and id dedupe
  const newcomers = items
    .filter((r) => !lastUpdated || dayjs(r.updated).isAfter(lastUpdated))
    .filter((r) => !lastIds.has(r.id))
    // Oldest first to post in order
    .sort((a, b) => dayjs(a.updated).valueOf() - dayjs(b.updated).valueOf());

  let postTargets = newcomers;
  if (forceCount > 0 && items.length > 0) {
    postTargets = items
      .slice() // copy
      .sort((a, b) => dayjs(a.updated).valueOf() - dayjs(b.updated).valueOf())
      .slice(-Math.max(1, forceCount));
    if (debug) {
      console.log('[AppStoreJob] force mode enabled', {
        forceCount,
        actual: postTargets.length,
      });
    }
  }

  if (debug) {
    console.log('[AppStoreJob] newcomers', { count: newcomers.length });
  }

  // 4) Post to Discord
  if (dryRun) {
    console.log(
      '[AppStoreJob] DRY_RUN on. Will post (skipped):',
      postTargets
        .map((r) => ({ id: r.id, rating: r.rating, updated: r.updated }))
        .slice(0, 5)
    );
  } else {
    await postToDiscord(discordWebhook, postTargets);
  }

  // 5) Update state
  if (items.length) {
    const newest = items.reduce(
      (p, c) => (dayjs(c.updated).isAfter(dayjs(p.updated)) ? c : p),
      items[0]
    );
    const updatedIds = [
      ...Array.from(
        new Set([
          ...(state.lastIds ?? []).slice(-20),
          ...items.slice(0, 5).map((r) => r.id),
        ])
      ),
    ].slice(-40);
    await saveState(stateUri, {
      lastUpdated: newest.updated,
      lastIds: updatedIds,
    });
    if (debug) {
      console.log('[AppStoreJob] state saved', {
        lastUpdated: newest.updated,
        lastIds: updatedIds.length,
      });
    }
  }
}

export const appStoreReviewNotifier = onSchedule(
  {
    schedule: process.env.REVIEWS_CRON_SCHEDULE || 'every 60 minutes',
    timeZone: process.env.REVIEWS_TIMEZONE || 'UTC',
    region: 'asia-northeast1',
    maxInstances: 1,
  },
  async () => {
    await runAppStoreReviewJob();
  }
);
