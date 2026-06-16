/**
 * feedback-triage キュー consumer — Workers AI でトリアージし、GitHub Issue 作成と
 * Discord 通知を行う。AI 呼び出し以外のロジックは旧 Cloud Functions から流用。
 */
import dayjs from 'dayjs';
import type {
  AICategory,
  AIReport,
  AITriageLevel,
  FewShotItem,
} from '../models/ai';
import type { DiscordEmbed } from '../models/common';
import type { Env, FeedbackQueueMessage } from '../types';

const GITHUB_LABELS = {
  PLATFORM_IOS: '🍎 iOS',
  PLATFORM_IPADOS: '🍎 iPadOS',
  PLATFORM_APPCLIP: '📎 App Clip',
  PLATFORM_ANDROID: '🤖 Android',
  PLATFORM_OTHER_OS: '❓ Other OS',
  PRODUCTION_APP: '🌏 Production',
  CANARY_APP: '🐥 Canary',
  FEEDBACK_TYPE: '🙏 Feedback',
  CRASH_TYPE: '💣 Crash',
  SPAM_TYPE: '💩 Spam',
  UNKNOWN_TYPE: '❓ Unknown Type',
  AUTOMODE_ENABLED: '🤖 Auto Mode',
  CATEGORY_BUG: '🐛 Bug',
  CATEGORY_FEATURE_REQUEST: '✨ Feature Request',
  CATEGORY_IMPROVEMENT: '🛠️ Improvement',
  CATEGORY_QUESTION: '❓ Question',
  TRIAGE_URGENT: '🔴 P0 / Urgent',
  TRIAGE_HIGH: '🟠 P1 / High',
  TRIAGE_MEDIUM: '🟡 P2 / Medium',
  TRIAGE_LOW: '🟢 P3 / Low',
} as const;

const CATEGORY_LABELS: Record<AICategory, string> = {
  bug: GITHUB_LABELS.CATEGORY_BUG,
  feature_request: GITHUB_LABELS.CATEGORY_FEATURE_REQUEST,
  improvement: GITHUB_LABELS.CATEGORY_IMPROVEMENT,
  question: GITHUB_LABELS.CATEGORY_QUESTION,
};

const TRIAGE_LABELS: Record<AITriageLevel, string> = {
  urgent: GITHUB_LABELS.TRIAGE_URGENT,
  high: GITHUB_LABELS.TRIAGE_HIGH,
  medium: GITHUB_LABELS.TRIAGE_MEDIUM,
  low: GITHUB_LABELS.TRIAGE_LOW,
};

const CATEGORY_SYNONYMS: Record<string, AICategory> = {
  bug: 'bug',
  defect: 'bug',
  crash: 'bug',
  feature: 'feature_request',
  feature_request: 'feature_request',
  featurerequest: 'feature_request',
  request: 'feature_request',
  improvement: 'improvement',
  enhancement: 'improvement',
  improve: 'improvement',
  question: 'question',
  support: 'question',
  help: 'question',
};

const TRIAGE_SYNONYMS: Record<string, AITriageLevel> = {
  urgent: 'urgent',
  critical: 'urgent',
  p0: 'urgent',
  high: 'high',
  p1: 'high',
  medium: 'medium',
  normal: 'medium',
  p2: 'medium',
  low: 'low',
  minor: 'low',
  p3: 'low',
};

