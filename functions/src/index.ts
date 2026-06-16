/**
 * TrainLCD Cloudflare Worker のエントリポイント。
 * 1 つの Worker に HTTP(fetch) / キュー(queue) / Cron(scheduled) の 3 ハンドラを集約する。
 */
import { processFeedbackMessage } from './consumers/feedbackTriage';
import { processTtsCacheMessage } from './consumers/ttsCache';
import { withCallable } from './lib/callable';
import { handleAuthToken } from './routes/auth';
import { handleMaintenanceConfig, handleRemoteConfig } from './routes/config';
import { handleFeedback } from './routes/feedback';
import { handleTts } from './routes/tts';
import { handleUploadImage } from './routes/uploadImage';
import { runAppStoreReviewJob } from './scheduled/appStoreReviews';
import { runGooglePlayReviewJob } from './scheduled/googlePlayReviews';
import type { Env, FeedbackQueueMessage, TtsCacheMessage } from './types';

const notFound = () =>
  new Response(JSON.stringify({ error: 'not found' }), {
    status: 404,
    headers: { 'content-type': 'application/json; charset=UTF-8' },
  });

export default {
  async fetch(
    req: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(req.url);
    const { pathname } = url;
    const method = req.method.toUpperCase();

    try {
      if (method === 'GET' && pathname === '/health') {
        return new Response('ok');
      }
      if (method === 'POST' && pathname === '/auth/token') {
        return await handleAuthToken(req, env);
      }
      if (method === 'POST' && pathname === '/tts') {
        return await withCallable(() => handleTts(req, env, ctx));
      }
      if (method === 'POST' && pathname === '/postFeedback') {
        return await withCallable(() => handleFeedback(req, env));
      }
      if (method === 'POST' && pathname === '/feedback/upload-image') {
        return await withCallable(() => handleUploadImage(req, env));
      }
      if (method === 'GET' && pathname === '/config/maintenance') {
        return await handleMaintenanceConfig(env);
      }
      if (method === 'GET' && pathname === '/config/remote') {
        return await handleRemoteConfig(env);
      }
      return notFound();
    } catch (e) {
      console.error(`Unhandled error on ${method} ${pathname}:`, e);
      return new Response(JSON.stringify({ error: 'internal error' }), {
        status: 500,
        headers: { 'content-type': 'application/json; charset=UTF-8' },
      });
    }
  },

  async queue(
    batch: MessageBatch<TtsCacheMessage | FeedbackQueueMessage>,
    env: Env
  ): Promise<void> {
    const isTtsCache = batch.queue.startsWith('tts-cache');
    for (const message of batch.messages) {
      try {
        if (isTtsCache) {
          await processTtsCacheMessage(message.body as TtsCacheMessage, env);
        } else {
          await processFeedbackMessage(
            message.body as FeedbackQueueMessage,
            env
          );
        }
        message.ack();
      } catch (e) {
        console.error(`Queue message failed (${batch.queue}):`, e);
        message.retry();
      }
    }
  },

  async scheduled(
    _event: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    ctx.waitUntil(
      Promise.allSettled([
        runAppStoreReviewJob(env),
        runGooglePlayReviewJob(env),
      ]).then((results) => {
        for (const r of results) {
          if (r.status === 'rejected') {
            console.error('Scheduled review job failed:', r.reason);
          }
        }
      })
    );
  },
};
