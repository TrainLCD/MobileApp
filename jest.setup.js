jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    multiGet: jest.fn(() => Promise.resolve([])),
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

// Remote Config はネイティブモジュール依存のためモックする。
// setDefaults で登録した既定値を getValue から読み出せるようにし、未設定キーは
// asNumber が 0 を返すことで getMaxPermitAccuracy 側のフォールバックを発火させる。
// store はモジュールスコープで保持されるため、テスト間で値がリークしないよう
// 各テスト前にリセットする（jest.mock のファクトリ外から参照するため mock 接頭辞が必要）。
const mockRemoteConfigStore = {};
jest.mock("@react-native-firebase/remote-config", () => {
  return {
    getRemoteConfig: jest.fn(() => ({})),
    setConfigSettings: jest.fn(() => Promise.resolve()),
    setDefaults: jest.fn((_remoteConfig, defaults) => {
      Object.assign(mockRemoteConfigStore, defaults);
      return Promise.resolve();
    }),
    fetchAndActivate: jest.fn(() => Promise.resolve(true)),
    getValue: jest.fn((_remoteConfig, key) => {
      const value = mockRemoteConfigStore[key];
      return {
        asNumber: () => (typeof value === "number" ? value : Number(value) || 0),
        asString: () => (value == null ? "" : String(value)),
        asBoolean: () => Boolean(value),
        getSource: () => (key in mockRemoteConfigStore ? "default" : "static"),
      };
    }),
  };
});

beforeEach(() => {
  for (const key of Object.keys(mockRemoteConfigStore)) {
    delete mockRemoteConfigStore[key];
  }
});
