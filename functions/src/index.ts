import * as dayjs from 'dayjs';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as rp from 'request-promise';

const app = admin.initializeApp();

type Report = {
  description: string;
  resolved: boolean;
  resolvedReason: string;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
};

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

    await rp(whUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      json: true,
      body: {
        content: `**🙏アプリから新しいフィードバックが届きまさした‼🙏**\n\`\`\`${report.description}\`\`\``,
        embeds: [
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
            ],
          },
        ],
      },
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

    const pngFile = admin
      .storage()
      .bucket()
      .file(`reports/${change.after.id}.png`);
    const urlResp = await pngFile.getSignedUrl({
      action: 'read',
      expires: '03-09-2491',
    });

    await rp(whUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      json: true,
      body: {
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
            ],
          },
        ],
      },
    });
  });

exports.detectInactiveSubscribersOrPublishers = functions.pubsub
  .schedule('every 3 minutes')
  .onRun(async () => {
    const visitorsRef = app.database().ref('/mirroringShare/visitors');
    const visitorsDataSnapshot = await visitorsRef.get();
    visitorsDataSnapshot.forEach((snapshot) =>
      snapshot.forEach((visitorSnapshot) => {
        const visitor = visitorSnapshot.val();
        const diff = visitor.timestamp - new Date().getTime();
        // 1分無通信のビジターをしばく
        const isDisconnected = diff / (60 * 1000) < -1;
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
      // ３分無通信のセッションをしばく
      const isDisconnected = diff / (60 * 1000) < -3;
      if (isDisconnected) {
        snapshot.ref.remove().catch(console.error);
      }
    });

    return null;
  });
