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
