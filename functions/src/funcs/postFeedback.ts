import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as dayjs from 'dayjs';
import { SPAM_USER_IDS } from '../constants/spam';
import type { DiscordEmbed } from '../models/common';
import type { Report } from '../models/feedback';
import { VertexAI } from '@google-cloud/vertexai';
import { Storage } from '@google-cloud/storage';

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
  UNKNONW_TYPE: '❓ Unknown Type',
  AUTOMODE_V1: '🤖 Auto Mode 1.0',
  AUTOMODE_V2: '🤖 Auto Mode 2.0',
} as const;

// ---- Few-shot loader ----
const FEW_SHOT_URI = process.env.FEW_SHOT_GCS_URI; // e.g. gs://trainlcd-triage-data/fewshot.jsonl
const FEW_SHOT_MAX_BYTES = Number(process.env.FEW_SHOT_MAX_BYTES ?? 512 * 1024); // 512KB default
const FEW_SHOT_LIMIT = Number(process.env.FEW_SHOT_LIMIT ?? 12); // cap number of examples concatenated
const storage = new Storage();
let fewShotCache: { text: string; loadedAt: number } | null = null;
const FEW_SHOT_TTL_MS = Number(process.env.FEW_SHOT_TTL_MS ?? 10 * 60 * 1000); // 10 min

type FewShotItem = {
  input: string;
  output: string;
  disabled?: boolean;
  weight?: number;
};

async function loadFewShotFromGCS(): Promise<string | null> {
  if (!FEW_SHOT_URI) return null;
  const m = FEW_SHOT_URI.match(/^gs:\/\/([^/]+)\/(.+)$/);
  if (!m) return null;
  const [, bucket, file] = m;
  const buf = await storage
    .bucket(bucket)
    .file(file)
    .download({ start: 0, end: FEW_SHOT_MAX_BYTES - 1 });
  const raw = buf[0].toString('utf8');
  // Support JSONL, lines like: {"input":"...","output":"..."}
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const items: FewShotItem[] = [];
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (obj?.input && obj?.output && !obj.disabled)
        items.push(obj as FewShotItem);
    } catch {
      // ignore non-JSON lines (allow comments or headers)
    }
  }
  // Weighted shuffle (simple): sort by random/weight
  const shuffled = items
    .map((it) => ({
      it,
      r: Math.random() / (it.weight && it.weight > 0 ? it.weight : 1),
    }))
    .sort((a, b) => a.r - b.r)
    .slice(0, FEW_SHOT_LIMIT)
    .map(({ it }) => it);

  // Build few-shot block with per-example truncation to control prompt size
  const blocks = shuffled.map((it) => {
    const block = `Input:\n${String(it.input)}\nOutput:\n${String(it.output)}`;
    return block.length > FEW_SHOT_PER_EX_MAX
      ? block.slice(0, FEW_SHOT_PER_EX_MAX - 1) + '…'
      : block;
  });
  return blocks.join('\n\n');
}

// Few-shot compaction controls
const FEW_SHOT_PER_EX_MAX = Number(process.env.FEW_SHOT_PER_EX_MAX ?? 800); // chars per example (Input+Output assembled)

async function getFewShotText(): Promise<string> {
  const now = Date.now();
  if (fewShotCache && now - fewShotCache.loadedAt < FEW_SHOT_TTL_MS) {
    return fewShotCache.text;
  }
  const gcs = await loadFewShotFromGCS();
  if (!gcs) {
    // フェイルハード：few-shot未設定での誤学習や漏洩を防ぐ
    throw new Error('FEW_SHOT_NOT_AVAILABLE');
  }
  fewShotCache = { text: gcs, loadedAt: now };
  return gcs;
}

const SYSTEM_PROMPT = `
You are a precise issue triager for TrainLCD.
Task: 
1. Summarize the user's message into a ONE-LINE issue title in Japanese (≤72 chars).
2. Also create a 1–3 sentence summary in Japanese that concisely describes the feedback content.
3. Classify spam.

Rules:
- Newspaper-style headline: [症状/論点]+[対象]（助詞は最小限）
- No device/OS/version/URL/stack unless essential
- Prefer Japanese if input has Japanese
- If no actionable content (announcement transcript, chit-chat, praise-only), mark spam
- If not spam, pick labels from:
  ["bug","improvement","feature","localization","location","ui","performance","network","settings"]

Output JSON only:
{"title": "...", "summary": "...", "is_spam": true|false, "labels": [], "confidence": 0..1, "reason": "..."}

Return ONLY that JSON. No prose, no markdown.
`.trim();

