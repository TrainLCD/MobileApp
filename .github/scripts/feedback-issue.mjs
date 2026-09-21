#!/usr/bin/env node
// TrainLCD/Issues のフィードバック issue を読み、自動修正 PR の対象かどうかを
// 判定したうえで、プロンプトへ渡す Markdown を書き出す。
// .github/workflows/auto_fix_from_feedback.yml から呼ばれる前提で、追加依存を
// 持たず Node 24 の標準機能（ESM）だけで完結させている。
//
// このスクリプトが担う役割は 2 つある。
//  1) 判定: ラベル条件をワークフロー側から独立して再評価する。dispatch 元の
//     判定を信用せず、MobileApp 側でも同じ条件を確かめるための二重化。
//  2) 無害化: issue 本文はアプリ利用者が書いた文字列で、レポーターの識別子や
//     レポート画像の URL を含む。これらを落とし、モデルから見た構造タグの
//     境界を偽装できないようにしてから渡す。

import { realpathSync } from 'node:fs';
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// 既定のトリアージ条件。P1 に絞っているのは、open な P1 が 5 件しか無い一方で
// P2 は数十件あり、全件をエージェントに渡すと ai_code_review.yml が自動トリガーを
// 持たない理由（#6721 のクレジット枯渇）をそのまま繰り返すため。
export const DEFAULT_TRIAGE_LABELS = ['🟠 P1 / High'];
export const DEFAULT_CATEGORY_LABELS = ['🐛 Bug', '💣 Crash'];
// plan-from-feedback スキルは `🐥 Canary` も既定で除外するが、あちらは
// バックログから着手対象を見繕うスキルで、目的が違う。Canary で出た P1 は
// 製品版へ降りてくる前に直したいものなので、ここでは除外しない。
export const DEFAULT_EXCLUDE_LABELS = [
  '💩 Spam',
  'duplicate',
  'wontfix',
  'invalid',
];

// 本文から丸ごと落とす節。レポーターを特定できる値と、R2 上のレポート画像へ
// 辿れる値を残さない。plan-from-feedback スキルの出力規約と同じ基準。
const DROPPED_SECTIONS = new Set([
  'チケットID',
  'Sentry Event ID',
  'レポーターUID',
]);

// 画像はレポーター UID を含む URL でしか参照できないうえ、モデルは読めない。
const MARKDOWN_IMAGE_PATTERN = /!\[[^\]]*\]\([^)]*\)/g;
// 画像記法を外した後に素の URL が残る場合に備える。
const REPORT_IMAGE_URL_PATTERN = /https?:\/\/\S*report-images\/\S*/g;

// プロンプトの構造タグと同じ綴りが untrusted な本文に現れると、モデルから見て
// タグの境界が曖昧になる。ai-code-review.mjs と同じく、開き山括弧の実体参照化
// だけで足りる。本文の可読性は保たれる。
const STRUCTURAL_TAG_PATTERN =
  /<(\/?)(feedback_issue|title|body|labels|instructions)\b/gi;

// プロンプト全体を圧迫しない範囲。実測のフィードバック本文は 2000 文字未満で、
// 上限に当たるのは極端に長い自由記述だけ。
const MAX_BODY_CHARS = 8000;
// GitHub Actions の output は 1 行で扱う。untrusted な文字列を改行ごと流すと
// 後続の `key=value` を偽装できるため、値は必ずここを通す。
const MAX_OUTPUT_VALUE_CHARS = 300;

export const neutralizeStructuralTags = (text) =>
  String(text ?? '').replace(STRUCTURAL_TAG_PATTERN, '&lt;$1$2');

export const sanitizeOutputValue = (value) =>
  String(value ?? '')
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, MAX_OUTPUT_VALUE_CHARS);

export const parseLabelList = (raw, fallback) => {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return [...fallback];
  }
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');
};

export const extractLabelNames = (issue) =>
  (Array.isArray(issue?.labels) ? issue.labels : [])
    .map((label) => (typeof label === 'string' ? label : label?.name))
    .filter((name) => typeof name === 'string' && name !== '');

// ラベル条件を満たすかを判定する。満たさない場合も失敗にはせず、理由を返して
// ワークフロー側で「対象外として正常終了」できるようにする。
export const evaluateEligibility = (issue, rules) => {
  if (issue?.state !== 'open') {
    return { eligible: false, reason: `issue が open ではありません (${issue?.state ?? '不明'})` };
  }
  if (issue?.pull_request) {
    return { eligible: false, reason: 'issue ではなく pull request です' };
  }

  const labels = extractLabelNames(issue);
  const excluded = labels.filter((name) => rules.exclude.includes(name));
  if (excluded.length > 0) {
    return { eligible: false, reason: `除外ラベルが付いています: ${excluded.join(' / ')}` };
  }
  if (!labels.some((name) => rules.triage.includes(name))) {
    return {
      eligible: false,
      reason: `対象のトリアージラベルがありません (必要: ${rules.triage.join(' / ')})`,
    };
  }
  if (!labels.some((name) => rules.category.includes(name))) {
    return {
      eligible: false,
      reason: `対象のカテゴリラベルがありません (必要: ${rules.category.join(' / ')})`,
    };
  }
  return { eligible: true, reason: '条件を満たしています' };
};

