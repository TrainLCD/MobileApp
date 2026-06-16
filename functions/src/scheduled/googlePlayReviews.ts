/**
 * Google Play の最新レビューを Android Publisher REST から取得し Discord へ通知する（Cron）。
 * 認証はサービスアカウント JWT。状態は KV。
 */
import dayjs from 'dayjs';
import { getGoogleAccessToken } from '../lib/google/accessToken';
import { loadReviewState, saveReviewState } from '../lib/reviewState';
import type { DiscordEmbed } from '../models/common';
import type { Env } from '../types';

const STATE_KEY = 'state:googleplay-reviews';
const ANDROID_PUBLISHER_SCOPE =
  'https://www.googleapis.com/auth/androidpublisher';

type PlayTimestamp = {
  seconds?: string | number | null;
  nanos?: number | string | null;
};
type PlayUserComment = {
  text?: string | null;
  starRating?: number | null;
  appVersionName?: string | null;
  reviewerLanguage?: string | null;
  lastModified?: PlayTimestamp | null;
};
type PlayApiReview = {
  reviewId?: string | null;
  authorName?: string | null;
  comments?: { userComment?: PlayUserComment | null }[] | null;
};
type PlayReviewsResponse = {
  reviews?: PlayApiReview[] | null;
  tokenPagination?: { nextPageToken?: string | null } | null;
};

type PlayReview = {
  id: string;
  reviewId: string;
  updated: string;
  content: string;
  rating: number;
  versionName?: string;
  author?: string;
  language?: string;
};

export function tsToIso(ts?: PlayTimestamp | null): string | null {
  if (!ts) return null;
  const secondsRaw = ts.seconds;
  const nanosRaw = ts.nanos;
  const sec =
    typeof secondsRaw === 'string'
      ? Number(secondsRaw)
      : Number(secondsRaw ?? 0);
  const nanosNum =
    typeof nanosRaw === 'string' ? Number(nanosRaw) : Number(nanosRaw ?? 0);
  const ms = sec * 1000 + Math.round(nanosNum / 1e6);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

export function toPlayReviews(rs?: PlayReviewsResponse | null): PlayReview[] {
  const out: PlayReview[] = [];
  const reviews = rs?.reviews ?? [];
  for (const r of reviews) {
    const reviewId = r.reviewId ?? '';
    const author = r.authorName ?? undefined;
    const comments = r.comments ?? [];
    const userComments = comments
      .map((c) => c.userComment)
      .filter((u): u is NonNullable<typeof u> => !!u);
    if (!reviewId || userComments.length === 0) continue;
    const latest = userComments.reduce((p, c) => {
      const pMs = dayjs(tsToIso(p.lastModified)).valueOf();
      const cMs = dayjs(tsToIso(c.lastModified)).valueOf();
      return cMs > pMs ? c : p;
    });
    const updated = tsToIso(latest.lastModified);
    if (!updated) continue;
    out.push({
      id: `${reviewId}:${updated}`,
      reviewId,
      updated,
      content: String(latest.text ?? '').trim(),
      rating: Number(latest.starRating ?? 0) || 0,
      versionName: latest.appVersionName ?? undefined,
      author,
      language: latest.reviewerLanguage ?? undefined,
    });
  }
  return out;
}

async function postToDiscord(
  webhookUrl: string,
  items: PlayReview[],
  packageName: string
) {
  for (const r of items) {
    const r5 = Math.max(0, Math.min(5, Math.floor(r.rating)));
    const stars = '★'.repeat(r5) + '☆'.repeat(5 - r5);
    const ratingText = r5 === 0 ? '評価なし (0/5)' : `${stars} (${r5}/5)`;
    const contentVal = (r.content || '(本文なし)').slice(0, 1000);
    const embeds: DiscordEmbed[] = [
      {
        fields: [
          { name: 'プラットフォーム', value: 'Google Play' },
          { name: '評価', value: ratingText },
          { name: '本文', value: contentVal },
          { name: 'バージョン', value: r.versionName || '不明' },
          { name: '言語', value: r.language || '不明' },
          { name: '投稿者', value: r.author || '不明' },
          {
            name: '投稿日',
            value: dayjs(r.updated).format('YYYY/MM/DD HH:mm:ss'),
          },
          { name: 'レビューID', value: r.reviewId },
          {
            name: 'アプリページ',
            value: `https://play.google.com/store/apps/details?id=${packageName}`,
          },
        ],
      },
    ];
    const content = '**📝 Google Playに新しいレビューが投稿されました**';
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, embeds }),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => '');
      console.error('Discord Review webhook failed (Play)', res.status, msg);
    }
  }
}

