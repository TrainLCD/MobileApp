/** POST /postFeedback — フィードバックを検証してトリアージキューへ投函する（callable 互換）。 */
import { verifySessionToken } from '../lib/auth/session';
import {
  CallableError,
  callableSuccess,
  parseCallableData,
} from '../lib/callable';
import type { Report } from '../models/feedback';
import type { Env } from '../types';

export const handleFeedback = async (
  req: Request,
  env: Env
): Promise<Response> => {
  await verifySessionToken(env, req.headers.get('Authorization'));

  const data = await parseCallableData<{ report?: Report }>(req);
  const report = data.report;
  if (!report?.id) {
    throw new CallableError('invalid-argument', 'report.id required');
  }

  // 重要: 生本文はログに出さない
  await env.FEEDBACK_QUEUE.send({
    id: report.id,
    receivedAt: new Date().toISOString(),
    report,
    version: 1,
  });

  return callableSuccess({ ok: true, queued: true, id: report.id });
};
