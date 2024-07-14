import { PubSub } from "@google-cloud/pubsub";
import { createHash } from "crypto";
import * as dayjs from "dayjs";
import { XMLParser } from "fast-xml-parser";
import * as admin from "firebase-admin";
import { initializeApp } from "firebase-admin/app";
import { Timestamp } from "firebase-admin/firestore";
import * as functions from "firebase-functions";
import { HttpsError } from "firebase-functions/v1/auth";
import { AppStoreReviewFeed, AppStoreReviewsDoc } from "./models/appStoreFeed";
import { DiscordEmbed } from "./models/common";
import { Report } from "./models/feedback";

process.env.TZ = "Asia/Tokyo";

initializeApp();

const firestore = admin.firestore();
const storage = admin.storage();
const pubsub = new PubSub();

const xmlParser = new XMLParser();

exports.notifyReportCreatedToDiscord = functions.firestore
  .document("reports/{docId}")
  .onCreate(async (change) => {
    const csWHUrl = process.env.DISCORD_CS_WEBHOOK_URL;
    const crashWHUrl = process.env.DISCORD_CRASH_WEBHOOK_URL;
    const {
      createdAt,
      description,
      deviceInfo,
      language,
      appVersion,
      reporterUid,
      stacktrace,
      reportType,
    } = change.data() as Report;
    const embeds: DiscordEmbed[] = deviceInfo
      ? [
          {
            fields: [
              {
                name: "チケットID",
                value: change.id,
              },
              {
                name: "発行日時",
                value: dayjs(createdAt.toDate()).format("YYYY/MM/DD HH:mm:ss"),
              },
              {
                name: "端末モデル名",
                value: `${deviceInfo.brand} ${deviceInfo.modelName}(${deviceInfo.modelId})`,
              },
              {
                name: "端末のOS",
                value: `${deviceInfo.osName} ${deviceInfo.osVersion}`,
              },
              {
                name: "端末設定言語",
                value: deviceInfo.locale,
              },
              {
                name: "アプリの設定言語",
                value: language,
              },
              {
                name: "アプリのバージョン",
                value: appVersion,
              },
              {
                name: "レポーターUID",
                value: reporterUid,
              },
            ],
          },
        ]
      : [
          {
            fields: [
              {
                name: "チケットID",
                value: change.id,
              },
              {
                name: "発行日時",
                value: dayjs(createdAt.toDate()).format("YYYY/MM/DD HH:mm:ss"),
              },
              {
                name: "アプリの設定言語",
                value: language,
              },
              {
                name: "アプリのバージョン",
                value: appVersion,
              },
              {
                name: "レポーターUID",
                value: reporterUid,
              },
            ],
          },
        ];

    const stacktraceTooLong = (stacktrace?.split("\n").length ?? 0) > 10;

    const content =
      reportType === "feedback"
        ? `**🙏アプリから新しいフィードバックが届きまさした‼🙏**\n\`\`\`${description}\`\`\``
        : `**😭アプリからクラッシュレポートが届きまさした‼😭**\n**${description}**\n\`\`\`${stacktrace
            ?.split("\n")
            .slice(0, 10)
            .join("\n")}\n${stacktraceTooLong ? "..." : ""}\`\`\``;

    switch (reportType) {
      case "feedback": {
        if (!csWHUrl) {
          throw new Error("process.env.DISCORD_CS_WEBHOOK_URL is not set!");
        }

        const pngFile = storage.bucket().file(`reports/${change.id}.png`);
        const urlResp = await pngFile.getSignedUrl({
          action: "read",
          expires: "03-09-2491",
        });

        if (!urlResp.length) {
          throw new Error("Could not fetch screenshot!");
        }

        await fetch(csWHUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            embeds: embeds.map((emb, idx) => ({
              ...emb,
              image: { url: urlResp[idx] },
            })),
          }),
        });
        break;
      }
      case "crash": {
        if (!crashWHUrl) {
          throw new Error("process.env.DISCORD_CRASH_WEBHOOK_URL is not set!");
        }
        await fetch(crashWHUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
  });

