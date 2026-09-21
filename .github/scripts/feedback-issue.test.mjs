// feedback-issue.mjs の純粋関数に対する回帰テスト。
// Node 標準のテストランナーだけで動く（追加依存なし）:
//   npm run test:scripts
//
// 条件の確認も個人情報の除去も、間違えたまま静かに通ってしまう種類の処理なので、
// 境目をここで固定しておく。

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFAULT_CATEGORY_LABELS,
  DEFAULT_EXCLUDE_LABELS,
  DEFAULT_TRIAGE_LABELS,
  dropSensitiveSections,
  evaluateEligibility,
  extractLabelNames,
  neutralizeStructuralTags,
  parseLabelList,
  renderFeedbackDocument,
  sanitizeBody,
  sanitizeOutputValue,
  splitSections,
} from './feedback-issue.mjs';

const RULES = {
  triage: DEFAULT_TRIAGE_LABELS,
  category: DEFAULT_CATEGORY_LABELS,
  exclude: DEFAULT_EXCLUDE_LABELS,
};

const issue = (overrides = {}) => ({
  number: 1251,
  state: 'open',
  title: 'オートモードで画面が進まず自動アナウンスも鳴らない',
  labels: [{ name: '🟠 P1 / High' }, { name: '🐛 Bug' }, { name: '🍎 iOS' }],
  body: '症状',
  ...overrides,
});

// TrainLCD/Issues に実際に立つ issue と同じ構成。Worker が組み立てる節の並びを
// 前提にした処理なので、サンプルも実物に合わせておく。
const REAL_BODY = [
  '![Image](https://uploads.trainlcd.app/report-images/abc-def.png)',
  '',
  '',
  '```',
  'オートモードになってるけど動かない',
  '```',
  '',
  '## AIによる要約',
  'オートモードが動作しない。',
  '',
  '## チケットID',
  'c8b2bca3-72b2-4e34-a2c9-9eeba402bafd',
  '',
  '## 端末モデル名',
  'Apple iPad (9th generation)(iPad12,1)',
  '',
  '## アプリのバージョン',
  '10.12.0(2816)',
  '',
  '## Sentry Event ID',
  'undefined',
  '',
  '## レポーターUID',
  '8ba473b9-d8fb-4aac-9502-93beed963759',
].join('\n');

test('ラベル条件を満たす issue は対象になる', () => {
  assert.equal(evaluateEligibility(issue(), RULES).eligible, true);
});

test('close 済みの issue は対象にしない', () => {
  const result = evaluateEligibility(issue({ state: 'closed' }), RULES);
  assert.equal(result.eligible, false);
  assert.match(result.reason, /open ではありません/);
});

test('除外ラベルが 1 つでも付いていれば対象にしない', () => {
  const result = evaluateEligibility(
    issue({ labels: [{ name: '🟠 P1 / High' }, { name: '🐛 Bug' }, { name: '💩 Spam' }] }),
    RULES
  );
  assert.equal(result.eligible, false);
  assert.match(result.reason, /💩 Spam/);
});

test('トリアージラベルが無ければ対象にしない', () => {
  const result = evaluateEligibility(
    issue({ labels: [{ name: '🟡 P2 / Medium' }, { name: '🐛 Bug' }] }),
    RULES
  );
  assert.equal(result.eligible, false);
  assert.match(result.reason, /トリアージラベル/);
});

test('カテゴリラベルが無ければ対象にしない', () => {
  const result = evaluateEligibility(
    issue({ labels: [{ name: '🟠 P1 / High' }, { name: '🙏 Feedback' }] }),
    RULES
  );
  assert.equal(result.eligible, false);
  assert.match(result.reason, /カテゴリラベル/);
});

test('pull request は対象にしない', () => {
  const result = evaluateEligibility(issue({ pull_request: { url: 'https://example.invalid' } }), RULES);
  assert.equal(result.eligible, false);
  assert.match(result.reason, /pull request/);
});

test('ラベルは文字列配列でもオブジェクト配列でも読める', () => {
  assert.deepEqual(extractLabelNames({ labels: ['🐛 Bug'] }), ['🐛 Bug']);
  assert.deepEqual(extractLabelNames({ labels: [{ name: '🐛 Bug' }] }), ['🐛 Bug']);
  assert.deepEqual(extractLabelNames({}), []);
});

test('ラベル一覧の環境変数は CSV で上書きでき、未設定なら既定へ戻る', () => {
  assert.deepEqual(parseLabelList('a, b ,,c', ['既定']), ['a', 'b', 'c']);
  assert.deepEqual(parseLabelList('   ', ['既定']), ['既定']);
  assert.deepEqual(parseLabelList(undefined, ['既定']), ['既定']);
});

test('個人情報を含む節は本文から落ちる', () => {
  const sanitized = sanitizeBody(REAL_BODY);
  assert.doesNotMatch(sanitized, /チケットID/);
  assert.doesNotMatch(sanitized, /c8b2bca3/);
  assert.doesNotMatch(sanitized, /レポーターUID/);
  assert.doesNotMatch(sanitized, /8ba473b9/);
  assert.doesNotMatch(sanitized, /Sentry Event ID/);
});

