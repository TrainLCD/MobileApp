import { PubSub } from '@google-cloud/pubsub';
import { onSchedule } from 'firebase-functions/v2/scheduler';

const pubsub = new PubSub();

export const reviewNotificationScheduler = onSchedule(
  {
    schedule: 'every 30 minutes',
    timeZone: 'Asia/Tokyo',
    region: 'asia-northeast1',
  },
  async (event) => {
    console.log('Review notification scheduler triggered');

    try {
      // Publish message to trigger the review notification PubSub function
      const messageId = await pubsub
        .topic('review-notification')
        .publishMessage({
          json: {
            trigger: 'scheduled',
            timestamp: new Date().toISOString(),
          },
        });

      console.log(
        `Review notification message published with ID: ${messageId}`
      );
    } catch (error) {
      console.error('Error publishing review notification message:', error);
      throw error;
    }
  }
);
