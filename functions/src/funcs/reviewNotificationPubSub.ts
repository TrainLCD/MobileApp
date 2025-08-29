import dayjs from 'dayjs';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import type { DiscordEmbed } from '../models/common';
import type {
  AppStoreReview,
  GooglePlayReview,
  ReviewNotificationState,
} from '../models/review';
import { parseAppStoreRSSXML } from '../utils/appStoreParser';
import { fetchGooglePlayReviews } from '../utils/googlePlayParser';

const firestore = admin.firestore();

// TrainLCDアプリのApp Store RSSフィードURL (ID: 1486355943)
const APPSTORE_RSS_URL =
  'https://itunes.apple.com/jp/rss/customerreviews/page=1/id=1486355943/sortBy=mostRecent/xml';

export const reviewNotificationPubSub = onMessagePublished(
  'review-notification',
  async (event) => {
    console.log('Review notification PubSub triggered');

    // App StoreとGoogle Playの両方のレビューをチェック（エラーが発生しても両方実行）
    const results = await Promise.allSettled([
      checkAppStoreReviews(),
      checkGooglePlayReviews(),
    ]);

    // 各結果をチェックしてエラーがあればログ出力
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const source = index === 0 ? 'App Store' : 'Google Play';
        console.error(`Error checking ${source} reviews:`, result.reason);
      }
    });
  }
);