export function looksLikeSpam(text: string): boolean {
  if (!text) return false;
  const t = String(text).replace(/\s+/g, ' ').trim();

  const ACTIONABLE =
    /(修正|改善|追加|希望|要望|不具合|バグ|誤|間違い|表示|保存|再生|遅|遅延|できない|出来ない|エラー|落ちる|クラッシュ|重複|ズレ|音がない|読み上げない)/;
  if (ACTIONABLE.test(t)) return false;

  let score = 0;

  if (
    /(次は|まもなく|この(列車|電車)は|行きです|ご利用ありがとうございます|お出口は(左|右)側です|各駅に(停ま|止ま)ります|お乗り換え)/.test(
      t
    )
  ) {
    score += 1;
  }
  if (/(停車駅|方面)/.test(t)) score += 1;
  if (
    /([一-龥ァ-ヶー]{2,})(、|,|・|\s)([一-龥ァ-ヶー]{2,})/.test(t) &&
    /(停車|次は|方面)/.test(t)
  ) {
    score += 1;
  }
  if (
    /(Next stop|This (train|service) (is|goes) to|Please change at)/i.test(t)
  ) {
    score += 1;
  }
  if (
    t.length >= 40 &&
    !/[。．.!?！？]/.test(t) &&
    /(次は|まもなく|行きです)/.test(t)
  ) {
    score += 0.5;
  }
  if (/[🚃🚇🚈♪🎵]/u.test(t)) {
    score += 0.5;
  }
  return score >= 2;
}

export function coerceReport(raw: unknown, titleMax = 72): AIReport {
  const norm = (k: string) =>
    String(k).toLowerCase().replace(/\s+/g, '').trim();
  const map = new Map<string, unknown>();
  const entries = raw && typeof raw === 'object' ? Object.entries(raw) : [];
  for (const [k, v] of entries) map.set(norm(k), v);

  const getStr = (k: string, d = '') => String(map.get(k) ?? d).trim();
  const getNum = (k: string, d = 0.5) => {
    const n = Number(map.get(k));
    return Number.isFinite(n) ? n : d;
  };
  const getBool = (...keys: string[]) =>
    keys.some((k) => {
      const v = map.get(k);
      return v === true || v === 'true';
    });

  let title = getStr('title');
  let summary = getStr('summary');
  const isSpam = getBool('isspam');
  const rawLabels = map.get('labels');
  const labels: string[] = Array.isArray(rawLabels)
    ? rawLabels.filter((l): l is string => typeof l === 'string')
    : [];
  const confidence = getNum('confidence', 0.5);
  const reason = getStr('reason');
  const categoryKey = getStr('category')
    .toLowerCase()
    .replaceAll(/[\s-]+/g, '');
  const category: AICategory = CATEGORY_SYNONYMS[categoryKey] ?? 'question';
  const triageKey = getStr('triagelevel')
    .toLowerCase()
    .replaceAll(/[\s-]+/g, '');
  const triageLevel: AITriageLevel = TRIAGE_SYNONYMS[triageKey] ?? 'medium';

  if (!title) title = '要約未取得';
  if (title.length > titleMax) title = `${title.slice(0, titleMax - 1)}…`;
  // 要約が空だと Issue 本文の節が空になり、Discord embed も value 空でリジェクトされるため
  // タイトルにフォールバックして常に何らかのテキストを入れる
  if (!summary) summary = title;

  return {
    title,
    summary,
    isSpam,
    labels,
    confidence,
    reason,
    category,
    triageLevel,
  };
}

/**
 * モデル応答から最初のバランスした JSON オブジェクトだけを取り出してパースする。
 * 小型モデルは few-shot を真似て複数オブジェクトを続けて吐いたり、コードフェンスや
 * 末尾カンマを混ぜることがある。貪欲マッチ（最初の { 〜 最後の }）だとそれらを丸ごと
 * 掴んで全体が壊れるため、文字列・エスケープを考慮して最初の 1 個だけを抽出する。
 * 取り出せない／パースできない場合は null を返す（呼び出し側で生成失敗として扱う）。
 */