// 本文を「見出しの無い前文」と「## 見出し単位の節」へ分ける。
// フェンスコードブロックの内側にある `## ` は見出しとして扱わない。利用者の
// 原文はフェンスの中に入っており、そこに書かれた `## レポーターUID` のような
// 行で節の切れ目を偽装されるのを防ぐ。
export const splitSections = (body) => {
  const preamble = [];
  const sections = [];
  let current = null;
  let inFence = false;

  for (const line of String(body ?? '').split(/\r?\n/)) {
    if (/^\s{0,3}(```|~~~)/.test(line)) {
      inFence = !inFence;
    }
    const heading = inFence ? null : /^##\s+(.+?)\s*$/.exec(line);
    if (heading) {
      current = { heading: heading[1], lines: [] };
      sections.push(current);
      continue;
    }
    (current ? current.lines : preamble).push(line);
  }

  return {
    preamble: preamble.join('\n'),
    sections: sections.map(({ heading, lines }) => ({
      heading,
      content: lines.join('\n'),
    })),
  };
};

const stripImages = (text) =>
  text
    .replace(MARKDOWN_IMAGE_PATTERN, '')
    .replace(REPORT_IMAGE_URL_PATTERN, '(画像URLは省略)');

const collapseBlankLines = (text) => text.replace(/\n{3,}/g, '\n\n').trim();

// 個人情報を含む節を落とし、画像を外した本文を組み立てる。
export const sanitizeBody = (body) => {
  const { preamble, sections } = splitSections(body);
  const kept = sections.filter(({ heading }) => !DROPPED_SECTIONS.has(heading));
  const rendered = kept
    .map(({ heading, content }) => `## ${heading}\n${collapseBlankLines(content)}`)
    .join('\n\n');
  const head = collapseBlankLines(stripImages(preamble));
  return collapseBlankLines([head, stripImages(rendered)].filter((part) => part !== '').join('\n\n'));
};

export const renderFeedbackDocument = ({ number, title, labels, body }) => {
  const sanitized = sanitizeBody(body);
  const truncated = sanitized.length > MAX_BODY_CHARS;
  const text = truncated ? sanitized.slice(0, MAX_BODY_CHARS) : sanitized;
  return [
    `<feedback_issue number="${Number(number)}">`,
    `<labels>${neutralizeStructuralTags(labels.join(', '))}</labels>`,
    `<title>${neutralizeStructuralTags(title)}</title>`,
    '<body>',
    neutralizeStructuralTags(text),
    truncated ? '\n（本文が長いため以降を省略しました）' : '',
    '</body>',
    '</feedback_issue>',
  ]
    .filter((line) => line !== '')
    .join('\n');
};

const requireEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`環境変数 ${name} は必須です`);
  }
  return value;
};

const writeOutput = async (entries) => {
  if (!process.env.GITHUB_OUTPUT) {
    return;
  }
  const body = Object.entries(entries)
    .map(([key, value]) => `${key}=${sanitizeOutputValue(value)}`)
    .join('\n');
  await appendFile(process.env.GITHUB_OUTPUT, `${body}\n`, 'utf8');
};

const main = async () => {
  const issue = JSON.parse(await readFile(requireEnv('ISSUE_JSON_PATH'), 'utf8'));
  const rules = {
    triage: parseLabelList(process.env.TRIAGE_LABELS, DEFAULT_TRIAGE_LABELS),
    category: parseLabelList(process.env.CATEGORY_LABELS, DEFAULT_CATEGORY_LABELS),
    exclude: parseLabelList(process.env.EXCLUDE_LABELS, DEFAULT_EXCLUDE_LABELS),
  };

  const labels = extractLabelNames(issue);
  const { eligible, reason } = evaluateEligibility(issue, rules);
  await writeOutput({ eligible: String(eligible), reason });

  if (!eligible) {
    console.log(`::notice::対象外のため自動修正をスキップします: ${sanitizeOutputValue(reason)}`);
    return;
  }

  await writeFile(
    requireEnv('OUTPUT_PATH'),
    `${renderFeedbackDocument({
      number: issue.number,
      title: issue.title ?? '',
      labels,
      body: issue.body ?? '',
    })}\n`,
    'utf8'
  );
  console.log(`対象: TrainLCD/Issues#${Number(issue.number)} / ラベル数 ${labels.length}`);
};

// テストから純粋関数を import できるよう、直接起動されたときだけ main() を走らせる。
const isDirectRun = () => {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  try {
    return import.meta.url === pathToFileURL(realpathSync(entry)).href;
  } catch {
    return false;
  }
};

if (isDirectRun()) {
  main().catch((error) => {
    console.error(`::error::フィードバック issue の解析に失敗しました: ${error.message}`);
    process.exitCode = 1;
  });
}
