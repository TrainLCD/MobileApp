import { onSchedule } from 'firebase-functions/v2/scheduler';
import { Storage } from '@google-cloud/storage';
import { GoogleAuth } from 'google-auth-library';
import {
  androidpublisher,
  androidpublisher_v3,
} from '@googleapis/androidpublisher';
import dayjs from 'dayjs';
import type { DiscordEmbed } from '../models/common';

type ReviewState = {
  lastUpdated?: string | null;
  lastIds?: string[];
};

type PlayReview = {
  id: string; // reviewId + lastModified
  reviewId: string;
  updated: string; // ISO8601 string
  content: string;
  rating: number;
  versionName?: string;
  author?: string;
  language?: string;
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
    return JSON.parse(buf[0].toString('utf8')) as ReviewState;
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

function tsToIso(
  ts?: androidpublisher_v3.Schema$Timestamp | null
): string | null {
  if (!ts) return null;
  // googleapis の Timestamp は seconds が string のことが多い
  // 型定義に合わせて安全に数値化する
  const secondsRaw = (ts as { seconds?: string | number | null }).seconds;
  const nanosRaw = (ts as { nanos?: number | string | null }).nanos;
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

function toPlayReviews(
  rs?: androidpublisher_v3.Schema$ReviewsListResponse | null
): PlayReview[] {
  const out: PlayReview[] = [];
  const reviews = rs?.reviews ?? [];
  for (const r of reviews) {
    const reviewId = r.reviewId ?? '';
    const author = r.authorName ?? undefined;
    const comments = r.comments ?? [];
    // もっとも新しいユーザーコメント（開発者返信ではない）を採用
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
    const language = latest.reviewerLanguage ?? undefined;
    const versionName = latest.appVersionName ?? undefined;
    const rating = Number(latest.starRating ?? 0) || 0;
    const content = String(latest.text ?? '').trim();
    const id = `${reviewId}:${updated}`;
    out.push({
      id,
      reviewId,
      updated,
      content,
      rating,
      versionName,
      author,
      language,
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

export async function runGooglePlayReviewJob() {
  const debug = process.env.REVIEWS_DEBUG === '1';
  const dryRun = process.env.REVIEWS_DRY_RUN === '1';
  const forceCount = Number(process.env.REVIEWS_FORCE_LATEST_COUNT ?? 0);
  const packageName =
    process.env.GOOGLE_PLAY_PACKAGE_NAME || 'me.tinykitten.trainlcd';
  const discordWebhook = process.env.DISCORD_REVIEW_WEBHOOK_URL;
  const stateUri = process.env.GOOGLEPLAY_REVIEW_STATE_GCS_URI; // gs://<bucket>/states/googleplay-reviews.json
  if (!discordWebhook) {
    throw new Error('process.env.DISCORD_REVIEW_WEBHOOK_URL is not set');
  }

  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
  const api = androidpublisher({ version: 'v3', auth });

  // 1) 既存状態の取得
  const state = await loadState(stateUri);
  const lastUpdated = state.lastUpdated ? dayjs(state.lastUpdated) : null;
  const lastIds = new Set(state.lastIds ?? []);
  if (debug) {
    console.log('[PlayJob] start', {
      packageName,
      hasStateUri: Boolean(stateUri),
      lastUpdated: state.lastUpdated ?? null,
      lastIdsSize: lastIds.size,
    });
  }

  // 2) レビューの取得（ページング）
  const all: PlayReview[] = [];
  let token: string | undefined = undefined;
  for (let page = 0; page < 10; page++) {
    try {
      const response = (await api.reviews.list({
        packageName,
        maxResults: 100,
        token,
      })) as unknown as {
        data: androidpublisher_v3.Schema$ReviewsListResponse;
      };
      const data = response.data;
      const items = toPlayReviews(data);
      all.push(...items);
      if (debug) {
        const rawCount = Array.isArray(data?.reviews) ? data.reviews.length : 0;
        const hasNext = Boolean(data?.tokenPagination?.nextPageToken);
        console.log('[PlayJob] page', {
          page,
          rawCount,
          parsed: items.length,
          hasNext,
        });
      }
      token = data?.tokenPagination?.nextPageToken ?? undefined; // next page token
      if (!token) break;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[PlayJob] reviews.list failed', msg);
      throw e;
    }
  }
  if (debug) console.log('[PlayJob] fetched total', { parsed: all.length });

  // 3) フィルタ（新着かつ未処理）
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
    if (debug) {
      console.log('[PlayJob] force mode enabled', {
        forceCount,
        actual: postTargets.length,
      });
    }
  }
  if (debug) {
    console.log('[PlayJob] newcomers', {
      count: newcomers.length,
      all: all.length,
    });
  }

  // 4) Discord通知
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

  // 5) 状態更新
  if (all.length) {
    const newest = all.reduce(
      (p, c) => (dayjs(c.updated).isAfter(dayjs(p.updated)) ? c : p),
      all[0]
    );
    const updatedIds = [
      ...Array.from(
        new Set([
          ...(state.lastIds ?? []).slice(-20),
          ...all.slice(0, 20).map((r) => r.id),
        ])
      ),
    ].slice(-60);
    await saveState(stateUri, {
      lastUpdated: newest.updated,
      lastIds: updatedIds,
    });
    if (debug) {
      console.log('[PlayJob] state saved', {
        lastUpdated: newest.updated,
        lastIds: updatedIds.length,
      });
    }
  }
}

export const googlePlayReviewNotifier = onSchedule(
  {
    schedule: process.env.PLAY_REVIEWS_CRON_SCHEDULE || 'every 60 minutes',
    timeZone: process.env.PLAY_REVIEWS_TIMEZONE || 'UTC',
    region: 'asia-northeast1',
    maxInstances: 1,
  },
  async () => {
    await runGooglePlayReviewJob();
  }
);
