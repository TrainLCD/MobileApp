# TrainLCD Cloud Functions

This directory contains Firebase Cloud Functions that power the backend services for the TrainLCD mobile application.

## Overview

These Cloud Functions provide server-side functionality including:
- Text-to-Speech (TTS) audio generation and caching
- User feedback and report management
- Background data processing and validation
- Integration with Google Cloud services
- Automated content moderation and spam filtering

## Technology Stack

- **Firebase Functions** - Serverless compute platform
- **TypeScript** - Type-safe JavaScript development
- **Firebase Admin SDK** - Server-side Firebase integration
- **Google Cloud Pub/Sub** - Message queuing and processing
- **Biome** - Code formatting and linting
- **Jest** - Testing framework

## Getting Started

### Prerequisites

- **Node.js** (version 20)
- **npm** package manager
- **Firebase CLI** installed globally
- **Firebase project** set up and configured

### Installation

1. Navigate to the functions directory:
   ```bash
   cd functions
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   # Create your local environment configuration file (see .env.example)
   cp .env.example <your-env-file>
   # Edit your environment file with your Firebase project configuration
   ```

   Note: You'll need to configure your Firebase project credentials and other environment-specific settings. Do not commit environment files containing sensitive credentials.

### Development

#### Building the Functions

Build TypeScript to JavaScript:

```bash
npm run build
```

For continuous building during development:

```bash
npm run build:watch
```

#### Testing

Run the test suite:

```bash
npm test
```

#### Local Development

Start the Firebase emulator for local testing:

```bash
npm run serve
```

This will start the functions emulator and allow you to test functions locally.

#### Firebase Functions Shell

For interactive testing:

```bash
npm run shell
```

## Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run build:watch` - Watch mode compilation
- `npm run serve` - Start Firebase emulators
- `npm run shell` - Start Firebase functions shell
- `npm run deploy` - Deploy functions to Firebase
- `npm run logs` - View function logs
- `npm run lint` - Run Biome linter
- `npm run format` - Format code with Biome
- `npm test` - Run Jest tests

## Project Structure

```text
src/
├── domain/         # Business logic and domain models
├── funcs/          # Main function handlers
├── models/         # Type definitions and interfaces
├── utils/          # Utility functions
├── workers/        # Background workers
└── index.ts        # Main function exports

lib/                # Compiled JavaScript output
```

## Functions
The Cloud Functions in this project handle various backend operations:

### HTTP Functions
- **TTS Generation** - Text-to-Speech audio synthesis for station announcements
- **Feedback Processing** - User report and feedback submission handling
- **Content Validation** - Input validation and spam filtering

### Pub/Sub Functions
- **TTS Cache Management** - Background audio file caching and optimization
- **Content Moderation** - Automated content review and filtering
- **Data Processing** - Asynchronous data transformation tasks

### Scheduled Jobs
- **App Store Review Notifier (`appStoreReviewNotifier`)** - App Storeの最新レビューをJSONフィードから取得し、Discordへ通知します（既定: 毎時）。
  - 環境変数:
    - `DISCORD_REVIEW_WEBHOOK_URL`: DiscordのWebhook URL（必須）
    - `APPSTORE_REVIEW_FEED_URL`: App StoreレビューのJSONフィードURL（任意）。未設定時は既定のJSONエンドポイント（日本向け `/jp/`）。国・言語を変更したい場合はこのURLの地域コードを差し替えてください。必ず末尾が `/json` のURLを指定してください（`/xml` は非対応）。
      - 既定値: `https://itunes.apple.com/jp/rss/customerreviews/page=1/id=1486355943/sortBy=mostRecent/json`
      - 旧 `APPSTORE_REVIEW_RSS_URL` は非対応になりました（使用しないでください）。
    - `APPSTORE_REVIEW_STATE_GCS_URI`: 既読状態を保存するGCSパス（例: `gs://<bucket>/states/appstore-reviews.json`）[本番必須]。必要最小の権限は該当オブジェクトへの読取/作成（例: `roles/storage.objectViewer` + `roles/storage.objectCreator`）。運用上の都合であれば `roles/storage.objectAdmin` でも可。
    - `REVIEWS_CRON_SCHEDULE`: スケジュール（例: `every 60 minutes`）。未設定時は毎時実行
    - `REVIEWS_TIMEZONE`: タイムゾーン（例: `Asia/Tokyo`）。未設定時はUTC
  - デバッグ用（任意）:
    - `REVIEWS_DEBUG=1`: 取得内容などの詳細ログを出力
    - `REVIEWS_FORCE_LATEST_COUNT`: 整数N。既読に関わらず最新N件を強制送信（検証用途）
    - `REVIEWS_DRY_RUN=1`: Discord送信をスキップし、送信予定の項目をログ表示

