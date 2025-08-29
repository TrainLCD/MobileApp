import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { parseAppStoreRSSXML } from '../utils/appStoreParser';
import { fetchGooglePlayReviews } from '../utils/googlePlayParser';
import { sendDiscordNotification } from '../utils/discordNotifier';
import { 
  AppStoreReview, 
  GooglePlayReview, 
  ReviewNotificationState 
} from '../models/review';

// Firebase Admin SDKを初期化
try {
  initializeApp();
} catch (error) {
  // 既に初期化されている場合は無視
}

const firestore = getFirestore();

// App Store RSS URL
const APPSTORE_RSS_URL =
  'https://itunes.apple.com/jp/rss/customerreviews/id=1222897270/sortBy=mostRecent/xml';

export const reviewNotificationScheduler = onSchedule(
  {
    schedule: 'every 30 minutes',
    timeZone: 'Asia/Tokyo',
    region: 'asia-northeast1',
  },
  async (event) => {
    console.log('Review notification scheduler triggered');

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
      console.log('No new App Store reviews found');
      return;
    }

    // 新しいレビューを順番にDiscordに送信（古いものから新しいものへ）
    const sortedNewReviews = newReviews.reverse();

    for (const review of sortedNewReviews) {
      try {
        // Discord通知を送信
        const embedData = {
          title: `📱 新しいApp Storeレビュー`,
          description: `**${review.title}**\n\n${review.content}`,
          color: 0x0099ff,
          fields: [
            { name: '評価', value: '⭐'.repeat(review.rating), inline: true },
            { name: 'レビュワー', value: review.author, inline: true },
            { name: '日時', value: review.date, inline: true },
          ],
        };

        await sendDiscordNotification(embedData);
        console.log(`App Store review notification sent: ${review.id}`);

        // 少し待機してレート制限を避ける
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error sending App Store review notification: ${error}`);
      }
    }

    // 状態を更新（最新のレビューIDを保存）
    await firestore
      .collection('reviewNotificationState')
      .doc('appstore')
      .set({
        platform: 'appstore' as const,
        lastProcessedId: reviews[0].id,
        lastProcessedDate: reviews[0].date,
        updatedAt: new Date().toISOString(),
      });

    console.log(
      `Processed ${newReviews.length} new App Store reviews, last ID: ${reviews[0].id}`
    );
  } catch (error) {
    console.error('Error checking App Store reviews:', error);
    throw error;
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
      console.log('No new Google Play reviews found');
      return;
    }

    // 新しいレビューを順番にDiscordに送信（古いものから新しいものへ）
    const sortedNewReviews = newReviews.reverse();

    for (const review of sortedNewReviews) {
      try {
        // Discord通知を送信
        const embedData = {
          title: `🤖 新しいGoogle Playレビュー`,
          description: review.content,
          color: 0x4caf50,
          fields: [
            {
              name: '評価',
              value: '⭐'.repeat(review.starRating),
              inline: true,
            },
            { name: 'レビュワー', value: review.authorName, inline: true },
            { name: '日時', value: review.lastModified, inline: true },
          ],
        };

        await sendDiscordNotification(embedData);
        console.log(`Google Play review notification sent: ${review.reviewId}`);

        // 少し待機してレート制限を避ける
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(
          `Error sending Google Play review notification: ${error}`
        );
      }
    }

    // 状態を更新（最新のレビューIDを保存）
    await firestore
      .collection('reviewNotificationState')
      .doc('googleplay')
      .set({
        platform: 'googleplay' as const,
        lastProcessedId: reviews[0].reviewId,
        lastProcessedDate: reviews[0].lastModified,
        updatedAt: new Date().toISOString(),
      });

    console.log(
      `Processed ${newReviews.length} new Google Play reviews, last ID: ${reviews[0].reviewId}`
    );
  } catch (error) {
    console.error('Error checking Google Play reviews:', error);
    throw error;
  }
}