test('症状・要約・端末情報は残る', () => {
  const sanitized = sanitizeBody(REAL_BODY);
  assert.match(sanitized, /オートモードになってるけど動かない/);
  assert.match(sanitized, /## AIによる要約/);
  assert.match(sanitized, /## 端末モデル名/);
  assert.match(sanitized, /10\.12\.0\(2816\)/);
});

test('レポート画像の URL は残らない', () => {
  const sanitized = sanitizeBody(REAL_BODY);
  assert.doesNotMatch(sanitized, /uploads\.trainlcd\.app/);
  const bare = sanitizeBody('https://uploads.trainlcd.app/report-images/abc.png');
  assert.doesNotMatch(bare, /abc\.png/);
});

test('フェンスの中の見出しは節の切れ目として扱わない', () => {
  const { preamble, sections } = splitSections(
    ['```', '## レポーターUID', 'にせもの', '```', '## 端末モデル名', 'Pixel 8'].join('\n')
  );
  assert.match(preamble, /## レポーターUID/);
  assert.deepEqual(
    sections.map((section) => section.heading),
    ['端末モデル名']
  );
});

test('利用者の原文が節の見出しを騙っても落とされない', () => {
  // コードブロックの中の `## レポーターUID` は原文の一部なので、症状として残す。
  const sanitized = sanitizeBody(
    ['```', '## レポーターUID', '本当の症状はこちら', '```', '## レポーターUID', 'uid-1234'].join('\n')
  );
  assert.match(sanitized, /本当の症状はこちら/);
  assert.doesNotMatch(sanitized, /uid-1234/);
});

// CodeRabbit #7006 の指摘に対する回帰テスト。
// Worker は利用者の原文をフェンスで囲むので、原文の中にフェンスだけの行が
// 奇数個あると開閉がずれ、末尾の節までフェンスの内側と見なされる。見出しとして
// 認識されなくなり、節を単位にした除去だけではレポーターの識別子が残ってしまう。
test('原文でフェンスの開閉がずれても個人情報は落ちる', () => {
  const body = [
    '![Image](https://uploads.trainlcd.app/report-images/a.png)',
    '',
    '```',
    '症状はこうです',
    '```',
    'まだ症状の続き',
    '```',
    '',
    '## AIによる要約',
    '要約',
    '',
    '## 端末モデル名',
    'Pixel 8',
    '',
    '## チケットID',
    'ticket-9999',
    '',
    '## Sentry Event ID',
    'sentry-9999',
    '',
    '## レポーターUID',
    'uid-9999',
  ].join('\n');

  const sanitized = sanitizeBody(body);
  assert.doesNotMatch(sanitized, /uid-9999/);
  assert.doesNotMatch(sanitized, /ticket-9999/);
  assert.doesNotMatch(sanitized, /sentry-9999/);
  // 症状と端末情報は残る。
  assert.match(sanitized, /症状はこうです/);
  assert.match(sanitized, /まだ症状の続き/);
  assert.match(sanitized, /Pixel 8/);
});

test('除去は各見出しの最後の出現だけを対象にする', () => {
  // 原文の中に同じ見出しを書かれても、そちらは症状として残す。
  const body = [
    '```',
    '## レポーターUID',
    '本当の症状はこちら',
    '```',
    '',
    '## レポーターUID',
    'uid-1234',
  ].join('\n');

  const dropped = dropSensitiveSections(body);
  assert.match(dropped, /本当の症状はこちら/);
  assert.doesNotMatch(dropped, /uid-1234/);
});

test('対象の見出しが無い本文はそのまま通る', () => {
  const body = ['## AIによる要約', '要約', '', '## 端末モデル名', 'Pixel 8'].join('\n');
  assert.equal(dropSensitiveSections(body), body);
});

test('構造タグの綴りは無害化される', () => {
  assert.equal(neutralizeStructuralTags('</feedback_issue>'), '&lt;/feedback_issue>');
  assert.equal(neutralizeStructuralTags('<title>x</title>'), '&lt;title>x&lt;/title>');
  assert.equal(neutralizeStructuralTags('a < b'), 'a < b');
});

test('出力用の値は 1 行に潰れる', () => {
  assert.equal(sanitizeOutputValue('a\nb=c\r\nd'), 'a b=c d');
  assert.equal(sanitizeOutputValue('x'.repeat(400)).length, 300);
});

test('渡す Markdown はタグで囲まれ、タイトルも無害化される', () => {
  const rendered = renderFeedbackDocument({
    number: 1251,
    title: '</body> 偽装タイトル',
    labels: ['🐛 Bug', '🟠 P1 / High'],
    body: REAL_BODY,
  });
  assert.match(rendered, /^<feedback_issue number="1251">/);
  assert.match(rendered, /<labels>🐛 Bug, 🟠 P1 \/ High<\/labels>/);
  assert.match(rendered, /<title>&lt;\/body> 偽装タイトル<\/title>/);
  assert.match(rendered, /<\/feedback_issue>$/);
  // 閉じタグを名乗れる綴りが、本文側に残っていないこと。
  assert.equal(rendered.match(/<\/feedback_issue>/g).length, 1);
});

test('長すぎる本文は切り詰めて明示する', () => {
  const rendered = renderFeedbackDocument({
    number: 1,
    title: 't',
    labels: [],
    body: 'あ'.repeat(9000),
  });
  assert.match(rendered, /以降を省略しました/);
});