- **Google Play Review Notifier (`googlePlayReviewNotifier`)** - Google Playの最新レビューをAndroid Publisher APIから取得し、Discordへ通知します（既定: 毎時）。
  - 環境変数:
    - `DISCORD_REVIEW_WEBHOOK_URL`: DiscordのWebhook URL（必須）
    - `GOOGLE_PLAY_PACKAGE_NAME`: パッケージ名（既定: `me.tinykitten.trainlcd`）
    - `GOOGLEPLAY_REVIEW_STATE_GCS_URI`: 既読状態を保存するGCSパス（例: `gs://<bucket>/states/googleplay-reviews.json`）
    - `PLAY_REVIEWS_CRON_SCHEDULE`: スケジュール（例: `every 60 minutes`）。未設定時は毎時実行
    - `PLAY_REVIEWS_TIMEZONE`: タイムゾーン（例: `Asia/Tokyo`）。未設定時はUTC
  - 認証: Cloud Functionsのサービスアカウントに「Android Publisher API」へのアクセス権を付与し、ADC（Application Default Credentials）で認証します。
  - デバッグ用（任意）:
    - `REVIEWS_DEBUG=1`: 取得/ページング/保存の詳細ログを出力
    - `REVIEWS_FORCE_LATEST_COUNT`: 整数N。既読に関わらず最新N件を強制送信（検証用途）
    - `REVIEWS_DRY_RUN=1`: Discord送信をスキップし、送信予定の項目をログ表示


### Firestore Triggers
- Database change reactions
- Data validation
- Automated workflows
## Environment Configuration

The functions use environment variables for configuration. You'll need to set up your own environment files based on your Firebase project settings:

- Create an environment file for local development (see `.env.example`)
- Configure production environment variables in your Firebase project settings

Make sure to never commit environment files containing sensitive credentials to version control.

## Deployment

### Deploy to Development

```bash
# Make sure you're using the correct Firebase project
firebase use <your-dev-project>
npm run deploy
```

### Deploy to Production

```bash
# Switch to production project
firebase use <your-prod-project>
npm run deploy
```

## Testing

### Unit Tests

Run unit tests with Jest:

```bash
npm test
```

### Integration Testing

Use the Firebase emulator for integration testing:

```bash
npm run serve
# Run your integration tests against the local emulator
```

## Code Quality

This project uses Biome for code formatting and linting:

```bash
# Check code quality
npm run lint

# Auto-format code
npm run format
```

## Monitoring and Debugging

### View Logs

```bash
# View function logs
npm run logs

# View logs for specific function
firebase functions:log --only functionName
```

### Error Tracking

Functions are integrated with error tracking and monitoring systems to help identify and resolve issues quickly.

## Contributing


When contributing to the Cloud Functions:

1. Follow the existing TypeScript coding standards
2. Add tests for new functions and workers
3. Update this README if adding new functionality or changing structure
4. Ensure all tests pass before submitting
5. Use meaningful commit messages

### Development Guidelines

- Use TypeScript for all function code
- Follow the established project structure (see above)
- Add proper error handling and logging
- Write unit tests for business logic and workers
- Document complex functions and algorithms

## Security

- Environment variables contain sensitive configuration
- Never commit environment files with real credentials
- Follow Firebase security best practices
- Validate all inputs in HTTP functions
- Use proper authentication and authorization

## Related Documentation

- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Google Cloud Pub/Sub](https://cloud.google.com/pubsub/docs)
- [Main TrainLCD README](../README.md)

## Support

For issues related to Cloud Functions:

1. Check the Firebase console for error logs
2. Review the [Firebase Functions documentation](https://firebase.google.com/docs/functions)
3. Create an issue in the main repository with function-specific details
4. Join our [Discord community](https://discord.gg/7sQhQhnvvw) for support

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.
