// feedback-autofix-comment.mjs の純粋関数に対する回帰テスト。
// Node 標準のテストランナーだけで動く（追加依存なし）:
//   npm run test:scripts
//
// 押さえるのは 2 点。どの経路でも必ずコメントを返すこと（返さない経路は
// issue が放置される経路になる）と、失敗の報告が重複検知に引っかからないこと
// （引っかかると一過性の失敗で二度と再実行できなくなる）。

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ERROR_MARKER,
  MARKER,
  decideComment,
  parseVerdict,
  renderDeclineComment,
  renderFailureComment,
  renderLinkComment,
  sanitizeReason,
} from './feedback-autofix-comment.mjs';

const RUN_URL = 'https://github.com/TrainLCD/MobileApp/actions/runs/1';
const PR_URL = 'https://github.com/TrainLCD/MobileApp/pull/7002';
const declined = (overrides = {}) => ({
  status: 'ok',
  verdict: { outcome: 'declined', reason: '理由', handoff: '', ...overrides },
});

test('PR が出来ていればリンクを返す', () => {
  const { action, body } = decideComment({
    prUrl: PR_URL,
    verdictResult: { status: 'missing' },
    claudeOutcome: 'success',
    runUrl: RUN_URL,
  });
  assert.equal(action, 'linked');
  assert.ok(body.startsWith(MARKER));
  assert.match(body, /pull\/7002/);
});

test('declined なら理由と引き継ぎ先を添えて返す', () => {
  const { action, body } = decideComment({
    prUrl: '',
    verdictResult: declined({ reason: '路線記号は API が返す値です。', handoff: 'StationAPI' }),
    claudeOutcome: 'success',
    runUrl: RUN_URL,
  });
  assert.equal(action, 'declined');
  assert.match(body, /直せないと判断しました/);
  assert.match(body, /路線記号は API が返す値です。/);
  assert.match(body, /TrainLCD\/StationAPI/);
  assert.doesNotMatch(body, /実行ログ/);
});

test('判断のあとで実行が落ちた場合は、その旨も併記する', () => {
  // 判断だけ書くと完走したように読め、実行ログだけ出すと判断が埋もれる。
  const { action, body } = decideComment({
    prUrl: '',
    verdictResult: declined(),
    claudeOutcome: 'failure',
    runUrl: RUN_URL,
  });
  assert.equal(action, 'declined');
  assert.match(body, /直せないと判断しました/);
  assert.match(body, /実行自体は完了していません/);
  assert.match(body, /actions\/runs\/1/);
});

test('PR がある場合は declined より PR を優先する', () => {
  const { action } = decideComment({
    prUrl: PR_URL,
    verdictResult: declined(),
    claudeOutcome: 'success',
    runUrl: RUN_URL,
  });
  assert.equal(action, 'linked');
});

test('fixed なのに PR が無ければ failed として内訳を返す', () => {
  const { action, body } = decideComment({
    prUrl: '',
    verdictResult: { status: 'ok', verdict: { outcome: 'fixed', reason: '', handoff: '' } },
    claudeOutcome: 'success',
    runUrl: RUN_URL,
  });
  assert.equal(action, 'failed');
  assert.match(body, /PR が見つかりません/);
});

test('判断が無い場合は、どこで止まったかで内訳を出し分ける', () => {
  const stage = (claudeOutcome) =>
    decideComment({
      prUrl: '',
      verdictResult: { status: 'missing' },
      claudeOutcome,
      runUrl: RUN_URL,
    }).body;

  assert.match(stage('skipped'), /実行まで到達しませんでした/);
  assert.match(stage(''), /実行まで到達しませんでした/);
  assert.match(stage('failure'), /失敗または中断しました/);
  assert.match(stage('cancelled'), /失敗または中断しました/);
  assert.match(stage('success'), /判断を残しませんでした/);
});

test('壊れた verdict.json は内訳と先頭の抜粋を返す', () => {
  const { action, body } = decideComment({
    prUrl: '',
    verdictResult: parseVerdict('{"outcome": "fix'),
    claudeOutcome: 'success',
    runUrl: RUN_URL,
  });
  assert.equal(action, 'failed');
  assert.match(body, /読めませんでした/);
  assert.match(body, /```text\n\{"outcome": "fix\n```/);
});

test('どの入力でも action は空にならない', () => {
  for (const claudeOutcome of ['success', 'failure', 'cancelled', 'skipped', '']) {
    for (const verdictResult of [
      { status: 'missing' },
      { status: 'invalid', excerpt: 'x' },
      declined(),
      { status: 'ok', verdict: { outcome: 'fixed', reason: '', handoff: '' } },
    ]) {
      for (const prUrl of ['', PR_URL]) {
        const { action, body } = decideComment({
          prUrl,
          verdictResult,
          claudeOutcome,
          runUrl: RUN_URL,
        });
        assert.ok(['linked', 'declined', 'failed'].includes(action));
        assert.ok(body.trim() !== '');
      }
    }
  }
});

test('失敗の報告は重複検知の目印に一致しない', () => {
  // 一致すると、一過性の失敗のあと二度と再実行できなくなる。
  const body = renderFailureComment({ stage: 'agent-failed', runUrl: RUN_URL });
  assert.ok(body.startsWith(ERROR_MARKER));
  assert.equal(body.startsWith(MARKER), false);
  assert.match(body, /実行ログ: https/);
});

test('判断のコメントは重複検知の目印に一致する', () => {
  for (const body of [
    renderLinkComment(PR_URL),
    renderDeclineComment({ reason: 'r', handoff: 'Functions' }),
  ]) {
    assert.ok(body.startsWith(MARKER));
  }
});

test('verdict.json が壊れていても落ちない', () => {
  assert.equal(parseVerdict('').status, 'missing');
  assert.equal(parseVerdict(undefined).status, 'missing');
  assert.equal(parseVerdict('{').status, 'invalid');
  assert.equal(parseVerdict('{"outcome":"unknown"}').status, 'invalid');
});

test('想定外の引き継ぎ先は捨てる', () => {
  assert.equal(parseVerdict('{"outcome":"declined","handoff":"evil.example"}').verdict.handoff, '');
  assert.equal(parseVerdict('{"outcome":"declined","handoff":"Functions"}').verdict.handoff, 'Functions');
});

test('理由に混ざった HTML コメントは落とす', () => {
  assert.equal(sanitizeReason(`前${MARKER}後`), '前後');
  assert.equal(sanitizeReason(`${ERROR_MARKER}偽装`), '偽装');
  assert.equal(sanitizeReason('<!-- 何か -->理由'), '理由');
});

test('理由は長すぎれば切り詰める', () => {
  assert.equal(sanitizeReason('あ'.repeat(2000)).length, 1200);
});

test('理由が空でもコメントは成立する', () => {
  const body = renderDeclineComment({ reason: '', handoff: '' });
  assert.match(body, /理由は記録されていません。/);
  assert.doesNotMatch(body, /対応先:/);
});

test('どのコメントも出典表記で終わる', () => {
  for (const body of [
    renderLinkComment(PR_URL),
    renderDeclineComment({ reason: 'r', handoff: '' }),
    renderFailureComment({ stage: 'no-verdict', runUrl: RUN_URL }),
  ]) {
    assert.match(body, /_Generated by \[Claude Code\]\(https:\/\/claude\.ai\/code\)_\n$/);
  }
});
