/** App Store の最新レビューを取得し Discord へ通知する（Cron）。状態は KV。 */
import dayjs from 'dayjs';
import { loadReviewState, saveReviewState } from '../lib/reviewState';
import type { DiscordEmbed } from '../models/common';
import type { Env } from '../types';

const STATE_KEY = 'state:appstore-reviews';
const DEFAULT_FEED_URL =
  'https://itunes.apple.com/jp/rss/customerreviews/page=1/id=1486355943/sortBy=mostRecent/json';

type AppStoreReview = {
  id: string;
  updated: string;
  title: string;
  content: string;
  rating: number;
  version?: string;
  author?: string;
  url?: string;
};

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
    const lv = (v as JsonObj).label;
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

export function parseAppStoreJson(jsonText: string): AppStoreReview[] {
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

async function postToDiscord(webhookUrl: string, reviews: AppStoreReview[]) {
  if (!reviews.length) return;
  const chunk = <T>(arr: T[], size: number): T[][] => {
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i += size)
      result.push(arr.slice(i, i + size));
    return result;
  };
  for (const group of chunk(reviews, 10)) {
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

export async function runAppStoreReviewJob(env: Env): Promise<void> {
  const debug = env.REVIEWS_DEBUG === '1';
  const dryRun = env.REVIEWS_DRY_RUN === '1';
  const forceCount = Number(env.REVIEWS_FORCE_LATEST_COUNT ?? 0);
  const appStoreUrl = env.APPSTORE_REVIEW_FEED_URL || DEFAULT_FEED_URL;
  const discordWebhook = env.DISCORD_REVIEW_WEBHOOK_URL;
  if (!discordWebhook) {
    throw new Error('DISCORD_REVIEW_WEBHOOK_URL is not set');
  }

  const state = await loadReviewState(env.STATE_KV, STATE_KEY);
  const lastUpdated = state.lastUpdated ? dayjs(state.lastUpdated) : null;
  const lastIds = new Set(state.lastIds ?? []);

  const r = await fetch(appStoreUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`App Store Reviews fetch failed: ${r.status}`);
  const items = parseAppStoreJson(await r.text());
  if (debug) console.log('[AppStoreJob] parsed', { count: items.length });

  const newcomers = items
    .filter((x) => !lastUpdated || dayjs(x.updated).isAfter(lastUpdated))
    .filter((x) => !lastIds.has(x.id))
    .sort((a, b) => dayjs(a.updated).valueOf() - dayjs(b.updated).valueOf());

  let postTargets = newcomers;
  if (forceCount > 0 && items.length > 0) {
    postTargets = items
      .slice()
      .sort((a, b) => dayjs(a.updated).valueOf() - dayjs(b.updated).valueOf())
      .slice(-Math.max(1, forceCount));
  }

  if (dryRun) {
    console.log(
      '[AppStoreJob] DRY_RUN on. Will post (skipped):',
      postTargets
        .map((x) => ({ id: x.id, rating: x.rating, updated: x.updated }))
        .slice(0, 5)
    );
  } else {
    await postToDiscord(discordWebhook, postTargets);
  }

  if (items.length) {
    const newest = items.reduce(
      (p, c) => (dayjs(c.updated).isAfter(dayjs(p.updated)) ? c : p),
      items[0]
    );
    const updatedIds = [
      ...new Set([
        ...(state.lastIds ?? []).slice(-20),
        ...items.slice(0, 5).map((x) => x.id),
      ]),
    ].slice(-40);
    await saveReviewState(env.STATE_KV, STATE_KEY, {
      lastUpdated: newest.updated,
      lastIds: updatedIds,
    });
  }
}