async function checkAppStoreReviews() {
  console.log('Checking App Store reviews...');

  try {
    // RSSフィードを取得
    const response = await fetch(APPSTORE_RSS_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch App Store RSS: ${response.status}`);
    }

    const xmlContent = await response.text();
    const reviews = parseAppStoreRSSXML(xmlContent);

    if (reviews.length === 0) {
      console.log('No reviews found in RSS feed');
      return;
    }

    // 最後に処理されたレビューの状態を取得
    const stateDoc = await firestore
      .collection('reviewNotificationState')
      .doc('appstore')
      .get();

    const lastState = stateDoc.exists
      ? (stateDoc.data() as ReviewNotificationState)
      : null;
    const lastProcessedId = lastState?.lastProcessedId;

    // 新しいレビューを検索（まだ処理されていないレビュー）
    const newReviews: AppStoreReview[] = [];

    for (const review of reviews) {
      if (lastProcessedId && review.id === lastProcessedId) {
        // 最後に処理されたレビューを見つけたので、ここで停止
        break;
      }
      newReviews.push(review);
    }

    if (newReviews.length === 0) {
      console.log('No new reviews to process');
      return;
    }

    console.log(`Found ${newReviews.length} new reviews`);

    // 新しいレビューのDiscord通知を送信（古いものから送信するために逆順で）
    for (const review of newReviews.reverse()) {
      await sendAppStoreReviewToDiscord(review);
    }

    // 最後に処理された状態を更新
    const latestReview = reviews[0]; // 最新のレビュー
    if (latestReview) {
      await firestore
        .collection('reviewNotificationState')
        .doc('appstore')
        .set({
          platform: 'appstore',
          lastProcessedId: latestReview.id,
          lastProcessedDate: latestReview.date,
          updatedAt: Timestamp.now().toDate().toISOString(),
        });
    }
  } catch (error) {
    console.error('Error checking App Store reviews:', error);
  }
}

async function checkGooglePlayReviews() {
  console.log('Checking Google Play reviews...');

  try {
    // Google Playのレビューを取得
    const reviews = await fetchGooglePlayReviews();

    if (reviews.length === 0) {
      console.log('No Google Play reviews found or API not yet configured');
      return;
    }

    // 最後に処理されたレビューの状態を取得
    const stateDoc = await firestore
      .collection('reviewNotificationState')
      .doc('googleplay')
      .get();

    const lastState = stateDoc.exists
      ? (stateDoc.data() as ReviewNotificationState)
      : null;
    const lastProcessedId = lastState?.lastProcessedId;

    // 新しいレビューを検索（まだ処理されていないレビュー）
    const newReviews: GooglePlayReview[] = [];

    for (const review of reviews) {
      if (lastProcessedId && review.reviewId === lastProcessedId) {
        // 最後に処理されたレビューを見つけたので、ここで停止
        break;
      }
      newReviews.push(review);
    }

    if (newReviews.length === 0) {
      console.log('No new Google Play reviews to process');
      return;
    }

    console.log(`Found ${newReviews.length} new Google Play reviews`);

    // 新しいレビューのDiscord通知を送信（古いものから送信するために逆順で）
    for (const review of newReviews.reverse()) {
      await sendGooglePlayReviewToDiscord(review);
    }

    // 最後に処理された状態を更新
    const latestReview = reviews[0]; // 最新のレビュー
    if (latestReview) {
      await firestore
        .collection('reviewNotificationState')
        .doc('googleplay')
        .set({
          platform: 'googleplay',
          lastProcessedId: latestReview.reviewId,
          lastProcessedDate: latestReview.lastModified,
          updatedAt: Timestamp.now().toDate().toISOString(),
        });
    }
  } catch (error) {
    console.error('Error checking Google Play reviews:', error);
  }
}

async function sendAppStoreReviewToDiscord(review: AppStoreReview) {
  const webhookUrl = process.env.DISCORD_REVIEWS_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error('DISCORD_REVIEWS_WEBHOOK_URL is not set');
    return;
  }

  // Discord埋め込みメッセージを作成
  const embed: DiscordEmbed = {
    fields: [
      {
        name: 'アプリ',
        value: 'TrainLCD (App Store)',
      },
      {
        name: 'レビュータイトル',
        value: review.title || '無題',
      },
      {
        name: 'レビュー内容',
        value: review.content || 'レビュー内容なし',
      },
      {
        name: '評価',
        value: `${'⭐'.repeat(review.rating)} (${review.rating}/5)`,
      },
      {
        name: 'レビュワー',
        value: review.author || '匿名',
      },
      {
        name: 'アプリバージョン',
        value: review.version || '不明',
      },
      {
        name: '投稿日時',
        value: review.date
          ? dayjs(review.date).format('YYYY/MM/DD HH:mm:ss')
          : '不明',
      },
    ],
  };

  // リンクが利用可能な場合は追加
  if (review.link) {
    embed.fields.push({
      name: 'レビューリンク',
      value: review.link,
    });
  }

  const content =
    review.rating >= 4
      ? '**🌟 新しい高評価レビューが投稿されました！**'
      : '**📝 新しいレビューが投稿されました**';

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        embeds: [embed],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('Discord webhook failed', response.status, errorText);
    } else {
      console.log(
        `Successfully sent App Store review notification: ${review.id}`
      );
    }
  } catch (error) {
    console.error('Error sending Discord notification:', error);
  }
}

async function sendGooglePlayReviewToDiscord(review: GooglePlayReview) {
  const webhookUrl = process.env.DISCORD_REVIEWS_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error('DISCORD_REVIEWS_WEBHOOK_URL is not set');
    return;
  }

  // Discord埋め込みメッセージを作成
  const embed: DiscordEmbed = {
    fields: [
      {
        name: 'アプリ',
        value: 'TrainLCD (Google Play)',
      },
      {
        name: 'レビュー内容',
        value: review.content || 'レビュー内容なし',
      },
      {
        name: '評価',
        value: `${'⭐'.repeat(review.starRating)} (${review.starRating}/5)`,
      },
      {
        name: 'レビュワー',
        value: review.authorName || '匿名',
      },
      {
        name: 'アプリバージョン',
        value: review.appVersion || '不明',
      },
      {
        name: '投稿日時',
        value: review.lastModified
          ? dayjs
              .unix(Number(review.lastModified))
              .format('YYYY/MM/DD HH:mm:ss')
          : '不明',
      },
    ],
  };

  const content =
    review.starRating >= 4
      ? '**🌟 新しい高評価レビューが投稿されました！**'
      : '**📝 新しいレビューが投稿されました**';

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        embeds: [embed],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('Discord webhook failed', response.status, errorText);
    } else {
      console.log(
        `Successfully sent Google Play review notification: ${review.reviewId}`
      );
    }
  } catch (error) {
    console.error('Error sending Discord notification:', error);
  }
}
