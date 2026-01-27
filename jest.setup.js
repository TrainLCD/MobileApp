jest.mock("@notifee/react-native", () => ({
  __esModule: true,
  default: {
    onBackgroundEvent: jest.fn(),
    displayNotification: jest.fn(),
    createChannel: jest.fn(),
    stopForegroundService: jest.fn(),
    getDisplayedNotifications: jest.fn(() => Promise.resolve([])),
  },
  AndroidForegroundServiceType: {
    FOREGROUND_SERVICE_TYPE_LOCATION: 8,
  },
  AndroidImportance: {
    LOW: 2,
  },
  EventType: {
    PRESS: 1,
    DISMISSED: 2,
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
