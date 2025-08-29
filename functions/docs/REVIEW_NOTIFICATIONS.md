# Review Notification System

This system provides automated notifications to Discord when new reviews are posted on the App Store (and Google Play in the future).

## Features

- **App Store Review Monitoring**: Automatically fetches and parses reviews from the App Store RSS feed
- **Discord Notifications**: Sends formatted notifications to Discord when new reviews are found
- **Duplicate Prevention**: Tracks the last processed review to avoid sending duplicate notifications
- **Scheduled Execution**: Runs every 30 minutes to check for new reviews

## Setup

### Environment Variables

Add the following environment variable to your Firebase Functions configuration:

```bash
# Discord webhook URL for review notifications
DISCORD_REVIEWS_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_URL
```

### Firebase Functions

The system consists of two main functions:

1. **reviewNotificationScheduler**: A scheduled function that runs every 30 minutes
2. **reviewNotificationPubSub**: A PubSub function that processes the review checking logic

### PubSub Topic

Make sure the `review-notification` PubSub topic exists in your Google Cloud project.

## How It Works

1. **Scheduler Trigger**: Every 30 minutes, the scheduler function publishes a message to the `review-notification` PubSub topic
2. **Review Fetching**: The PubSub function fetches the latest reviews from the App Store RSS feed
3. **State Tracking**: The system stores the last processed review ID in Firestore to avoid duplicates
4. **Discord Notification**: New reviews are formatted and sent to the specified Discord webhook

## Data Storage

The system uses Firestore to store the notification state:

```
Collection: reviewNotificationState
Document ID: appstore
Fields:
- platform: 'appstore'
- lastProcessedId: string (ID of the last processed review)
- lastProcessedDate: string (date of the last processed review)
- updatedAt: string (timestamp of the last update)
```

## App Store RSS Feed

The system monitors the TrainLCD app's review RSS feed:
`https://itunes.apple.com/jp/rss/customerreviews/page=1/id=1486355943/sortBy=mostRecent/xml`

## Discord Notification Format

Notifications include:
- App name (TrainLCD - App Store)
- Review title
- Review content
- Star rating (displayed as emoji stars)
- Reviewer name
- App version
- Review date
- Review link (if available)

High-rated reviews (4+ stars) receive a special "high rating" message format.

## Future Enhancements

- Google Play review monitoring (when API access is available)
- Configurable notification frequency
- Review filtering by rating or keywords
- Analytics and reporting