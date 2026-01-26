import type { ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext) => ({
  name: 'TrainLCD',
  slug: 'trainlcd',
  plugins: [
    'expo-font',
    'expo-localization',
    'expo-web-browser',
    'expo-sqlite',
    'expo-asset',
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
      projectId: process.env.EAS_BUILD_PROJECT_ID || '',
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
  },
  owner: 'trainlcd',
});
