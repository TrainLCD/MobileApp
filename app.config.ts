const IS_DEV = process.env.APP_VARIANT === 'dev';

export default {
  name: 'TrainLCD',
  slug: 'trainlcd',
  version: '10.10.1',
  plugins: [
    'expo-image',
    'expo-font',
    'expo-localization',
    'expo-web-browser',
    'expo-sqlite',
    'expo-asset',
    'expo-quick-actions',
    'expo-secure-store',
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
        project: 'trainlcd',
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
    [
      'expo-build-properties',
      {
        ios: {
          buildReactNativeFromSource: true,
        },
      },
    ],
  ],
  extra: {
    eas: {
      projectId: 'dad36dde-0056-4760-8eda-37f05e7c9c6c',
    },
  },
  ios: {
    buildNumber: '2764',
    scheme: IS_DEV ? 'CanaryTrainLCD' : 'ProdTrainLCD',
    bundleIdentifier: IS_DEV ? 'me.tinykitten.trainlcd.dev' : 'me.tinykitten.trainlcd',
    supportsTablet: true,
  },
  android: {
    package: IS_DEV ? 'me.tinykitten.trainlcd.dev' : 'me.tinykitten.trainlcd',
    permissions: [],
    versionCode: 100000551,
  },
  owner: 'trainlcd',
  experiments: {
    reactCompiler: true,
  },
};
