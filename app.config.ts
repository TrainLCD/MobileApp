const IS_DEV = process.env.APP_VARIANT === 'dev';

export default {
  name: 'TrainLCD',
  slug: 'trainlcd',
  version: '10.14.0',
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
  ],
  extra: {
    eas: {
      projectId: 'dad36dde-0056-4760-8eda-37f05e7c9c6c',
    },
  },
  ios: {
    // 既定値は 'light' で、prebuild すると Info.plist の UIUserInterfaceStyle が
    // Light で書き戻される。それだと端末のダークモード設定を JS から読めなくなり
    // 外観設定の「自動」が機能しないため、明示的に automatic を指定する。
    // Android は元から固定されておらず、この指定は expo-system-ui を入れないと
    // 無視されるため、iOS 側にだけ置く
    userInterfaceStyle: 'automatic',
    // Expo SDK 57 の各モジュール（expo / expo-modules-core ほか）は podspec で iOS 16.4 以上を要求する
    deploymentTarget: '16.4',
    buildNumber: '2879',
    scheme: IS_DEV ? 'CanaryTrainLCD' : 'ProdTrainLCD',
    bundleIdentifier: IS_DEV
      ? 'me.tinykitten.trainlcd.dev'
      : 'me.tinykitten.trainlcd',
    supportsTablet: true,
  },
  android: {
    package: IS_DEV ? 'me.tinykitten.trainlcd.dev' : 'me.tinykitten.trainlcd',
    permissions: [],
    versionCode: 100000699,
  },
  owner: 'trainlcd',
  experiments: {
    reactCompiler: true,
  },
};
