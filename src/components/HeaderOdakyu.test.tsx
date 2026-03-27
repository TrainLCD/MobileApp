import { render } from '@testing-library/react-native';
import type React from 'react';
import { createMockHeaderProps } from '~/__fixtures__/headerProps';
import HeaderOdakyu from './HeaderOdakyu';

jest.mock('jotai', () => ({
  useAtomValue: jest.fn((atom) => {
    if (atom === require('~/store/atoms/station').default) {
      return { selectedBound: null, arrived: false };
    }
    if (atom === require('~/store/atoms/navigation').default) {
      return { headerState: 'CURRENT' };
    }
    if (atom === require('~/store/atoms/tuning').default) {
      return { headerTransitionDelay: 300 };
    }
    return {};
  }),
}));

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  return {
    ...Reanimated,
    useSharedValue: jest.fn(() => ({ value: 1 })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((value) => value),
    runOnJS: jest.fn((fn) => fn),
    Easing: { linear: jest.fn() },
  };
});

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('~/store/atoms/navigation', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('~/store/atoms/station', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('~/store/atoms/tuning', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('~/hooks', () => ({
  useCurrentStation: jest.fn(() => ({ id: 1, name: 'Test' })),
  useCurrentLine: jest.fn(() => ({ id: 1, name: 'Test', color: '#FF0000' })),
  useNextStation: jest.fn(() => ({ id: 2, name: 'Next' })),
  useIsNextLastStop: jest.fn(() => false),
  useNumbering: jest.fn(() => [null, null]),
  useBoundText: jest.fn(() => ({ JA: '', EN: '', KANA: '' })),
  useConnectedLines: jest.fn(() => []),
  useCurrentTrainType: jest.fn(() => null),
  useFirstStop: jest.fn(() => null),
  useHeaderLangState: jest.fn(() => 'JA'),
  useHeaderStateText: jest.fn(() => ({ stateText: '', stateTextRight: '' })),
  useHeaderStationText: jest.fn(() => 'Test'),
  useLazyPrevious: jest.fn((v) => v),
  usePrevious: jest.fn((v) => v),
  useHeaderAnimation: jest.fn(() => ({
    prevStationText: '',
    prevStateText: '',
    prevStateTextRight: '',
    prevBoundText: '',
    prevConnectionText: '',
    prevIsJapaneseState: true,
    stateTopAnimatedStyles: {},
    stateBottomAnimatedStyles: {},
    stateTopAnimatedStylesRight: {},
    stateBottomAnimatedStylesRight: {},
    topNameAnimatedAnchorStyle: {},
    bottomNameAnimatedAnchorStyle: {},
    topNameAnimatedStyles: {},
    bottomNameAnimatedStyles: {},
    boundTopAnimatedStyles: {},
    boundBottomAnimatedStyles: {},
  })),
}));

jest.mock('~/utils/isTablet', () => ({ __esModule: true, default: false }));
jest.mock('~/utils/numbering', () => ({
  getNumberingColor: jest.fn(() => '#FF0000'),
}));
jest.mock('~/utils/rfValue', () => ({ RFValue: jest.fn((v) => v) }));

jest.mock('./NumberingIcon', () => {
  const { View } = require('react-native');
  return function MockNumberingIcon() {
    return <View testID="NumberingIcon" />;
  };
});

jest.mock('./TrainTypeBox', () => {
  const { View } = require('react-native');
  const mock = jest.fn(() => <View testID="TrainTypeBox" />);
  return { __esModule: true, default: mock };
});

describe('HeaderOdakyu', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('クラッシュせずにレンダリングされる', () => {
    expect(() => {
      render(<HeaderOdakyu {...createMockHeaderProps()} />);
    }).not.toThrow();
  });

  it('TrainTypeBoxにデフォルトのpropsが渡される', () => {
    const TrainTypeBox = require('./TrainTypeBox').default;
    render(<HeaderOdakyu {...createMockHeaderProps()} />);
    expect(TrainTypeBox).toHaveBeenCalledWith(
      expect.objectContaining({
        localTypePrefix: '',
        nextTrainTypeColor: '#444',
      }),
      undefined
    );
  });
});
