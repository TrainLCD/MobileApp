// react-native-mmkv 本体は import 時に react-native-nitro-modules（ネイティブ
// バイナリ必須）を引き込んで落ちるため、ライブラリ同梱のインメモリ実装
// createMockMMKV だけを取り出して createMMKV を差し替える。
jest.mock("react-native-mmkv", () => {
  const {
    createMockMMKV,
  } = require("react-native-mmkv/lib/createMMKV/createMockMMKV");
  return {
    createMMKV: (config) => createMockMMKV(config),
  };
});

// AsyncStorage は MMKV への移行処理（src/lib/storage.ts）でのみ参照される
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    multiGet: jest.fn((keys) => Promise.resolve(keys.map((key) => [key, null]))),
    multiSet: jest.fn(() => Promise.resolve()),
    multiRemove: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock("~/hooks", () => ({
  useCurrentStation: jest.fn(() => null),
  useThemeStore: jest.fn(() => ({})),
  useCurrentLine: jest.fn(() => ({})),
  useNextStation: jest.fn(() => ({})),
  usePrevious: jest.fn((value) => value),
  useLazyPrevious: jest.fn((value) => value),
  useIsNextLastStop: jest.fn(() => false),
  useCurrentTrainType: jest.fn(() => ({})),
  useBoundText: jest.fn(() => ({})),
  useLoopLine: jest.fn(() => ({})),
  useNumbering: jest.fn(() => []),
  useClock: jest.fn(() => []),
  useInterval: jest.fn(() => null),
  useLandscapeWindowDimensions: jest.fn(() => ({ width: 812, height: 375 })),
}));

jest.mock("react-native-reanimated", () => {
  const Reanimated = require("react-native-reanimated/mock");
  return {
    ...Reanimated,
    useSharedValue: jest.fn(() => ({ value: 1 })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((value) => value),
    runOnJS: jest.fn((fn) => fn),
    Easing: {
      ease: jest.fn(),
    },
  };
});

jest.mock("~/utils/isTablet", () => ({
  __esModule: true,
  default: false,
}));

jest.mock("react-native-localize", () => ({
  findBestLanguageTag: jest.fn(() => "ja"),
}));

// react-native-device-info はネイティブ依存（NativeEventEmitter）のためモックする。
// isDevApp 経由で広く import されるため、グローバル setup でモックしておく。
jest.mock("react-native-device-info", () =>
  require("react-native-device-info/jest/react-native-device-info-mock")
);

// SecureStore はネイティブモジュール依存のためインメモリでモックする。
// store はモジュールスコープで保持されるため、テスト間で値がリークしないよう
// 各テスト前にリセットする（mock 接頭辞が必要）。
const mockSecureStore = {};
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async (key) => mockSecureStore[key] ?? null),
  setItemAsync: jest.fn(async (key, value) => {
    mockSecureStore[key] = value;
  }),
  deleteItemAsync: jest.fn(async (key) => {
    delete mockSecureStore[key];
  }),
}));

beforeEach(() => {
  for (const key of Object.keys(mockSecureStore)) {
    delete mockSecureStore[key];
  }

  // 共有 MMKV インスタンス（Jest では react-native-mmkv 組み込みの
  // インメモリ実装）をテストごとに空へ戻す
  const { storage } = require("./src/lib/storage");
  storage.clearAll();
});