exports.notifyReportResolvedToDiscord = functions.firestore
  .document("reports/{docId}")
  .onUpdate(async (change) => {
    const whUrl = process.env.DISCORD_CS_WEBHOOK_URL;
    if (!whUrl) {
      throw new Error("process.env.DISCORD_CS_WEBHOOK_URL is not set!");
    }

    const report = change.after.data() as Report;
    if (!report.resolved || !report.resolvedReason) {
      return;
    }

    const resolverModerator = await firestore
      .collection("moderators")
      .doc(report.resolverUid)
      .get();

    const pngFile = storage.bucket().file(`reports/${change.after.id}.png`);
    const urlResp = await pngFile.getSignedUrl({
      action: "read",
      expires: "03-09-2491",
    });

    await fetch(whUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `**🎉フィードバックが解決済みにマークされまさした‼🎉**\n\`\`\`${report.description}\`\`\``,
        embeds: [
          {
            image: {
              url: urlResp[0],
            },
            fields: [
              {
                name: "チケットID",
                value: change.after.id,
              },
              {
                name: "発行日時",
                value: dayjs(report.createdAt.toDate()).format(
                  "YYYY/MM/DD HH:mm:ss",
                ),
              },
              {
                name: "解決日時",
                value: dayjs(new Date()).format("YYYY/MM/DD HH:mm:ss"),
              },
              {
                name: "解決理由",
                value: report.resolvedReason,
              },
              {
                name: "解決までの日数",
                value: `${dayjs(new Date()).diff(
                  report.createdAt.toDate(),
                  "days",
                )}日`,
              },
              {
                name: "モデレータ",
                value: resolverModerator.data()?.name,
              },
              {
                name: "レポーターUID",
                value: report?.reporterUid,
              },
            ],
          },
        ] as DiscordEmbed[],
      }),
    });
  });

