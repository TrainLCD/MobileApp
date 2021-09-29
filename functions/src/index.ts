import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as rp from 'request-promise';
import * as moment from 'moment';

admin.initializeApp();

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
    const imgUrl = await pngFile.getSignedUrl({
      action: 'read',
      expires: '03-09-2491',
    });

    await rp(whUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      json: true,
      body: {
        content: `**🙏アプリから新しいバグ報告が届きまさした‼🙏**\n\`\`\`${report.description}\`\`\``,
        embeds: [
          {
            image: {
              url: imgUrl[0],
            },
            fields: [
              {
                name: 'チケットID',
                value: change.id,
              },
              {
                name: '発行日時',
                value: moment(report.createdAt.toDate()).format(
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
    const imgUrl = await pngFile.getSignedUrl({
      action: 'read',
      expires: '03-09-2491',
    });

    await rp(whUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      json: true,
      body: {
        content: `**🎉バグが解決済みにマークされまさした‼🎉**\n\`\`\`${report.description}\`\`\``,
        embeds: [
          {
            image: {
              url: imgUrl[0],
            },
            fields: [
              {
                name: 'チケットID',
                value: change.after.id,
              },
              {
                name: '発行日時',
                value: moment(report.createdAt.toDate()).format(
                  'YYYY/MM/DD HH:mm:ss'
                ),
              },
              {
                name: '解決日時',
                value: moment(new Date()).format('YYYY/MM/DD HH:mm:ss'),
              },
              {
                name: '解決理由',
                value: report.resolvedReason,
              },
              {
                name: '解決までの日数',
                value: `${moment(new Date()).diff(
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
