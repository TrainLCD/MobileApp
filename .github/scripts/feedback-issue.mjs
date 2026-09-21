#!/usr/bin/env node
// TrainLCD/Issues のフィードバック issue を読み、自動修正の対象かどうかを見極め、
// プロンプトへ渡す Markdown を書き出す。
// .github/workflows/auto_fix_from_feedback.yml から呼ばれる前提で、追加の依存を
// 持たず Node 24 の標準機能（ESM）だけで動くようにしている。
//
// このスクリプトの役割は 2 つある。
//  1) 条件の確認: ラベルの条件を、dispatch を投げてきた側とは別にもう一度
//     確かめる。向こうが正しく絞ってくれているとは限らないため。
//  2) 個人情報の除去: issue の本文はアプリの利用者がそのまま書いたもので、
//     送信者の識別子やレポート画像の URL が入っている。これらを取り除き、
//     さらにモデルから見たタグの切れ目を装われないようにしてから渡す。

import { realpathSync } from 'node:fs';
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// 既定のトリアージ条件。P1 に絞ったのは、open な P1 が 5 件しか無いのに対して
// P2 は数十件あるため。全部エージェントに渡すと、#6721 でクレジットを使い切った
// ときと同じことになる。ai_code_review.yml を手動実行だけにしてあるのと同じ理由。
export const DEFAULT_TRIAGE_LABELS = ['🟠 P1 / High'];
export const DEFAULT_CATEGORY_LABELS = ['🐛 Bug', '💣 Crash'];
// plan-from-feedback スキルは `🐥 Canary` も既定で除外しているが、あちらは
// たまったチケットから次に手を付けるものを選ぶスキルで、目的が違う。Canary で
// 見つかった P1 は製品版へ降りてくる前に直したいので、ここでは除外しない。
export const DEFAULT_EXCLUDE_LABELS = [
  '💩 Spam',
  'duplicate',
  'wontfix',
  'invalid',
];

// 本文から丸ごと取り除く節。送信者を特定できる値と、R2 上のレポート画像へ
// 辿れる値は残さない。plan-from-feedback スキルの出力と同じ基準にしてある。
const DROPPED_SECTIONS = new Set([
  'チケットID',
  'Sentry Event ID',
  'レポーターUID',
]);

// 画像の URL には送信者の UID が入っているうえ、モデルは画像を読めない。
const MARKDOWN_IMAGE_PATTERN = /!\[[^\]]*\]\([^)]*\)/g;
// 画像の記法を外したあとに、素の URL が残る場合に備える。
const REPORT_IMAGE_URL_PATTERN = /https?:\/\/\S*report-images\/\S*/g;

// プロンプトで使っているタグと同じ綴りが本文に現れると、モデルから見てタグの
// 切れ目が曖昧になる。ai-code-review.mjs と同じく、開き山括弧を実体参照へ
// 置き換えるだけで足りる。本文の読みやすさもそのまま残る。
const STRUCTURAL_TAG_PATTERN =
  /<(\/?)(feedback_issue|title|body|labels|instructions)\b/gi;

// プロンプト全体を圧迫しない長さにしてある。実際のフィードバックは 2000 文字
// 未満に収まっていて、この上限に当たるのは極端に長い自由記述だけ。
const MAX_BODY_CHARS = 8000;
// GitHub Actions の output は 1 行単位で読まれる。信用できない文字列を改行ごと
// 流すと、後ろに続く `key=value` を装えてしまうので、値は必ずここを通す。
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

// ラベルの条件を満たしているかを確かめる。満たしていなくても失敗にはせず、
// 理由を返す。ワークフロー側で、対象外として正常に終われるようにするため。
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
      reason: `トリアージラベルが付いていません (いずれかが必要: ${rules.triage.join(' / ')})`,
    };
  }
  if (!labels.some((name) => rules.category.includes(name))) {
    return {
      eligible: false,
      reason: `カテゴリラベルが付いていません (いずれかが必要: ${rules.category.join(' / ')})`,
    };
  }
  return { eligible: true, reason: '条件を満たしています' };
};

const HEADING_PATTERN = /^##\s+(.+?)\s*$/;

// 個人情報の節を、フェンスの開閉状態と無関係に取り除く。
//
// Worker は利用者の原文をフェンスで囲み、その後ろに端末情報などの節を足す。
// 原文の中に ``` だけの行が奇数個あると、フェンスの開閉がずれて末尾の節まで
// 「フェンスの内側」と見なされる。そうなると見出しとして認識されず、
// splitSections 側の除去をすり抜けてレポーターの識別子がモデルへ渡ってしまう。
// ここは行を素直に走査し、見出しの並びだけで節を切る。
//
// 取り除くのは各見出しの「最後の出現」に限る。利用者が原文に同じ見出しを
// 書いていた場合、そちらは症状の一部なので残す。Worker が足す節は必ず原文より
// 後ろに来るため、最後の出現が Worker のものになる。
export const dropSensitiveSections = (body) => {
  const lines = String(body ?? '').split(/\r?\n/);
  const removed = new Array(lines.length).fill(false);

  for (const heading of DROPPED_SECTIONS) {
    let start = -1;
    for (let index = 0; index < lines.length; index += 1) {
      const matched = HEADING_PATTERN.exec(lines[index]);
      if (matched && matched[1] === heading) {
        start = index;
      }
    }
    if (start === -1) {
      continue;
    }
    let end = lines.length;
    for (let index = start + 1; index < lines.length; index += 1) {
      if (HEADING_PATTERN.test(lines[index])) {
        end = index;
        break;
      }
    }
    for (let index = start; index < end; index += 1) {
      removed[index] = true;
    }
  }

  return lines.filter((_, index) => !removed[index]).join('\n');
};

// 本文を「見出しの無い前書き」と「## 見出しごとの節」に分ける。
// コードブロックの内側にある `## ` は見出しとして扱わない。利用者の原文は
// コードブロックの中に入るので、そこに `## レポーターUID` のような行を書いて
// 節の切れ目を装われないようにするため。
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

// 個人情報を含む節を取り除き、画像を外した本文を組み立てる。
// 除去は 2 段構えにしてある。先に dropSensitiveSections でフェンスと無関係に
// 落とし、そのうえで節に分けたあともう一度落とす。片方が想定外の本文で
// すり抜けても、もう片方が残る。
export const sanitizeBody = (body) => {
  const { preamble, sections } = splitSections(dropSensitiveSections(body));
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
    console.log(`::notice::対象外なので自動修正は行いません: ${sanitizeOutputValue(reason)}`);
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

// テストから関数だけを import できるよう、直接起動されたときだけ main() を走らせる。
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
