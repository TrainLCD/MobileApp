import { PubSub } from '@google-cloud/pubsub';
import * as dayjs from 'dayjs';
import { XMLParser } from 'fast-xml-parser';
import * as admin from 'firebase-admin';
import { initializeApp } from 'firebase-admin/app';
import { Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { createHash } from 'node:crypto';
import type {
  AppStoreReviewFeed,
  AppStoreReviewsDoc,
} from './models/appStoreFeed';
import type { DiscordEmbed } from './models/common';
import type { Report } from './models/feedback';
import { normalizeRomanText } from './utils/normalize';

process.env.TZ = 'Asia/Tokyo';

initializeApp();

const firestore = admin.firestore();
const storage = admin.storage();
const pubsub = new PubSub();

const xmlParser = new XMLParser();

exports.detectHourlyAppStoreNewReview = onSchedule(
  'every 1 hours',
  async () => {
    const APP_STORE_ID = '1486355943';
    const RSS_URL = `https://itunes.apple.com/jp/rss/customerreviews/page=1/id=${APP_STORE_ID}/sortBy=mostRecent/xml`;
    const whUrl = process.env.DISCORD_APP_REVIEW_WEBHOOK_URL;
    if (!whUrl) {
      throw new Error('process.env.DISCORD_APP_REVIEW_WEBHOOK_URL is not set!');
    }

    const appStoreReviewsDocRef = firestore
      .collection('storeReviews')
      .doc('appStore');

    const appStoreReviewsDocData = (await appStoreReviewsDocRef.get()).data() as
      | AppStoreReviewsDoc
      | undefined;

    if (!appStoreReviewsDocData?.notifiedEntryFeeds) {
      await appStoreReviewsDocRef.set({
        notifiedEntryFeeds: [],
      });
    }

    const notifiedFeeds = appStoreReviewsDocData?.notifiedEntryFeeds ?? [];

    const res = await fetch(RSS_URL);
    const text = await res.text();
    const obj = xmlParser.parse(text) as AppStoreReviewFeed;
    const rssEntries = obj.feed.entry;
    const filteredEntries = rssEntries.filter(
      (ent) =>
        notifiedFeeds.findIndex((f) => f.id === ent.id) === -1 &&
        notifiedFeeds.findIndex(
          (f) => !dayjs(f.updatedAt.toDate()).isSame(dayjs(ent.updated))
        )
    );

    const reviewsBodyArray = filteredEntries.map((ent) => {
      const oldEntry = rssEntries.find(
        (e) => e.id === ent.id && e.updated !== ent.updated
      );
      const heading = oldEntry
        ? '**🙏App Storeに投稿されたレヴューが更新されまさした‼🙏**'
        : '**🙏App Storeに新しいレヴューが届きまさした‼🙏**';
      const content = `${heading}\n\n**${ent.title}**\n\`\`\`${ent.content[0]}\`\`\``;
      const embeds: DiscordEmbed[] = [
        {
          fields: [
            {
              name: '評価',
              value: new Array(5)
                .fill('')
                .map((_, i) => (i < ent['im:rating'] ? '★' : '☆'))
                .join(''),
            },
            {
              name: 'バージョン',
              value: ent['im:version'],
            },
            {
              name: '投稿者',
              value: ent.author.name,
            },
            {
              name: '最終更新',
              value: dayjs(ent.updated).format('YYYY/MM/DD'),
            },
            {
              name: 'レビューID',
              value: ent.id.toString(),
            },
          ],
        },
      ];

      return { content, embeds };
    });

    for (const r of reviewsBodyArray) {
      const body = JSON.stringify(r);
      await fetch(whUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
    }

    await appStoreReviewsDocRef.update({
      notifiedEntryFeeds: [
        ...notifiedFeeds,
        ...rssEntries.map((feed) => ({
          id: feed.id,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        })),
      ],
    });
  }
);

exports.tts = onCall({ region: 'asia-northeast1' }, async (req) => {
  if (!req.auth) {
    throw new HttpsError(
      'failed-precondition',
      'The function must be called while authenticated.'
    );
  }

  const ssmlJa: string | undefined = req.data.ssmlJa;
  if (!(typeof ssmlJa === 'string') || ssmlJa.length === 0) {
    throw new HttpsError(
      'invalid-argument',
      `The function must be called with one arguments "ssmlJa" containing the message ssmlJa to add.`
    );
  }

  const ssmlEn: string | undefined = normalizeRomanText(req.data.ssmlEn)
    // Airport Terminal 1･2等
    .replaceAll('･', ' ')
    // Otsuka・Teikyo-Daigakuなど
    .replaceAll('・', ' ')
    // 全角記号
    .replaceAll(/[！-／：-＠［-｀｛-～、-〜”’・]+/g, ' ')
    // Meiji-jingumae `Harajuku`
    .replaceAll('`', '')
    // 一丁目で終わる駅
    .replaceAll(
      '-itchome',
      `<phoneme alphabet="ipa" ph="itt͡ɕoːme">いっちょうめ</phoneme>`
    )
    // 新宿三丁目など
    .replaceAll(
      '-sanchome',
      ' <phoneme alphabet="ipa" ph="sant͡ɕoːme">さんちょうめ</phoneme>'
    )
    // 宇部
    .replaceAll('Ube', '<phoneme alphabet="ipa" ph="ɯbe">うべ</phoneme>')
    // 伊勢崎
    .replaceAll(
      'Isesaki',
      '<phoneme alphabet="ipa" ph="isesakʲi">いせさき</phoneme>'
    )
    // 目白
    .replaceAll(
      'Mejiro',
      '<phoneme alphabet="ipa" ph="meʤiɾo">めじろ</phoneme>'
    )
    // カイセイ対策
    .replaceAll(
      'Keisei',
      '<phoneme alphabet="ipa" ph="keisei">けいせい</phoneme>'
    )
    // 押上
    .replaceAll(
      'Oshiage',
      `<phoneme alphabet="ipa" ph="'oɕiaɡe">おしあげ</phoneme>`
    )
    // 名鉄
    .replaceAll(
      'Meitetsu',
      '<phoneme alphabet="ipa" ph="meitetsɯ">めいてつ</phoneme>'
    )
    // 西武
    .replaceAll('Seibu', '<phoneme alphabet="ipa" ph="seibɯ">せいぶ</phoneme>')
    // 日本語はjoを「ホ」と読まない
    .replaceAll(/jo/gi, '<phoneme alphabet="ipa" ph="ʤo">じょ</phoneme>');

  console.log(req.data.ssmlEn, '->', ssmlEn);

  if (typeof ssmlEn !== 'string' || ssmlEn.length === 0) {
    throw new HttpsError(
      'invalid-argument',
      `The function must be called with one arguments "ssmlEn" containing the message ssmlEn to add.`
    );
  }

  const jaVoiceName = 'ja-JP-Standard-B';
  const enVoiceName = 'en-US-Standard-G';

  const voicesCollection = firestore
    .collection('caches')
    .doc('tts')
    .collection('voices');

  const hashAlgorithm = 'md5';
  const hashData = ssmlJa + ssmlEn + jaVoiceName + enVoiceName;
  const id = createHash(hashAlgorithm).update(hashData).digest('hex');

  const snapshot = await voicesCollection.where('id', '==', id).get();

  if (!snapshot.empty) {
    const jaAudioData =
      (await storage
        .bucket()
        .file(snapshot.docs[0]?.data().pathJa)
        .download()) || null;
    const enAudioData =
      (await storage
        .bucket()
        .file(snapshot.docs[0]?.data().pathEn)
        .download()) || null;

    const jaAudioContent = jaAudioData?.[0]?.toString('base64') || null;
    const enAudioContent = enAudioData?.[0]?.toString('base64') || null;

    return { id, jaAudioContent, enAudioContent };
  }

  const ttsUrl = `https://texttospeech.googleapis.com/v1beta1/text:synthesize?key=${process.env.GOOGLE_TTS_API_KEY}`;

  const reqBodyJa = {
    input: {
      ssml: ssmlJa,
    },
    voice: {
      languageCode: 'ja-JP',
      name: jaVoiceName,
    },
    audioConfig: {
      audioEncoding: 'MP3',
    },
  };

  const reqBodyEn = {
    input: {
      ssml: ssmlEn,
    },
    voice: {
      languageCode: 'en-US',
      name: enVoiceName,
    },
    audioConfig: {
      audioEncoding: 'MP3',
    },
  };

  const [jaRes, enRes] = await Promise.all([
    fetch(ttsUrl, {
      headers: {
        'content-type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify(reqBodyJa),
      method: 'POST',
    }),
    fetch(ttsUrl, {
      headers: {
        'content-type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify(reqBodyEn),
      method: 'POST',
    }),
  ]);

  const [{ audioContent: jaAudioContent }, { audioContent: enAudioContent }] =
    await Promise.all([jaRes.json(), enRes.json()]);

  const cacheTopic = pubsub.topic('tts-cache');
  cacheTopic.publishMessage({
    json: {
      id,
      jaAudioContent,
      enAudioContent,
      ssmlJa,
      ssmlEn,
      voiceJa: jaVoiceName,
      voiceEn: enVoiceName,
    },
  });

  return { id, jaAudioContent, enAudioContent };
});

exports.ttsCachePubSub = onMessagePublished('tts-cache', async (event) => {
  const {
    id,
    jaAudioContent,
    enAudioContent,
    ssmlJa,
    ssmlEn,
    voiceJa,
    voiceEn,
  } = event.data.message.json;
  const jaTtsCachePathBase = 'caches/tts/ja';
  const jaTtsBuf = Buffer.from(jaAudioContent, 'base64');
  const jaTtsCachePath = `${jaTtsCachePathBase}/${id}.mp3`;

  const enTtsCachePathBase = 'caches/tts/en';
  const enTtsBuf = Buffer.from(enAudioContent, 'base64');
  const enTtsCachePath = `${enTtsCachePathBase}/${id}.mp3`;

  await storage.bucket().file(jaTtsCachePath).save(jaTtsBuf);
  await storage.bucket().file(enTtsCachePath).save(enTtsBuf);
  await firestore
    .collection('caches')
    .doc('tts')
    .collection('voices')
    .doc(id)
    .set({
      id,
      ssmlJa,
      pathJa: jaTtsCachePath,
      voiceJa,
      ssmlEn,
      pathEn: enTtsCachePath,
      voiceEn,
      createdAt: Timestamp.now(),
    });
});

exports.postFeedback = onCall({ region: 'asia-northeast1' }, async (req) => {
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
  } = report;

  if (!process.env.OCTOKIT_PAT) {
    console.error('process.env.OCTOKIT_PAT is not found!');
    return;
  }

  const createdAtText = dayjs(createdAt).format('YYYY/MM/DD HH:mm:ss');
  const osNameLabel = (() => {
    if (deviceInfo?.osName === 'iOS') {
      return '🍎 iOS';
    }
    if (deviceInfo?.osName === 'Android') {
      return '🤖 Android';
    }
    return '❓ Other OS';
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

## レポーターUID
${reporterUid}
        `.trim(),
          assignees: ['TinyKitten'],
          milestone: null,
          labels: [
            '🙏 Feedback',
            osNameLabel,
            appEdition === 'production' ? '🌏 Production' : '🐥 Canary',
          ],
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
                name: 'GitHub Issue',
                value: issuesRes.html_url,
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
        if (!csWHUrl) {
          throw new Error('process.env.DISCORD_CS_WEBHOOK_URL is not set!');
        }

        await fetch(csWHUrl, {
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
          throw new Error('process.env.DISCORD_CRASH_WEBHOOK_URL is not set!');
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
});
