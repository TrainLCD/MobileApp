// 'dev' はストア配信する Canary、'local' は android/app/build.gradle の local フレーバー
// （ストアの Canary 版を消さずに同居させるローカル検証専用ビルド）。local は Android 限定で
// iOS には対応するターゲットが無いため、iOS 側の識別子は Canary と同じものを使う。
// 外部参照先も Canary に合わせる方針なので、判定は IS_DEV 側にまとめる（src/utils/isDevApp.ts）
const IS_LOCAL = process.env.APP_VARIANT === 'local';
const IS_DEV = process.env.APP_VARIANT === 'dev' || IS_LOCAL;

export default {
  name: 'TrainLCD',
  slug: 'trainlcd',
  version: '10.15.0',
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
    buildNumber: '2906',
    scheme: IS_DEV ? 'CanaryTrainLCD' : 'ProdTrainLCD',
    bundleIdentifier: IS_DEV
      ? 'me.tinykitten.trainlcd.dev'
      : 'me.tinykitten.trainlcd',
    supportsTablet: true,
  },
  android: {
    package: IS_LOCAL
      ? 'me.tinykitten.trainlcd.local'
      : IS_DEV
        ? 'me.tinykitten.trainlcd.dev'
        : 'me.tinykitten.trainlcd',
    permissions: [],
    versionCode: 100000753,
  },
  owner: 'trainlcd',
  experiments: {
    reactCompiler: true,
  },
};
