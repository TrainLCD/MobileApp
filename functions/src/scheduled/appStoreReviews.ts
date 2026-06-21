/** App Store Connect API から最新レビューを取得し Discord へ通知する（Cron）。状態は KV。 */
import dayjs from 'dayjs';
import { createAppStoreConnectJwt } from '../lib/apple/accessToken';
import { loadReviewState, saveReviewState } from '../lib/reviewState';
import type { DiscordEmbed } from '../models/common';
import type { Env } from '../types';

const STATE_KEY = 'state:appstore-reviews';
const DEFAULT_APP_ID = '1486355943';

type AppStoreReview = {
  id: string;
  updated: string;
  title: string;
  content: string;
  rating: number;
  author?: string;
  territory?: string;
};

type ApiCustomerReview = {
  id?: string;
  attributes?: {
    rating?: number;
    title?: string;
    body?: string;
    reviewerNickname?: string;
    createdDate?: string;
    territory?: string;
  };
};

type ApiResponse = {
  data?: ApiCustomerReview[];
  links?: { next?: string };
};

export function parseApiReviews(data: ApiResponse): AppStoreReview[] {
  const entries = data?.data ?? [];
  const reviews: AppStoreReview[] = [];
  for (const e of entries) {
    const id = e.id;
    const attrs = e.attributes;
    if (!id || !attrs?.createdDate) continue;
    reviews.push({
      id,
      updated: attrs.createdDate,
      title: attrs.title ?? '',
      content: attrs.body ?? '',
      rating: attrs.rating ?? 0,
      author: attrs.reviewerNickname ?? undefined,
      territory: attrs.territory ?? undefined,
    });
  }
  return reviews;
}

async function fetchReviewsPage(
  url: string,
  jwt: string
): Promise<ApiResponse> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(
      `App Store Connect reviews fetch failed ${res.status}: ${detail.slice(0, 300)}`
    );
  }
  return (await res.json()) as ApiResponse;
}

async function postToDiscord(
  webhookUrl: string,
  reviews: AppStoreReview[],
  appId: string
): Promise<boolean> {
  if (!reviews.length) return true;
  let allOk = true;
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
          { name: '投稿者', value: r.author || '不明' },
          {
            name: '投稿日',
            value: dayjs(r.updated).format('YYYY/MM/DD HH:mm:ss'),
          },
          {
            name: 'リンク',
            value: `https://apps.apple.com/app/id${appId}`,
          },
        ],
      };
    });
    const content = '**📝 App Storeに新しいレビューが投稿されました**';
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, embeds }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => '');
      console.error('Discord Review webhook failed', res.status, msg);
      allOk = false;
    }
  }
  return allOk;
}

export async function runAppStoreReviewJob(env: Env): Promise<void> {
  const debug = env.REVIEWS_DEBUG === '1';
  const dryRun = env.REVIEWS_DRY_RUN === '1';
  const forceCount = Number(env.REVIEWS_FORCE_LATEST_COUNT ?? 0);
  const appId = env.APPSTORE_APP_ID || DEFAULT_APP_ID;
  const discordWebhook = env.DISCORD_REVIEW_WEBHOOK_URL;
  if (!discordWebhook) {
    console.log('[AppStoreJob] DISCORD_REVIEW_WEBHOOK_URL not set, skipping');
    return;
  }
  if (!env.APPSTORE_CONNECT_KEY) {
    console.log('[AppStoreJob] APPSTORE_CONNECT_KEY not set, skipping');
    return;
  }

  const jwt = await createAppStoreConnectJwt(env.APPSTORE_CONNECT_KEY);

  const state = await loadReviewState(env.STATE_KV, STATE_KEY);
  const lastUpdated = state.lastUpdated ? dayjs(state.lastUpdated) : null;
  const lastIds = new Set(state.lastIds ?? []);

  const all: AppStoreReview[] = [];
  let nextUrl: string | undefined =
    `https://api.appstoreconnect.apple.com/v1/apps/${encodeURIComponent(appId)}/customerReviews?sort=-createdDate&limit=50`;
  for (let page = 0; page < 5 && nextUrl; page++) {
    const data = await fetchReviewsPage(nextUrl, jwt);
    all.push(...parseApiReviews(data));
    nextUrl = data.links?.next ?? undefined;
  }
  if (debug) console.log('[AppStoreJob] fetched', { count: all.length });

  const newcomers = all
    .filter(
      (x) =>
        !lastUpdated ||
        dayjs(x.updated).isAfter(lastUpdated) ||
        dayjs(x.updated).isSame(lastUpdated)
    )
    .filter((x) => !lastIds.has(x.id))
    .sort((a, b) => dayjs(a.updated).valueOf() - dayjs(b.updated).valueOf());

  let postTargets = newcomers;
  if (forceCount > 0 && all.length > 0) {
    postTargets = all
      .slice()
      .sort((a, b) => dayjs(a.updated).valueOf() - dayjs(b.updated).valueOf())
      .slice(-Math.max(1, forceCount));
  }

  let posted = true;
  if (dryRun) {
    console.log(
      '[AppStoreJob] DRY_RUN on. Will post (skipped):',
      postTargets
        .map((x) => ({ id: x.id, rating: x.rating, updated: x.updated }))
        .slice(0, 5)
    );
  } else {
    posted = await postToDiscord(discordWebhook, postTargets, appId);
  }

  if (all.length && !dryRun && posted) {
    const newest = all.reduce(
      (p, c) => (dayjs(c.updated).isAfter(dayjs(p.updated)) ? c : p),
      all[0]
    );
    const updatedIds = [
      ...new Set([
        ...(state.lastIds ?? []).slice(-20),
        ...all.slice(0, 5).map((x) => x.id),
      ]),
    ].slice(-40);
    await saveReviewState(env.STATE_KV, STATE_KEY, {
      lastUpdated: newest.updated,
      lastIds: updatedIds,
    });
  }
}