async function fetchReviewsPage(
  packageName: string,
  accessToken: string,
  token?: string
): Promise<PlayReviewsResponse> {
  const url = new URL(
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(
      packageName
    )}/reviews`
  );
  url.searchParams.set('maxResults', '100');
  if (token) url.searchParams.set('token', token);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(
      `Play reviews fetch failed ${res.status}: ${detail.slice(0, 300)}`
    );
  }
  return (await res.json()) as PlayReviewsResponse;
}

export async function runGooglePlayReviewJob(env: Env): Promise<void> {
  const debug = env.REVIEWS_DEBUG === '1';
  const dryRun = env.REVIEWS_DRY_RUN === '1';
  const forceCount = Number(env.REVIEWS_FORCE_LATEST_COUNT ?? 0);
  const packageName = env.GOOGLE_PLAY_PACKAGE_NAME || 'me.tinykitten.trainlcd';
  const discordWebhook = env.DISCORD_REVIEW_WEBHOOK_URL;
  if (!discordWebhook) {
    // 未設定はエラーではなく「通知オフ」として静かにスキップする
    console.log('[PlayJob] DISCORD_REVIEW_WEBHOOK_URL not set, skipping');
    return;
  }
  if (!env.GOOGLE_SA_KEY) {
    // SA 鍵が無いと Android Publisher 認証ができないためスキップ
    console.log('[PlayJob] GOOGLE_SA_KEY not set, skipping');
    return;
  }

  const accessToken = await getGoogleAccessToken(
    env.GOOGLE_SA_KEY,
    ANDROID_PUBLISHER_SCOPE
  );

  const state = await loadReviewState(env.STATE_KV, STATE_KEY);
  const lastUpdated = state.lastUpdated ? dayjs(state.lastUpdated) : null;
  const lastIds = new Set(state.lastIds ?? []);

  const all: PlayReview[] = [];
  let token: string | undefined;
  for (let page = 0; page < 10; page++) {
    const data = await fetchReviewsPage(packageName, accessToken, token);
    all.push(...toPlayReviews(data));
    token = data?.tokenPagination?.nextPageToken ?? undefined;
    if (!token) break;
  }
  if (debug) console.log('[PlayJob] fetched total', { parsed: all.length });

  const newcomers = all
    .filter((r) => !lastUpdated || dayjs(r.updated).isAfter(lastUpdated))
    .filter((r) => !lastIds.has(r.id))
    .sort((a, b) => dayjs(a.updated).valueOf() - dayjs(b.updated).valueOf());

  let postTargets = newcomers;
  if (forceCount > 0 && all.length > 0) {
    postTargets = all
      .slice()
      .sort((a, b) => dayjs(a.updated).valueOf() - dayjs(b.updated).valueOf())
      .slice(-Math.max(1, forceCount));
  }

  if (dryRun) {
    console.log(
      '[PlayJob] DRY_RUN on. Will post (skipped):',
      postTargets
        .map((r) => ({ id: r.id, rating: r.rating, updated: r.updated }))
        .slice(0, 5)
    );
  } else {
    await postToDiscord(discordWebhook, postTargets, packageName);
  }

  if (all.length) {
    const newest = all.reduce(
      (p, c) => (dayjs(c.updated).isAfter(dayjs(p.updated)) ? c : p),
      all[0]
    );
    const updatedIds = [
      ...new Set([
        ...(state.lastIds ?? []).slice(-20),
        ...all.slice(0, 20).map((r) => r.id),
      ]),
    ].slice(-60);
    await saveReviewState(env.STATE_KV, STATE_KEY, {
      lastUpdated: newest.updated,
      lastIds: updatedIds,
    });
  }
}
