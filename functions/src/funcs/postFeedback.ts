import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as dayjs from 'dayjs';
import { SPAM_USER_IDS } from '../constants/spam';
import type { DiscordEmbed } from '../models/common';
import type { Report } from '../models/feedback';

export const postFeedback = onCall(
  { region: 'asia-northeast1' },
  async (req) => {
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

    const createdAtText = dayjs(createdAt).format('YYYY/MM/DD HH:mm:ss');
    const osNameLabel = (() => {
      if (deviceInfo?.osName === 'iOS') {
        return '🍎 iOS';
      }
      if (deviceInfo?.osName === 'iPadOS') {
        return '🍎 iPadOS';
      }
      if (deviceInfo?.osName === 'Android') {
        return '🤖 Android';
      }
      return '❓ Other OS';
    })();

    const autoModeLabel = (() => {
      if (autoModeEnabled && !enableLegacyAutoMode) {
        return '🤖 Auto Mode 2.0';
      }
      if (autoModeEnabled && enableLegacyAutoMode) {
        return '🤖 Auto Mode 1.0';
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
            title: createdAtText,
            body: `
![Image](${imageUrl})


${'```'}
${description}
${'```'}

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
              reportType === 'feedback' && '🙏 Feedback',
              reportType === 'crash' && '💣 Crash',
              appEdition === 'production' && '🌏 Production',
              appEdition === 'canary' && '🐥 Canary',
              appClip && '📎 App Clip',
              isSpamUser && '💩 Spam',
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
