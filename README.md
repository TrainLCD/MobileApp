# TrainLCD

![Billboard](.github/images/billboard.png)

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->

[![All Contributors](https://img.shields.io/badge/all_contributors-6-orange.svg?style=flat-square)](#contributors-)

<!-- ALL-CONTRIBUTORS-BADGE:END -->

![ESLint](https://github.com/TinyKitten/TrainLCD/workflows/ESLint/badge.svg)
![Test](https://github.com/TinyKitten/TrainLCD/workflows/Jest/badge.svg)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

**TrainLCD is a mobile application that simulates Japanese railway company LCDs, providing real-time navigation and station information for train passengers.**

This app recreates the authentic experience of Japanese train travel by displaying station information in the same style as actual train LCD screens. Whether you're a tourist visiting Japan, a daily commuter, or simply fascinated by Japanese railway systems, TrainLCD offers an immersive and practical navigation experience.

## Table of Contents

- [Screenshots](#screenshots)
- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the App](#running-the-app)
- [Download](#download)
- [Development](#development)
  - [Project Structure](#project-structure)
  - [Available Scripts](#available-scripts)
  - [Testing](#testing)
- [Contributing](#contributing)
- [Code of Conduct](#code-of-conduct)
- [Architecture](#architecture)
- [License](#license)
- [Support](#support)
- [Join our Community](#join-our-community)
- [Contributors](#contributors-)
- [Related Projects](#related-projects)

## Screenshots

<!-- Add screenshots here when available -->
*Screenshots and demo videos coming soon...*

## Features

- **🚆 Authentic LCD**: Experience genuine Japanese train LCD interfaces with accurate styling from major railway companies
- **📍 Real-time Location Tracking**: Automatically detect your current position and display relevant station information
- **🔔 Smart Notifications**: Get notified when approaching or arriving at your destination station
- **🎨 Multiple Themes**: Choose from various railway company themes including JR East, JR West, Tokyo Metro, and more
- **📱 Cross-platform**: Available on both iOS and Android devices
- **🌐 Offline Support**: Core functionality works without internet connection
- **🗾 Comprehensive Coverage**: Supports major railway lines across Japan

## Getting Started

### Prerequisites

Before you begin, ensure you have met the following requirements:

- **Node.js** (version 18 or higher)
- **pnpm** package manager
- **React Native development environment** set up
- **Expo CLI** installed globally
- **Firebase CLI** (for Cloud Functions development)
- **Android Studio** (for Android development)
- **Xcode** (for iOS development, macOS only)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/TrainLCD/MobileApp.git
   cd MobileApp
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

   Note: Protocol buffer files are automatically generated during installation via the `postinstall` script.

### Running the App

#### Development Mode

To start the development server:

```bash
pnpm start
```

#### Platform-specific Commands

- **iOS**: `pnpm ios`
- **Android**: `pnpm android`
- **Web**: `pnpm web`

## Download

[![Google Play](.github/images/googleplay.png)](https://play.google.com/store/apps/details?id=me.tinykitten.trainlcd)
[![App Store](.github/images/appstore.svg)](https://apps.apple.com/jp/app/trainlcd/id1486355943)

## Join our Community

If you like this project, join our Discord community!  
**NOTE: English is welcome, but in the community, we usually use Japanese for discussions, announcements, etc.**
[https://discord.gg/7sQhQhnvvw](https://discord.gg/7sQhQhnvvw)

## Development

### Project Structure

```text
src/
├── components/     # Reusable UI components
├── screens/        # Screen components
├── hooks/          # Custom React hooks
├── store/          # State management
├── utils/          # Utility functions
├── constants/      # App constants
├── models/         # Data models
└── assets/         # Static assets

functions/          # Firebase Cloud Functions
├── src/            # Function source code
├── lib/            # Compiled JavaScript
└── package.json    # Function dependencies
```

### Available Scripts

- `pnpm start` - Start the Expo development server
- `pnpm lint` - Run Biome linter
- `pnpm format` - Format code with Biome
- `pnpm test` - Run Jest tests
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm watch:test` - Run tests in watch mode

### Testing

This project uses Jest for testing. Run the test suite with:

```bash
pnpm test
```

For watch mode during development:

```bash
pnpm watch:test
```

### Firebase Cloud Functions

This project includes Firebase Cloud Functions located in the `functions/` directory. To work with Cloud Functions:

1. Navigate to the functions directory:
   ```bash
   cd functions
   ```

2. Install function dependencies:
   ```bash
   npm install
   ```

3. Build the functions:
   ```bash
   npm run build
   ```

4. Run functions locally (requires Firebase CLI):
   ```bash
   firebase emulators:start
   ```

## Contributing

We welcome contributions from the community! Here's how you can help:

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and ensure they follow our coding standards
4. **Run tests**: `pnpm test`
5. **Run linting**: `pnpm lint`
6. **Commit your changes**: `git commit -m 'Add some amazing feature'`
7. **Push to the branch**: `git push origin feature/amazing-feature`
8. **Open a Pull Request**

### Development Guidelines

- Follow the existing code style and conventions
- Write clear, descriptive commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

### Reporting Issues

If you encounter any bugs or have feature requests:

1. Check if the issue already exists in our [Issues](https://github.com/TrainLCD/MobileApp/issues)
2. If not, create a new issue with:
   - Clear description of the problem
   - Steps to reproduce (for bugs)
   - Expected vs actual behavior
   - Device/platform information
   - Screenshots if applicable

## Code of Conduct

This project adheres to a code of conduct that we expect all contributors to follow. Please be respectful and professional in all interactions.

### Our Standards

- Be welcoming and inclusive
- Respect differing viewpoints and experiences
- Give and gracefully accept constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

## Architecture

TrainLCD is built with:

- **React Native** with **Expo** - Cross-platform mobile development
- **TypeScript** - Type safety and better developer experience
- **React Navigation** - Navigation library
- **Tanstack Query** - Data fetching and caching
- **Firebase** - Backend services (Analytics, Auth, Firestore, Storage)
- **Sentry** - Error tracking and performance monitoring
- **Protocol Buffers** - Efficient data serialization

## Support

### Community Support

- Join our [Discord community](https://discord.gg/7sQhQhnvvw) for discussions and support
- Check out existing [Issues](https://github.com/TrainLCD/MobileApp/issues) and [Discussions](https://github.com/TrainLCD/MobileApp/discussions)

### Professional Support

For professional support or custom development, please contact the maintainers.

## Acknowledgments

- Thanks to all contributors who have helped improve this project
- Special thanks to the Japanese railway companies for providing inspiration
- The open-source community for the excellent tools and libraries

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/makotia"><img src="https://avatars.githubusercontent.com/u/22451396?v=4?s=100" width="100px;" alt="makotia"/><br /><sub><b>makotia</b></sub></a><br /><a href="https://github.com/TrainLCD/MobileApp/commits?author=makotia" title="Documentation">📖</a> <a href="#userTesting-makotia" title="User Testing">📓</a> <a href="https://github.com/TrainLCD/MobileApp/pulls?q=is%3Apr+reviewed-by%3Amakotia" title="Reviewed Pull Requests">👀</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://sw-saturn.dev"><img src="https://avatars.githubusercontent.com/u/20313668?v=4?s=100" width="100px;" alt="Kanta Demizu"/><br /><sub><b>Kanta Demizu</b></sub></a><br /><a href="#data-Sw-Saturn" title="Data">🔣</a> <a href="#userTesting-Sw-Saturn" title="User Testing">📓</a> <a href="https://github.com/TrainLCD/MobileApp/pulls?q=is%3Apr+reviewed-by%3ASw-Saturn" title="Reviewed Pull Requests">👀</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://nrsy.jp"><img src="https://avatars.githubusercontent.com/u/31317056?v=4?s=100" width="100px;" alt="SAIGUSA Tomotada"/><br /><sub><b>SAIGUSA Tomotada</b></sub></a><br /><a href="#userTesting-10mocy" title="User Testing">📓</a> <a href="#data-10mocy" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/kokoa0429"><img src="https://avatars.githubusercontent.com/u/17563842?v=4?s=100" width="100px;" alt="yasuto masuda"/><br /><sub><b>yasuto masuda</b></sub></a><br /><a href="#userTesting-kokoa0429" title="User Testing">📓</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://kataba.me"><img src="https://avatars.githubusercontent.com/u/9818101?v=4?s=100" width="100px;" alt="Katabame Miaya"/><br /><sub><b>Katabame Miaya</b></sub></a><br /><a href="#data-katabame" title="Data">🔣</a> <a href="#userTesting-katabame" title="User Testing">📓</a> <a href="https://github.com/TrainLCD/MobileApp/commits?author=katabame" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://coderabbit.ai"><img src="https://avatars.githubusercontent.com/u/132028505?v=4?s=100" width="100px;" alt="CodeRabbit"/><br /><sub><b>CodeRabbit</b></sub></a><br /><a href="https://github.com/TrainLCD/MobileApp/pulls?q=is%3Apr+reviewed-by%3Acoderabbitai" title="Reviewed Pull Requests">👀</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

## Related Projects

- [StationAPI](https://github.com/TinyKitten/StationAPI) - Backend API for station data


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.