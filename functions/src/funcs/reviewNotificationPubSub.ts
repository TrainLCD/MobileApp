import dayjs from 'dayjs';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import type { DiscordEmbed } from '../models/common';
import type { AppStoreReview, ReviewNotificationState } from '../models/review';
import { parseAppStoreRSSXML } from '../utils/appStoreParser';

const firestore = admin.firestore();

// App Store RSS feed URL for TrainLCD app (ID: 1486355943)
const APPSTORE_RSS_URL =
  'https://itunes.apple.com/jp/rss/customerreviews/page=1/id=1486355943/sortBy=mostRecent/xml';

export const reviewNotificationPubSub = onMessagePublished(
  'review-notification',
  async (event) => {
    console.log('Review notification PubSub triggered');

    try {
      // Check both App Store and Google Play (when implemented)
      await checkAppStoreReviews();
      // TODO: Add Google Play review checking when implemented
      // await checkGooglePlayReviews();
    } catch (error) {
      console.error('Error in review notification:', error);
    }
  }
);

async function checkAppStoreReviews() {
  console.log('Checking App Store reviews...');

  try {
    // Fetch RSS feed
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

    // Get last processed review state
    const stateDoc = await firestore
      .collection('reviewNotificationState')
      .doc('appstore')
      .get();

    const lastState = stateDoc.exists
      ? (stateDoc.data() as ReviewNotificationState)
      : null;
    const lastProcessedId = lastState?.lastProcessedId;

    // Find new reviews (reviews that haven't been processed yet)
    const newReviews: AppStoreReview[] = [];

    for (const review of reviews) {
      if (lastProcessedId && review.id === lastProcessedId) {
        // Found the last processed review, stop here
        break;
      }
      newReviews.push(review);
    }

    if (newReviews.length === 0) {
      console.log('No new reviews to process');
      return;
    }

    console.log(`Found ${newReviews.length} new reviews`);

    // Send Discord notifications for new reviews (in reverse order to send oldest first)
    for (const review of newReviews.reverse()) {
      await sendAppStoreReviewToDiscord(review);
    }

    // Update the last processed state
    const latestReview = reviews[0]; // Most recent review
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

async function sendAppStoreReviewToDiscord(review: AppStoreReview) {
  const webhookUrl = process.env.DISCORD_REVIEWS_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error('DISCORD_REVIEWS_WEBHOOK_URL is not set');
    return;
  }

  // Create Discord embed
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
        name: 'レビューアー',
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

  // Add link if available
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