/**
 * Detects "non-actionable" messages that read like public transport announcements or
 * generic informational text, without explicit request or problem.
 * This avoids sensitive wording and is safe for OSS.
 */
function looksLikeSpam(text: string) {
  if (!text) return false;
  const t = String(text).replace(/\s+/g, ' ').trim();

  // If the message contains clear action/problem words, treat as actionable.
  const ACTIONABLE =
    /(修正|改善|追加|希望|要望|不具合|バグ|誤|間違い|表示|保存|再生|遅|遅延|できない|出来ない|エラー|落ちる|クラッシュ|重複|ズレ|音がない|読み上げない)/;
  if (ACTIONABLE.test(t)) return false;

  let score = 0;

  // Typical announcement-style phrases (JA)
  if (
    /(次は|まもなく|この(列車|電車)は|行きです|ご利用ありがとうございます|お出口は(左|右)側です|各駅に(停ま|止ま)ります|お乗り換え)/.test(
      t
    )
  ) {
    score += 1;
  }

  // Station list / direction hints
  if (/(停車駅|方面)/.test(t)) score += 1;

  // Multiple station-like tokens separated by punctuation/bullets/commas
  if (
    /([一-龥ァ-ヶー]{2,})(、|,|・|\s)([一-龥ァ-ヶー]{2,})/.test(t) &&
    /(停車|次は|方面)/.test(t)
  ) {
    score += 1;
  }

  // English announcement phrases
  if (
    /(Next stop|This (train|service) (is|goes) to|Please change at)/i.test(t)
  ) {
    score += 1;
  }

  // Long run without sentence-ending punctuation but with announcement tokens
  if (
    t.length >= 40 &&
    !/[。．\.!?！？]/.test(t) &&
    /(次は|まもなく|行きです)/.test(t)
  ) {
    score += 0.5;
  }

  // Emoji/symbol hint (soft)
  if (/[🚃🚇🚈♪🎵]/u.test(t)) {
    score += 0.5;
  }

  // Consider non-actionable if score passes threshold
  return score >= 2;
}

// ---- MAX_TOKENS-aware runner ----
async function generateWithRetry(
  vertexAi: VertexAI,
  baseModel: string,
  location: string,
  fewshot: string,
  systemPrompt: string,
  userText: string
) {
  const run = async (few: string, maxTokens: number, note: string) => {
    const model = vertexAi.getGenerativeModel({
      model: baseModel,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: maxTokens,
        responseMimeType: 'application/json',
      },
      // Use systemInstruction to shrink user prompt size a bit
      systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
    });
    const prompt = `${few}\n\nNow process this message:\n\n<<FEEDBACK>>\n${userText}\n\n<!-- ${note} -->`;
    const res = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    const finish = res?.response?.candidates?.[0]?.finishReason;
    return { res, finish };
  };

  // 1st try: current few-shot as-is
  let { res, finish } = await run(fewshot, 512, 'first');
  if (finish !== 'MAX_TOKENS') return res;

  // 2nd: halve few-shot blocks + stronger instruction for 1-sentence summary
  const blocks = fewshot.split(/\n\n(?=Input:)/);
  const half = blocks.slice(0, Math.max(1, Math.ceil(blocks.length / 2)));
  const compactFew = half
    .map((b) => (b.length > FEW_SHOT_PER_EX_MAX ? b.slice(0, FEW_SHOT_PER_EX_MAX - 1) + '…' : b))
    .join('\n\n');
  ({ res, finish } = await run(compactFew, 768, 'retry-compact'));
  if (finish !== 'MAX_TOKENS') return res;

  // 3rd: minimal hint few-shot（最初の1例のみ）+ 最大トークン
  const minimal = blocks.slice(0, 1).join('\n\n');
  ({ res } = await run(minimal, 1024, 'final-minimal'));
  return res;
}

// ---- AI report types & helpers ----
export type AIReport = {
  title: string;
  summary: string;
  is_spam: boolean;
  labels: string[];
  confidence: number;
  reason: string;
};

function extractTextFromVertex(result: any): string {
  // Vertex返却の差分に強い安全抽出
  const parts =
    result?.response?.candidates?.flatMap(
      (c: any) => c?.content?.parts ?? []
    ) ?? [];
  const txt = parts.find((p: any) => typeof p?.text === 'string')?.text;
  return typeof txt === 'string' ? txt : '{}';
}

