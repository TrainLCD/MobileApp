import type { ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext) => ({
  name: 'TrainLCD',
  slug: 'trainlcd',
  version: '10.0.132',
  plugins: [
    'expo-font',
    'expo-localization',
    'expo-web-browser',
    'expo-sqlite',
    'expo-asset',
    [
      'expo-location',
      {
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    [
      '@sentry/react-native',
      {
        url: 'https://sentry.io/',
        note: 'Use SENTRY_AUTH_TOKEN env to authenticate with Sentry.',
        project: process.env.SENTRY_PROJECT_NAME || '',
        organization: 'tinykitten',
      },
    ],
    'expo-audio',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#fff',
        image: './assets/splash-icon.png',
      },
    ],
  ],
  extra: {
    eas: {
      projectId:
        process.env.EAS_BUILD_PROJECT_ID ||
        'dad36dde-0056-4760-8eda-37f05e7c9c6c',
    },
  },
  ios: {
    bundleIdentifier:
      process.env.EAS_BUILD_PROFILE === 'production'
        ? 'me.tinykitten.trainlcd'
        : 'me.tinykitten.trainlcd.dev',
    scheme:
      process.env.EAS_BUILD_PROFILE === 'production'
        ? 'TrainLCD'
        : 'CanaryTrainLCD',
    supportsTablet: true,
  },
  android: {
    package:
      process.env.EAS_BUILD_PROFILE === 'production'
        ? 'me.tinykitten.trainlcd'
        : 'me.tinykitten.trainlcd.dev',
    permissions: [],
    versionCode: 100000220,
  },
  owner: 'trainlcd',
});
