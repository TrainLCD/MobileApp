import { render } from '@testing-library/react-native';
import type React from 'react';
import HeaderJRKyushu from './HeaderJRKyushu';

// Mock dependencies
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
    Easing: {
      linear: jest.fn(),
    },
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

const mockStation = {
  id: 1,
  name: 'Test Station',
  nameRoman: 'Test Station',
  nameKatakana: 'テストステーション',
};

const mockLine = {
  id: 1,
  name: 'Test Line',
  color: '#E50012',
};

const mockNextStation = {
  id: 2,
  name: 'Next Station',
  nameRoman: 'Next Station',
  nameKatakana: 'ネクストステーション',
};

jest.mock('~/hooks', () => ({
  useCurrentStation: jest.fn(() => mockStation),
  useCurrentLine: jest.fn(() => mockLine),
  useNextStation: jest.fn(() => mockNextStation),
  useIsNextLastStop: jest.fn(() => false),
  useNumbering: jest.fn(() => [
    { stationNumber: 'JK01', lineSymbolShape: 'round' },
    null,
  ]),
  useBoundText: jest.fn(() => ({
    JA: '博多方面',
    EN: 'for Hakata',
    KANA: 'はかたほうめん',
  })),
  useConnectedLines: jest.fn(() => []),
  useCurrentTrainType: jest.fn(() => null),
  useFirstStop: jest.fn(() => null),
  useHeaderLangState: jest.fn(() => 'JA'),
  useHeaderStateText: jest.fn(() => ({
    stateText: '停車中',
    stateTextRight: '',
  })),
  useHeaderStationText: jest.fn(() => 'Test Station'),
  useLazyPrevious: jest.fn((value) => value),
  usePrevious: jest.fn((value) => value),
}));

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

jest.mock('~/utils/numbering', () => ({
  getNumberingColor: jest.fn(() => '#E50012'),
}));

jest.mock('~/utils/rfValue', () => ({
  RFValue: jest.fn((value) => value),
}));

jest.mock('./NumberingIcon', () => {
  const { View } = require('react-native');
  return function MockNumberingIcon() {
    return <View testID="NumberingIcon" />;
  };
});

jest.mock('./TrainTypeBoxJRKyushu', () => {
  const { View } = require('react-native');
  return function MockTrainTypeBoxJRKyushu() {
    return <View testID="TrainTypeBoxJRKyushu" />;
  };
});

describe('HeaderJRKyushu', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component rendering', () => {
    it('should render without crashing', () => {
      expect(() => {
        render(<HeaderJRKyushu />);
      }).not.toThrow();
    });

    it('should render TrainTypeBoxJRKyushu', () => {
      const { getByTestId } = render(<HeaderJRKyushu />);
      expect(getByTestId('TrainTypeBoxJRKyushu')).toBeTruthy();
    });
  });

  describe('Header state handling', () => {
    it('should handle CURRENT state', () => {
      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 }, arrived: false };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'CURRENT' };
        }
        if (atom === require('~/store/atoms/tuning').default) {
          return { headerTransitionDelay: 300 };
        }
        return {};
      });

      expect(() => {
        render(<HeaderJRKyushu />);
      }).not.toThrow();
    });

    it('should handle NEXT state', () => {
      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 }, arrived: false };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'NEXT' };
        }
        if (atom === require('~/store/atoms/tuning').default) {
          return { headerTransitionDelay: 300 };
        }
        return {};
      });

      expect(() => {
        render(<HeaderJRKyushu />);
      }).not.toThrow();
    });

    it('should handle ARRIVING state', () => {
      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 }, arrived: false };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'ARRIVING' };
        }
        if (atom === require('~/store/atoms/tuning').default) {
          return { headerTransitionDelay: 300 };
        }
        return {};
      });

      expect(() => {
        render(<HeaderJRKyushu />);
      }).not.toThrow();
    });

    it('should handle CURRENT_EN state', () => {
      const { useAtomValue } = require('jotai');
      const { useHeaderLangState } = require('~/hooks');
      useHeaderLangState.mockReturnValue('EN');

      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 }, arrived: false };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'CURRENT_EN' };
        }
        if (atom === require('~/store/atoms/tuning').default) {
          return { headerTransitionDelay: 300 };
        }
        return {};
      });

      expect(() => {
        render(<HeaderJRKyushu />);
      }).not.toThrow();
    });

    it('should handle NEXT_KANA state', () => {
      const { useAtomValue } = require('jotai');
      const { useHeaderLangState } = require('~/hooks');
      useHeaderLangState.mockReturnValue('KANA');

      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 }, arrived: false };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'NEXT_KANA' };
        }
        if (atom === require('~/store/atoms/tuning').default) {
          return { headerTransitionDelay: 300 };
        }
        return {};
      });

      expect(() => {
        render(<HeaderJRKyushu />);
      }).not.toThrow();
    });
  });

  describe('Connected lines handling', () => {
    it('should handle connected lines', () => {
      const { useConnectedLines } = require('~/hooks');
      useConnectedLines.mockReturnValue([
        { nameShort: 'Test Line (Test)' },
        { nameShort: 'Another Line' },
      ]);

      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 }, arrived: false };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'CURRENT' };
        }
        if (atom === require('~/store/atoms/tuning').default) {
          return { headerTransitionDelay: 300 };
        }
        return {};
      });

      expect(() => {
        render(<HeaderJRKyushu />);
      }).not.toThrow();
    });
  });

  describe('First stop handling', () => {
    it('should handle first stop scenario', () => {
      const { useFirstStop } = require('~/hooks');
      useFirstStop.mockReturnValue({ id: 1, name: 'First Station' });

      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 }, arrived: false };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'CURRENT' };
        }
        if (atom === require('~/store/atoms/tuning').default) {
          return { headerTransitionDelay: 300 };
        }
        return {};
      });

      expect(() => {
        render(<HeaderJRKyushu />);
      }).not.toThrow();
    });
  });

  describe('Last stop handling', () => {
    it('should handle last stop scenario', () => {
      const { useIsNextLastStop } = require('~/hooks');
      useIsNextLastStop.mockReturnValue(true);

      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 }, arrived: false };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'NEXT' };
        }
        if (atom === require('~/store/atoms/tuning').default) {
          return { headerTransitionDelay: 300 };
        }
        return {};
      });

      expect(() => {
        render(<HeaderJRKyushu />);
      }).not.toThrow();
    });
  });

  describe('Without selected bound', () => {
    it('should render correctly without selected bound', () => {
      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
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
      });

      expect(() => {
        render(<HeaderJRKyushu />);
      }).not.toThrow();
    });
  });

  describe('Numbering icon rendering', () => {
    it('should render numbering icon when station number exists', () => {
      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 }, arrived: false };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'CURRENT' };
        }
        if (atom === require('~/store/atoms/tuning').default) {
          return { headerTransitionDelay: 300 };
        }
        return {};
      });

      const { getByTestId } = render(<HeaderJRKyushu />);
      expect(getByTestId('NumberingIcon')).toBeTruthy();
    });

    it('should not render numbering icon when station number is missing', () => {
      const { useNumbering } = require('~/hooks');
      useNumbering.mockReturnValue([null, null]);

      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 }, arrived: false };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'CURRENT' };
        }
        if (atom === require('~/store/atoms/tuning').default) {
          return { headerTransitionDelay: 300 };
        }
        return {};
      });

      const { queryByTestId } = render(<HeaderJRKyushu />);
      expect(queryByTestId('NumberingIcon')).toBeNull();
    });
  });
});
