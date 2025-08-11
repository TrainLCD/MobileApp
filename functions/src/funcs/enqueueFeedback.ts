import { onCall, HttpsError } from 'firebase-functions/v2/https';
import type { Report } from '../models/feedback';
import { PubSub } from '@google-cloud/pubsub';

const pubsub = new PubSub();
const TOPIC = process.env.PUBSUB_TOPIC ?? 'feedback-triage';

export const enqueueFeedback = onCall(
  { region: 'asia-northeast1' },
  async (req) => {
    if (!req.auth) throw new HttpsError('failed-precondition', 'Auth required');
    const report = req.data?.report as Report | undefined;
    if (!report?.id)
      throw new HttpsError('invalid-argument', 'report.id required');

    const msg = {
      id: report.id,
      receivedAt: new Date().toISOString(),
      report,
      version: 1,
    };

    // 重要: 生本文はログに出さない
    await pubsub.topic(TOPIC).publishMessage({
      orderingKey: report.reporterUid ?? undefined,
      json: msg,
    });

    return { ok: true, queued: true, id: report.id };
  }
);
