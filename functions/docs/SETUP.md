# Setup Instructions for Review Notifications

This document contains the setup instructions for enabling the App Store and Google Play review notification system.

## Prerequisites

1. Firebase Functions project with Cloud Functions for Firebase enabled
2. Google Cloud Pub/Sub API enabled
3. Discord webhook URL for notifications
4. Firestore database

## 1. Environment Variables

Set the following environment variable in your Firebase Functions configuration:

```bash
firebase functions:config:set review.discord_webhook_url="YOUR_DISCORD_WEBHOOK_URL"
```

Or add to your `.env` file for local development:
```
DISCORD_REVIEWS_WEBHOOK_URL=YOUR_DISCORD_WEBHOOK_URL
```

## 2. Create Pub/Sub Topic

Create the required Pub/Sub topic using the Google Cloud CLI:

```bash
gcloud pubsub topics create review-notification
```

## 3. Deploy Functions

Deploy the new functions to Firebase:

```bash
npm run build
firebase deploy --only functions:reviewNotificationPubSub,functions:reviewNotificationScheduler
```

## 4. Firestore Security Rules

Ensure your Firestore security rules allow the Cloud Functions to write to the `reviewNotificationState` collection:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow Cloud Functions to read/write review notification state
    match /reviewNotificationState/{document} {
      allow read, write: if request.auth != null && request.auth.token.firebase.sign_in_provider == 'custom';
    }
  }
}
```

## 5. Testing

You can manually trigger the review notification check by publishing a message to the Pub/Sub topic:

```bash
gcloud pubsub topics publish review-notification --message='{"test": true}'
```

## 6. Monitoring

Monitor the function execution in the Firebase Console under Functions > Logs, or use:

```bash
firebase functions:log --only reviewNotificationPubSub,reviewNotificationScheduler
```

## Manual Trigger

To manually trigger a review check, you can call the function directly (useful for testing):

```javascript
// In Firebase Functions shell (npm run shell)
reviewNotificationPubSub({data: {message: {json: {test: true}}}})
```

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure the Firebase service account has Pub/Sub and Firestore permissions
2. **Webhook Failed**: Check that the Discord webhook URL is valid and the channel exists
3. **RSS Feed Timeout**: The App Store RSS feed may occasionally be slow or unavailable

### Checking Logs

```bash
# Check recent logs for review notifications
firebase functions:log --only reviewNotificationPubSub --limit 50

# Check scheduler logs
firebase functions:log --only reviewNotificationScheduler --limit 20
```