function coerceReport(raw: any, titleMax = 72): AIReport {
  const norm = (k: string) =>
    String(k).toLowerCase().replace(/\s+/g, '').trim();
  const map = new Map<string, any>();
  for (const [k, v] of Object.entries(raw || {})) map.set(norm(k), v);

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
  const is_spam = getBool('is_spam', 'isspam');
  const labels = Array.isArray(map.get('labels')) ? map.get('labels') : [];
  const confidence = getNum('confidence', 0.5);
  const reason = getStr('reason');

  if (!title) title = '要約未取得';
  if (title.length > titleMax) title = title.slice(0, titleMax - 1) + '…';
  if (!summary) summary = '';

  return { title, summary, is_spam, labels, confidence, reason };
}

/**
 * モデル実行→JSONパース→正規化→スパム/長さガードまで一発で返す。
 * @param model VertexAI.getGenerativeModel(...) の戻り
 * @param prompt 組み立て済みプロンプト（Output JSON only ... を含む）
 * @param originalText ユーザーのフィードバック本文（spamガード用）
 */
export async function makeAIReport(
  model: any,
  prompt: string,
  originalText: string,
  opts?: { titleMax?: number }
): Promise<AIReport> {
  const titleMax = opts?.titleMax ?? 72;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });

  // 1) 生テキスト抽出
  const text = extractTextFromVertex(result);

  // 2) JSONパース（混入対策：最初の {..} ブロックを拾う）
  let raw: any = {};
  try {
    const m = text.match(/\{[\s\S]*\}/);
    raw = JSON.parse(m ? m[0] : text);
  } catch {
    raw = {};
  }

  // 3) 正規化
  let report = coerceReport(raw, titleMax);

  // 4) 追加ガード（定型句っぽい→Spam上書き）
  if (!report.is_spam && looksLikeSpam(originalText)) {
    report = {
      title: '内容未分類（改善要望なし）',
      summary: '',
      is_spam: true,
      labels: [],
      confidence: Math.max(0.8, report.confidence),
      reason: 'non-actionable',
    };
  }

  return report;
}

