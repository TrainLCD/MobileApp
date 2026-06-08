const ReactNative = require('react-native');
const linearTransition = {
  springify: () => linearTransition,
  damping: () => linearTransition,
  stiffness: () => linearTransition,
  mass: () => linearTransition,
  duration: () => linearTransition,
};

const ReanimatedMock = {
  View: ReactNative.View,
  Text: ReactNative.Text,
  Image: ReactNative.Image,
  ScrollView: ReactNative.ScrollView,
  FlatList: ReactNative.FlatList,
  createAnimatedComponent: (Component) => Component,
  useSharedValue: (initialValue) => ({ value: initialValue }),
  useDerivedValue: (updater) => ({ value: updater ? updater() : undefined }),
  useAnimatedStyle: (updater) => (updater ? updater() : {}),
  useAnimatedProps: (updater) => (updater ? updater() : {}),
  useAnimatedReaction: () => undefined,
  useAnimatedRef: () => ({ current: null }),
  useAnimatedScrollHandler: () => jest.fn(),
  useAnimatedGestureHandler: () => jest.fn(),
  LinearTransition: linearTransition,
  withTiming: (value) => value,
  withSpring: (value) => value,
  withDecay: (value) => value,
  withDelay: (_delayMs, value) => value,
  withRepeat: (value) => value,
  withSequence: (...values) => values.at(-1),
  cancelAnimation: () => undefined,
  interpolate: (value) => value,
  interpolateColor: (value) => value,
  runOnJS: (fn) => fn,
  runOnUI: (fn) => fn,
  measure: () => ({ x: 0, y: 0, width: 0, height: 0, pageX: 0, pageY: 0 }),
  Extrapolation: {
    CLAMP: 'clamp',
    EXTEND: 'extend',
    IDENTITY: 'identity',
  },
  Easing: {
    ease: () => 1,
    linear: () => 1,
    in: (fn) => fn,
    out: (fn) => fn,
    inOut: (fn) => fn,
    bezier: () => () => 1,
  },
  ReduceMotion: {
    System: 'system',
    Always: 'always',
    Never: 'never',
  },
};

module.exports = ReanimatedMock;
module.exports.default = ReanimatedMock;
