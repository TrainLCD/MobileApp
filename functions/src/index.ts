import * as dayjs from 'dayjs';
import { XMLParser } from 'fast-xml-parser';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import fetch from 'node-fetch';
import { AppStoreReviewFeed, AppStoreReviewsDoc } from './models/appStoreFeed';
import { DiscordEmbed } from './models/common';
import { Report } from './models/feedback';

process.env.TZ = 'Asia/Tokyo';

const app = admin.initializeApp();

const xmlParser = new XMLParser();

exports.notifyReportCreatedToDiscord = functions.firestore
  .document('reports/{docId}')
  .onCreate(async (change) => {
    const whUrl = functions.config().discord_cs.webhook_url;
    const report = change.data() as Report;
    const pngFile = admin.storage().bucket().file(`reports/${change.id}.png`);
    const urlResp = await pngFile.getSignedUrl({
      action: 'read',
      expires: '03-09-2491',
    });

    if (!urlResp.length) {
      throw new Error('Could not fetch screenshot!');
    }

    const embeds: DiscordEmbed[] = report.deviceInfo
      ? [
          {
            image: {
              url: urlResp[0],
            },
            fields: [
              {
                name: 'チケットID',
                value: change.id,
              },
              {
                name: '発行日時',
                value: dayjs(report.createdAt.toDate()).format(
                  'YYYY/MM/DD HH:mm:ss'
                ),
              },
              {
                name: '端末モデル名',
                value: `${report.deviceInfo.brand} ${report.deviceInfo.modelName}(${report.deviceInfo.modelId})`,
              },
              {
                name: '端末のOS',
                value: `${report.deviceInfo.osName} ${report.deviceInfo.osVersion}`,
              },
              {
                name: '端末設定言語',
                value: report.deviceInfo.locale,
              },
              {
                name: 'アプリの設定言語',
                value: report.language,
              },
              {
                name: 'アプリのバージョン',
                value: report.appVersion,
              },
              {
                name: 'レポーターUID',
                value: report.reporterUid,
              },
            ],
          },
        ]
      : [
          {
            image: {
              url: urlResp[0],
            },
            fields: [
              {
                name: 'チケットID',
                value: change.id,
              },
              {
                name: '発行日時',
                value: dayjs(report.createdAt.toDate()).format(
                  'YYYY/MM/DD HH:mm:ss'
                ),
              },
              {
                name: 'アプリの設定言語',
                value: report.language,
              },
              {
                name: 'アプリのバージョン',
                value: report.appVersion,
              },
              {
                name: 'レポーターUID',
                value: report.reporterUid,
              },
            ],
          },
        ];

    await fetch(whUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `**🙏アプリから新しいフィードバックが届きまさした‼🙏**\n\`\`\`${report.description}\`\`\``,
        embeds,
      }),
    });
  });

exports.notifyReportResolvedToDiscord = functions.firestore
  .document('reports/{docId}')
  .onUpdate(async (change) => {
    const whUrl = functions.config().discord_cs.webhook_url;
    const report = change.after.data() as Report;
    if (!report.resolved || !report.resolvedReason) {
      return;
    }

    const resolverModerator = await admin
      .firestore()
      .collection('moderators')
      .doc(report.resolverUid)
      .get();

    const pngFile = admin
      .storage()
      .bucket()
      .file(`reports/${change.after.id}.png`);
    const urlResp = await pngFile.getSignedUrl({
      action: 'read',
      expires: '03-09-2491',
    });

    await fetch(whUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `**🎉フィードバックが解決済みにマークされまさした‼🎉**\n\`\`\`${report.description}\`\`\``,
        embeds: [
          {
            image: {
              url: urlResp[0],
            },
            fields: [
              {
                name: 'チケットID',
                value: change.after.id,
              },
              {
                name: '発行日時',
                value: dayjs(report.createdAt.toDate()).format(
                  'YYYY/MM/DD HH:mm:ss'
                ),
              },
              {
                name: '解決日時',
                value: dayjs(new Date()).format('YYYY/MM/DD HH:mm:ss'),
              },
              {
                name: '解決理由',
                value: report.resolvedReason,
              },
              {
                name: '解決までの日数',
                value: `${dayjs(new Date()).diff(
                  report.createdAt.toDate(),
                  'days'
                )}日`,
              },
              {
                name: 'モデレータ',
                value: resolverModerator.data()?.name,
              },
              {
                name: 'レポーターUID',
                value: report?.reporterUid,
              },
            ],
          },
        ] as DiscordEmbed[],
      }),
    });
  });

exports.detectInactiveSubscribersOrPublishers = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async () => {
    const visitorsRef = app.database().ref('/mirroringShare/visitors');
    const visitorsDataSnapshot = await visitorsRef.get();
    visitorsDataSnapshot.forEach((snapshot) =>
      snapshot.forEach((visitorSnapshot) => {
        const visitor = visitorSnapshot.val();
        const diff = visitor.timestamp - new Date().getTime();
        // 5分無通信のビジターをしばく
        const isDisconnected = diff / (60 * 1000) < -5;
        // 何人いたか知りたいので論理削除する
        if (isDisconnected && !visitor.inactive) {
          visitorSnapshot.ref.update(
            {
              inactive: true,
            },
            console.error
          );
        }
      })
    );

    const sessionsRef = app.database().ref('/mirroringShare/sessions');
    const sessionsSnapshot = await sessionsRef.get();
    sessionsSnapshot.forEach((snapshot) => {
      const session = snapshot.val();
      const diff = session.timestamp - new Date().getTime();
      // 5分無通信のセッションをしばく
      const isDisconnected = diff / (60 * 1000) < -5;
      if (isDisconnected) {
        snapshot.ref.remove().catch(console.error);
      }
    });

    return null;
  });

exports.detectHourlyAppStoreNewReview = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async () => {
    const APP_STORE_ID = '1486355943';
    const RSS_URL = `https://itunes.apple.com/jp/rss/customerreviews/page=1/id=${APP_STORE_ID}/sortBy=mostRecent/xml`;
    const whUrl = functions.config().discord_app_review.webhook_url;

    const appStoreReviewsDocRef = admin
      .firestore()
      .collection('storeReviews')
      .doc('appStore');

    const appStoreReviewsDocData = (
      await appStoreReviewsDocRef.get()
    ).data() as AppStoreReviewsDoc;
    const notifiedFeeds = appStoreReviewsDocData.notifiedEntryFeeds;

    const res = await fetch(RSS_URL);
    const text = await res.text();
    const obj = xmlParser.parse(text) as AppStoreReviewFeed;
    const rssEntries = obj.feed.entry;
    const filteredEntries = rssEntries.filter(
      (ent) =>
        notifiedFeeds.findIndex((f) => f.id === ent.id) === -1 ||
        notifiedFeeds.findIndex((f) => f.updated === ent.updated) === -1
    );

    const reviewsBodyArray = filteredEntries.map((ent) => {
      const oldEntry = rssEntries.find(
        (e) => e.id === ent.id && e.updated !== ent.updated
      );
      const heading = !!oldEntry
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

    reviewsBodyArray.forEach(async (r) => {
      const body = JSON.stringify(r);
      await fetch(whUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
    });

    await appStoreReviewsDocRef.update({
      notifiedEntryFeeds: rssEntries,
    });

    return null;
  });