export const postFeedback = onCall(
  { region: 'asia-northeast1' },
  async (req) => {
    // NOTE: Do not log raw user 'description' to avoid data leakage.
    if (!req.auth) {
      throw new HttpsError(
        'failed-precondition',
        'The function must be called while authenticated.'
      );
    }

    const report = req.data.report as Report;

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
      enableLegacyAutoMode,
      sentryEventId,
    } = report;
    const isSpamUser = SPAM_USER_IDS.includes(reporterUid);

    if (!process.env.OCTOKIT_PAT) {
      console.error('process.env.OCTOKIT_PAT is not found!');
      return;
    }

    const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;
    if (!projectId) {
      throw new Error('GCP_PROJECT or GCLOUD_PROJECT is not set!');
    }

    const vertexAi = new VertexAI({
      project: projectId,
      location: 'asia-northeast1',
    });

    const baseModel = (process.env.GEMINI_MODEL ?? 'gemini-2.5-flash');
    const FEW_SHOT = await getFewShotText();
    const vertexRes = await generateWithRetry(
      vertexAi,
      baseModel,
      'asia-northeast1',
      FEW_SHOT,
      SYSTEM_PROMPT,
      description
    );
    // Extract → parse → normalize
    const text = extractTextFromVertex(vertexRes as any);
    const raw = (() => {
      try {
        const m = text.match(/\{[\s\S]*\}/);
        return JSON.parse(m ? m[0] : text);
      } catch {
        return {};
      }
    })();
    let aiReport = coerceReport(raw, 72);
    if (!aiReport.is_spam && looksLikeSpam(description)) {
      aiReport = {
        title: '内容未分類（改善要望なし）',
        summary: '',
        is_spam: true,
        labels: [],
        confidence: Math.max(0.8, aiReport.confidence),
        reason: 'non-actionable',
      };
    }

    const createdAtText = dayjs(createdAt).format('YYYY/MM/DD HH:mm:ss');
    const osNameLabel = (() => {
      if (deviceInfo?.osName === 'iOS') {
        return GITHUB_LABELS.PLATFORM_IOS;
      }
      if (deviceInfo?.osName === 'iPadOS') {
        return GITHUB_LABELS.PLATFORM_IPADOS;
      }
      if (deviceInfo?.osName === 'Android') {
        return GITHUB_LABELS.PLATFORM_ANDROID;
      }
      return GITHUB_LABELS.PLATFORM_OTHER_OS;
    })();

    const autoModeLabel = (() => {
      if (autoModeEnabled && !enableLegacyAutoMode) {
        return GITHUB_LABELS.AUTOMODE_V2;
      }
      if (autoModeEnabled && enableLegacyAutoMode) {
        return GITHUB_LABELS.AUTOMODE_V1;
      }
      return undefined;
    })();

    try {
      const res = await fetch(
        'https://api.github.com/repos/TrainLCD/Issues/issues',
        {
          method: 'post',
          headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${process.env.OCTOKIT_PAT ?? ''}`,
            'X-GitHub-Api-Version': '2022-11-28',
          },
          body: JSON.stringify({
            title: aiReport.title ?? '要約未取得',
            body: `
![Image](${imageUrl})


${'```'}
${description}
${'```'}

## Geminiによる要約
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
${autoModeEnabled ? `有効(${enableLegacyAutoMode ? '1.0' : '2.0'})` : '無効'}

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
                !aiReport.is_spam &&
                GITHUB_LABELS.FEEDBACK_TYPE,
              reportType === 'crash' && GITHUB_LABELS.CRASH_TYPE,
              appEdition === 'production' && GITHUB_LABELS.PRODUCTION_APP,
              appEdition === 'canary' && GITHUB_LABELS.CANARY_APP,
              appClip && GITHUB_LABELS.PLATFORM_APPCLIP,
              (isSpamUser || aiReport.is_spam) && GITHUB_LABELS.SPAM_TYPE,
              osNameLabel,
              autoModeLabel,
            ].filter(Boolean),
            headers: {
              'X-GitHub-Api-Version': '2022-11-28',
            },
          }),
        }
      );

      if (res.status !== 201) {
        console.error(await res.json());
        return;
      }

      const issuesRes = (await res.json()) as { html_url: string };

      const csWHUrl = process.env.DISCORD_CS_WEBHOOK_URL;
      const spamCSWHUrl = process.env.DISCORD_SPAM_CS_WEBHOOK_URL;
      const crashWHUrl = process.env.DISCORD_CRASH_WEBHOOK_URL;
      const embeds: DiscordEmbed[] = deviceInfo
        ? [
            {
              fields: [
                {
                  name: 'チケットID',
                  value: id,
                },
                {
                  name: '発行日時',
                  value: dayjs(createdAt).format('YYYY/MM/DD HH:mm:ss'),
                },
                {
                  name: 'Geminiによる要約',
                  value: aiReport.summary,
                },
                {
                  name: '端末モデル名',
                  value: `${deviceInfo.brand} ${deviceInfo.modelName}(${deviceInfo.modelId})`,
                },
                {
                  name: '端末のOS',
                  value: `${deviceInfo.osName} ${deviceInfo.osVersion}`,
                },
                {
                  name: '端末設定言語',
                  value: deviceInfo.locale,
                },
                {
                  name: 'アプリの設定言語',
                  value: language,
                },
                {
                  name: 'アプリのバージョン',
                  value: appVersion,
                },
                {
                  name: 'レポーターUID',
                  value: reporterUid,
                },
                {
                  name: 'オートモード',
                  value:
                    autoModeLabel ??
                    (autoModeEnabled === false ? '無効' : '不明'),
                },
                {
                  name: 'GitHub Issue',
                  value: issuesRes.html_url,
                },
                {
                  name: 'Sentry Event ID',
                  value: sentryEventId ?? '不明',
                },
              ],
            },
          ]
        : [
            {
              fields: [
                {
                  name: 'チケットID',
                  value: id,
                },
                {
                  name: '発行日時',
                  value: dayjs(createdAt).format('YYYY/MM/DD HH:mm:ss'),
                },
                {
                  name: 'Geminiによる要約',
                  value: aiReport.summary,
                },
                {
                  name: 'アプリの設定言語',
                  value: language,
                },
                {
                  name: 'アプリのバージョン',
                  value: appVersion,
                },
                {
                  name: 'レポーターUID',
                  value: reporterUid,
                },
                {
                  name: 'オートモード',
                  value:
                    autoModeLabel ??
                    (autoModeEnabled === false ? '無効' : '不明'),
                },
                {
                  name: 'GitHub Issue',
                  value: issuesRes.html_url,
                },
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
          const whUrl = isSpamUser ? spamCSWHUrl : csWHUrl;

          if (!whUrl) {
            throw new Error(
              `${isSpamUser ? 'process.env.DISCORD_SPAM_CS_WEBHOOK_URL' : 'process.env.DISCORD_CS_WEBHOOK_URL'} is not set!`
            );
          }

          await fetch(whUrl, {
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
          break;
        }
        case 'crash': {
          if (!crashWHUrl) {
            throw new Error(
              'process.env.DISCORD_CRASH_WEBHOOK_URL is not set!'
            );
          }
          await fetch(crashWHUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content,
              embeds,
            }),
          });
          break;
        }
        default:
          break;
      }
    } catch (err) {
      console.error(err);
    }
  }
);