exports.detectHourlyAppStoreNewReview = functions.pubsub
  .schedule("every 1 hours")
  .onRun(async () => {
    const APP_STORE_ID = "1486355943";
    const RSS_URL = `https://itunes.apple.com/jp/rss/customerreviews/page=1/id=${APP_STORE_ID}/sortBy=mostRecent/xml`;
    const whUrl = process.env.DISCORD_APP_REVIEW_WEBHOOK_URL;
    if (!whUrl) {
      throw new Error("process.env.DISCORD_APP_REVIEW_WEBHOOK_URL is not set!");
    }

    const appStoreReviewsDocRef = firestore
      .collection("storeReviews")
      .doc("appStore");

    const appStoreReviewsDocData = (
      await appStoreReviewsDocRef.get()
    ).data() as AppStoreReviewsDoc | undefined;

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
          (f) => !dayjs(f.updated).isSame(dayjs(ent.updated)),
        ),
    );

    const reviewsBodyArray = filteredEntries.map((ent) => {
      const oldEntry = rssEntries.find(
        (e) => e.id === ent.id && e.updated !== ent.updated,
      );
      const heading = oldEntry
        ? "**🙏App Storeに投稿されたレヴューが更新されまさした‼🙏**"
        : "**🙏App Storeに新しいレヴューが届きまさした‼🙏**";
      const content = `${heading}\n\n**${ent.title}**\n\`\`\`${ent.content[0]}\`\`\``;
      const embeds: DiscordEmbed[] = [
        {
          fields: [
            {
              name: "評価",
              value: new Array(5)
                .fill("")
                .map((_, i) => (i < ent["im:rating"] ? "★" : "☆"))
                .join(""),
            },
            {
              name: "バージョン",
              value: ent["im:version"],
            },
            {
              name: "投稿者",
              value: ent.author.name,
            },
            {
              name: "最終更新",
              value: dayjs(ent.updated).format("YYYY/MM/DD"),
            },
            {
              name: "レビューID",
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
    });

    await appStoreReviewsDocRef.update({
      notifiedEntryFeeds: [...notifiedFeeds, ...rssEntries],
    });

    return null;
  });

exports.tts = functions
  .region("asia-northeast1")
  .https.onCall(async (data, ctx) => {
    if (!ctx.auth) {
      throw new HttpsError(
        "failed-precondition",
        "The function must be called while authenticated.",
      );
    }

    const ssmlJa = data.ssmlJa;
    if (!(typeof ssmlJa === "string") || ssmlJa.length === 0) {
      throw new HttpsError(
        "invalid-argument",
        `The function must be called with one arguments "ssmlJa" containing the message ssmlJa to add.`,
      );
    }
    const ssmlEn = data.ssmlEn;
    if (!(typeof ssmlEn === "string") || ssmlEn.length === 0) {
      throw new HttpsError(
        "invalid-argument",
        `The function must be called with one arguments "ssmlEn" containing the message ssmlEn to add.`,
      );
    }

    const isPremium = data.premium;
    const jaVoiceName = isPremium ? "ja-JP-Neural2-B" : "ja-JP-Standard-B";
    const enVoiceName = isPremium ? "en-US-Studio-O" : "en-US-Standard-G";

    const voicesCollection = firestore
      .collection("caches")
      .doc("tts")
      .collection("voices");

    const hashAlgorithm = "md5";
    const hashData = ssmlJa + ssmlEn + jaVoiceName + enVoiceName;
    const id = createHash(hashAlgorithm).update(hashData).digest("hex");

    const snapshot = await voicesCollection.where("id", "==", id).get();

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

      const jaAudioContent = jaAudioData?.[0]?.toString("base64") || null;
      const enAudioContent = enAudioData?.[0]?.toString("base64") || null;

      return { id, jaAudioContent, enAudioContent };
    }

    const ttsUrl = `https://texttospeech.googleapis.com/v1beta1/text:synthesize?key=${process.env.GOOGLE_TTS_API_KEY}`;

    const reqBodyJa = {
      input: {
        ssml: ssmlJa,
      },
      voice: {
        languageCode: "ja-JP",
        name: jaVoiceName,
      },
      audioConfig: {
        audioEncoding: isPremium ? "LINEAR16" : "MP3",
        speakingRate: isPremium ? 1.1 : 1,
      },
    };

    const reqBodyEn = {
      input: {
        ssml: ssmlEn,
      },
      voice: {
        languageCode: "en-US",
        name: enVoiceName,
      },
      audioConfig: {
        audioEncoding: isPremium ? "LINEAR16" : "MP3",
        speakingRate: isPremium ? 1.1 : 1,
      },
    };

    const { audioContent: jaAudioContent } = await (
      await fetch(ttsUrl, {
        headers: {
          "content-type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify(reqBodyJa),
        method: "POST",
      })
    ).json();

    const { audioContent: enAudioContent } = await (
      await fetch(ttsUrl, {
        headers: {
          "content-type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify(reqBodyEn),
        method: "POST",
      })
    ).json();

    const cacheTopic = pubsub.topic("tts-cache");
    await cacheTopic.publishMessage({
      json: {
        id,
        isPremium,
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

exports.ttsCachePubSub = functions.pubsub
  .topic("tts-cache")
  .onPublish(
    async ({
      json: {
        id,
        isPremium,
        jaAudioContent,
        enAudioContent,
        ssmlJa,
        ssmlEn,
        voiceJa,
        voiceEn,
      },
    }) => {
      const jaTtsCachePathBase = "caches/tts/ja";
      const jaTtsBuf = Buffer.from(jaAudioContent, "base64");
      const jaTtsCachePath = `${jaTtsCachePathBase}/${id}${
        isPremium ? ".wav" : ".mp3"
      }`;

      const enTtsCachePathBase = "caches/tts/en";
      const enTtsBuf = Buffer.from(enAudioContent, "base64");
      const enTtsCachePath = `${enTtsCachePathBase}/${id}${
        isPremium ? ".wav" : ".mp3"
      }`;

      await storage.bucket().file(jaTtsCachePath).save(jaTtsBuf);
      await storage.bucket().file(enTtsCachePath).save(enTtsBuf);

      await firestore
        .collection("caches")
        .doc("tts")
        .collection("voices")
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
    },
  );