export function extractReportJson(text: string): unknown | null {
  if (!text) return null;
  // ```json ... ``` のコードフェンスを除去
  const stripped = text.replace(/```(?:json)?/gi, '');
  const start = stripped.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inStr = false;
  let esc = false;
  let end = -1;
  for (let i = start; i < stripped.length; i++) {
    const c = stripped[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  // 閉じ括弧が見つからない＝出力途中で切れている可能性。候補は得られないので失敗扱い。
  if (end === -1) return null;

  const candidate = stripped.slice(start, end + 1);
  const tryParse = (s: string): unknown | undefined => {
    try {
      return JSON.parse(s);
    } catch {
      return undefined;
    }
  };
  const parsed =
    tryParse(candidate) ??
    // 末尾カンマ（ }, や ], の直前）など軽微な崩れを 1 度だけ修復して再挑戦
    tryParse(candidate.replace(/,(\s*[}\]])/g, '$1'));
  return parsed === undefined ? null : parsed;
}

/** 自動要約欄に出す、失敗を明示する文言（空欄や偽の要約は出さない）。 */
export const TRIAGE_FAILED_SUMMARY =
  '⚠️ 自動要約に失敗しました。上記の本文（原文）をご確認ください。';

/**
 * トリアージ生成が最後まで失敗したときの、原文を捨てないためのレポート。
 * 要約は失敗を明示し、誤ったカテゴリ/トリアージは付けない（スパム扱いにもしない）。
 * タイトルには原文の冒頭を残し、Issue 一覧から内容を判別できるようにする。
 */
export function buildFailedReport(
  description: string,
  titleMax = 72
): AIReport {
  const snippet = String(description ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 48);
  const title = `要約失敗: ${snippet || '（本文なし）'}`.slice(0, titleMax);
  return {
    title,
    summary: TRIAGE_FAILED_SUMMARY,
    isSpam: false,
    labels: [],
    confidence: 0,
    reason: 'triage_failed',
    category: 'question',
    triageLevel: 'medium',
  };
}

const SYSTEM_PROMPT = `
You are a precise issue triager for TrainLCD.
Task:
1. Summarize the user's message into a ONE-LINE issue title in Japanese (≤72 chars).
2. Also create a 1–3 sentence summary in Japanese that concisely describes the feedback content.
3. Classify spam.
4. If NOT spam, pick ONE primary "category" from ["bug","feature_request","improvement","question"]:
   - bug: 不具合・誤動作・クラッシュ・表示崩れ
   - feature_request: まだ存在しない機能の新規要望
   - improvement: 既存機能の改善・調整
   - question: 質問・使い方の確認・情報要求
5. If NOT spam, pick ONE "triageLevel" from ["urgent","high","medium","low"]:
   - urgent: クラッシュ・データ消失・広範な実用不能
   - high: 特定機能が使えない／重要機能要望
   - medium: 通常の改善・軽微なバグ
   - low: 体裁の問題・質問・軽い要望
   If spam, omit "category" and "triageLevel" entirely.

Rules:
- Newspaper-style headline: [症状/論点]+[対象]（助詞は最小限）
- No device/OS/version/URL/stack unless essential
- Prefer Japanese if input has Japanese
- If no actionable content (announcement transcript, chit-chat, praise-only), mark spam
- If not spam, pick labels from:
  ["bug","improvement","feature","localization","location","ui","performance","network","settings"]

Output JSON only:
{"title": "...", "summary": "...", "isSpam": true|false, "labels": [], "category": "...", "triageLevel": "...", "confidence": 0..1, "reason": "..."}

Return ONLY that JSON. No prose, no markdown.
`.trim();

// ---- Few-shot loader（CONFIG_KV） ----
const FEW_SHOT_TTL_MS = 10 * 60 * 1000;
let fewShotCache: { text: string; loadedAt: number } | null = null;

async function loadFewShot(env: Env): Promise<string | null> {
  const raw = await env.CONFIG_KV.get(env.FEW_SHOT_KV_KEY, 'text');
  if (!raw) return null;
  const limit = Number(env.FEW_SHOT_LIMIT) || 12;
  const perExMax = Number(env.FEW_SHOT_PER_EX_MAX) || 800;

  const lines = raw.split(/\r?\n/).filter(Boolean);
  const items: FewShotItem[] = [];
  for (const line of lines) {
    try {
      const o = JSON.parse(line);
      if (o?.input && o?.output && !o.disabled) items.push(o as FewShotItem);
    } catch {
      // 非 JSON 行は無視
    }
  }
  const shuffled = items
    .map((it) => ({
      it,
      r: Math.random() / (it.weight && it.weight > 0 ? it.weight : 1),
    }))
    .sort((a, b) => a.r - b.r)
    .slice(0, limit)
    .map(({ it }) => it);

  const blocks = shuffled.map((it) => {
    const block = `Input:\n${String(it.input)}\nOutput:\n${String(it.output)}`;
    return block.length > perExMax ? `${block.slice(0, perExMax - 1)}…` : block;
  });
  return blocks.join('\n\n');
}

async function getFewShotText(env: Env): Promise<string> {
  const now = Date.now();
  if (fewShotCache && now - fewShotCache.loadedAt < FEW_SHOT_TTL_MS) {
    return fewShotCache.text;
  }
  const text = await loadFewShot(env);
  if (!text) {
    // フェイルハード：few-shot 未設定での誤学習や漏洩を防ぐ
    throw new Error('FEW_SHOT_NOT_AVAILABLE');
  }
  fewShotCache = { text, loadedAt: now };
  return text;
}

async function runTriage(
  env: Env,
  fewshot: string,
  userText: string,
  strict = false
): Promise<string> {
  // strict: 1 回パースに失敗した後の再試行。few-shot の模倣で複数オブジェクトを
  // 吐く／途中で切れるのを抑えるため、出力を 1 個の JSON に厳しく制約し直す。
  const strictNudge = strict
    ? '\n\nIMPORTANT: Output exactly ONE minified JSON object and nothing else. Do not repeat the examples. Do not add prose, comments, or code fences.'
    : '';
  const prompt = `${fewshot}\n\nNow process this message:\n\n<<FEEDBACK>>\n${userText}`;
  const result = (await env.AI.run(env.AI_TRIAGE_MODEL, {
    messages: [
      { role: 'system', content: SYSTEM_PROMPT + strictNudge },
      { role: 'user', content: prompt },
    ],
    max_tokens: 768,
    temperature: strict ? 0 : 0.2,
  })) as { response?: string };
  return typeof result?.response === 'string' ? result.response : '{}';
}

export const processFeedbackMessage = async (
  data: FeedbackQueueMessage,
  env: Env
): Promise<void> => {
  if (!data?.report) return;
  const { report } = data;

  const fewshot = await getFewShotText(env);

  // 生成 → 最初のバランスした JSON を抽出。失敗したら厳格モードで数回まで再生成する。
  // ここで諦めても原文（report.description）は Issue 本文に必ず残すため、フィードバックは捨てない。
  const MAX_TRIAGE_ATTEMPTS = 3;
  let raw: unknown = null;
  let lastText = '';
  for (let attempt = 1; attempt <= MAX_TRIAGE_ATTEMPTS; attempt++) {
    lastText = await runTriage(env, fewshot, report.description, attempt > 1);
    raw = extractReportJson(lastText);
    if (raw !== null) break;
    console.warn('feedbackTriage: モデル応答の JSON パースに失敗（再試行）', {
      reportId: report.id,
      attempt,
      maxAttempts: MAX_TRIAGE_ATTEMPTS,
      responseLength: lastText.length,
      responsePreview: lastText.slice(0, 200),
    });
  }

  const triageFailed = raw === null;
  let aiReport: AIReport;
  if (triageFailed) {
    // 生成に失敗しても破棄しない。原文を保全したまま、要約欄に失敗を明示して起票する。
    console.error(
      'feedbackTriage: トリアージ生成に失敗。要約失敗マーカー付きで起票する',
      { reportId: report.id }
    );
    aiReport = buildFailedReport(report.description, 72);
  } else {
    aiReport = coerceReport(raw, 72);
    // 非スパムで要約だけ空のときは観測ログを残す（coerceReport が title にフォールバック）。
    const rawSummary =
      raw && typeof raw === 'object'
        ? Object.entries(raw).find(
            ([k]) => k.toLowerCase().replace(/\s+/g, '').trim() === 'summary'
          )?.[1]
        : undefined;
    if (!aiReport.isSpam && String(rawSummary ?? '').trim() === '') {
      console.warn(
        'feedbackTriage: モデルが summary を空/欠落で返却（title にフォールバック）',
        { reportId: report.id, responsePreview: lastText.slice(0, 200) }
      );
    }
  }

  if (!aiReport.isSpam && looksLikeSpam(report.description)) {
    aiReport = {
      ...aiReport,
      title: '内容未分類（改善要望なし）',
      isSpam: true,
      labels: [],
      reason: 'non-actionable',
    };
  }

  const {
    id,
    createdAt,
    description,
    deviceInfo,
    language,
    appVersion,
    reporterUid,
    stacktrace,
    reportType,
    imageUrl,
    appEdition,
    appClip,
    autoModeEnabled,
    sentryEventId,
  } = report;

  const createdAtText = dayjs(createdAt).format('YYYY/MM/DD HH:mm:ss');
  const osNameLabel = (() => {
    if (deviceInfo?.osName === 'iOS') return GITHUB_LABELS.PLATFORM_IOS;
    if (deviceInfo?.osName === 'iPadOS') return GITHUB_LABELS.PLATFORM_IPADOS;
    if (deviceInfo?.osName === 'Android') return GITHUB_LABELS.PLATFORM_ANDROID;
    return GITHUB_LABELS.PLATFORM_OTHER_OS;
  })();

  const autoModeLabel = autoModeEnabled
    ? GITHUB_LABELS.AUTOMODE_ENABLED
    : undefined;

  // トリアージ生成に失敗したときは誤ったカテゴリ/優先度を付けない。
  const shouldTagTriage =
    reportType === 'feedback' && !aiReport.isSpam && !triageFailed;
  const categoryLabel = shouldTagTriage
    ? CATEGORY_LABELS[aiReport.category]
    : undefined;
  const triageLabel = shouldTagTriage
    ? TRIAGE_LABELS[aiReport.triageLevel]
    : undefined;

  try {
    const res = await fetch(
      'https://api.github.com/repos/TrainLCD/Issues/issues',
      {
        method: 'post',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${env.OCTOKIT_PAT ?? ''}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'trainlcd-worker',
        },
        body: JSON.stringify({
          title: aiReport.title ?? '要約未取得',
          body: `
![Image](${imageUrl})


${'```'}
${description}
${'```'}

## AIによる要約
${aiReport.summary}

## 発行日時
${createdAtText}

## 端末モデル名
${deviceInfo?.brand} ${deviceInfo?.modelName}(${deviceInfo?.modelId})

## 端末のOS
${deviceInfo?.osName} ${deviceInfo?.osVersion}

## 端末設定言語
${deviceInfo?.locale}

## アプリの設定言語
${language}

## アプリのバージョン
${appVersion}

## オートモード
${autoModeEnabled ? '有効' : '無効'}

## スタックトレース
${'```'}
${stacktrace}
${'```'}

## Sentry Event ID
${sentryEventId}

## レポーターUID
${reporterUid}
        `.trim(),
          assignees: ['TinyKitten'],
          milestone: null,
          labels: [
            reportType === 'feedback' &&
              !aiReport.isSpam &&
              GITHUB_LABELS.FEEDBACK_TYPE,
            reportType === 'crash' && GITHUB_LABELS.CRASH_TYPE,
            appEdition === 'production' && GITHUB_LABELS.PRODUCTION_APP,
            appEdition === 'canary' && GITHUB_LABELS.CANARY_APP,
            appClip && GITHUB_LABELS.PLATFORM_APPCLIP,
            aiReport.isSpam && GITHUB_LABELS.SPAM_TYPE,
            triageFailed && GITHUB_LABELS.UNKNOWN_TYPE,
            osNameLabel,
            autoModeLabel,
            categoryLabel,
            triageLabel,
          ].filter(Boolean),
        }),
      }
    );

    if (res.status !== 201) {
      console.error(await res.json());
      throw new Error(`GitHub API failed with status ${res.status}`);
    }

    const issuesRes = (await res.json()) as { html_url: string };

    const csWHUrl = env.DISCORD_CS_WEBHOOK_URL;
    const crashWHUrl = env.DISCORD_CRASH_WEBHOOK_URL;
    const embeds: DiscordEmbed[] = deviceInfo
      ? [
          {
            fields: [
              { name: 'チケットID', value: id },
              {
                name: '発行日時',
                value: dayjs(createdAt).format('YYYY/MM/DD HH:mm:ss'),
              },
              { name: 'AIによる要約', value: aiReport.summary },
              ...(shouldTagTriage && categoryLabel && triageLabel
                ? [
                    { name: 'カテゴリ', value: categoryLabel },
                    { name: 'トリアージ', value: triageLabel },
                  ]
                : []),
              {
                name: '端末モデル名',
                value: `${deviceInfo.brand} ${deviceInfo.modelName}(${deviceInfo.modelId})`,
              },
              {
                name: '端末のOS',
                value: `${deviceInfo.osName} ${deviceInfo.osVersion}`,
              },
              { name: '端末設定言語', value: deviceInfo.locale },
              { name: 'アプリの設定言語', value: language },
              { name: 'アプリのバージョン', value: appVersion },
              { name: 'レポーターUID', value: reporterUid },
              {
                name: 'オートモード',
                value:
                  autoModeLabel ??
                  (autoModeEnabled === false ? '無効' : '不明'),
              },
              { name: 'GitHub Issue', value: issuesRes.html_url },
              { name: 'Sentry Event ID', value: sentryEventId ?? '不明' },
            ],
          },
        ]
      : [
          {
            fields: [
              { name: 'チケットID', value: id },
              {
                name: '発行日時',
                value: dayjs(createdAt).format('YYYY/MM/DD HH:mm:ss'),
              },
              { name: 'AIによる要約', value: aiReport.summary },
              ...(shouldTagTriage && categoryLabel && triageLabel
                ? [
                    { name: 'カテゴリ', value: categoryLabel },
                    { name: 'トリアージ', value: triageLabel },
                  ]
                : []),
              { name: 'アプリの設定言語', value: language },
              { name: 'アプリのバージョン', value: appVersion },
              { name: 'レポーターUID', value: reporterUid },
              {
                name: 'オートモード',
                value:
                  autoModeLabel ??
                  (autoModeEnabled === false ? '無効' : '不明'),
              },
              { name: 'GitHub Issue', value: issuesRes.html_url },
            ],
          },
        ];

    const stacktraceTooLong = (stacktrace?.split('\n').length ?? 0) > 10;
    const content =
      reportType === 'feedback'
        ? `**🙏アプリから新しいフィードバックが届きまさした‼🙏**\n\`\`\`${description}\`\`\``
        : `**😭アプリからクラッシュレポートが届きまさした‼😭**\n**${description}**\n\`\`\`${stacktrace
            ?.split('\n')
            .slice(0, 10)
            .join('\n')}\n${stacktraceTooLong ? '...' : ''}\`\`\``;

    switch (reportType) {
      case 'feedback': {
        if (!csWHUrl) throw new Error('DISCORD_CS_WEBHOOK_URL is not set!');
        const whRes = await fetch(csWHUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            embeds: embeds.map((emb) => ({
              ...emb,
              image: { url: imageUrl },
            })),
          }),
        });
        if (!whRes.ok) {
          const msg = await whRes.text().catch(() => '');
          console.error('Discord CS webhook failed', whRes.status, msg);
        }
        break;
      }
      case 'crash': {
        if (!crashWHUrl)
          throw new Error('DISCORD_CRASH_WEBHOOK_URL is not set!');
        const whRes = await fetch(crashWHUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, embeds }),
        });
        if (!whRes.ok) {
          const msg = await whRes.text().catch(() => '');
          console.error('Discord Crash webhook failed', whRes.status, msg);
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    // 握りつぶすと queue ハンドラが ack してメッセージを失うため、再送出して再試行させる
    console.error(err);
    throw err;
  }
};
