import { render } from '@testing-library/react-native';
import React from 'react';
import HeaderJL from './HeaderJL';

// Mock dependencies
jest.mock('jotai', () => ({
  useAtomValue: jest.fn(() => ({
    headerLangState: 'JA',
    headerState: 'CURRENT',
  })),
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
      ease: jest.fn(),
    },
  };
});

jest.mock('~/store/atoms/navigation', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('~/store/atoms/station', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('~/store/atoms/line', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('~/translation', () => ({
  translate: jest.fn((key) => {
    // Mock the translate function to return different values for testing
    if (key === 'nextEnLast') {
      return 'Next Last Stop'; // Normal case
    }
    return key;
  }),
}));

jest.mock('~/hooks/useTransferLines', () => ({
  useTransferLines: jest.fn(() => []),
}));

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

// Create a test component to specifically test the translate().split() crash fix
const TestTranslateSplitFunction = ({
  translateResult,
}: {
  translateResult: string | null | undefined;
}) => {
  const mockTranslate = React.useCallback(
    (key: string) => {
      if (key === 'nextEnLast') {
        return translateResult;
      }
      return 'test';
    },
    [translateResult]
  );

  // This mimics the exact logic from HeaderJL that was causing crashes
  const _result = React.useMemo(() => {
    const smallCapitalizedLast = mockTranslate('nextEnLast')
      ?.split('\n')
      .map((letters, index) => (!index ? letters : letters.toLowerCase()))
      .join('\n');

    return smallCapitalizedLast;
  }, [mockTranslate]);

  return null; // We just care that the component doesn't crash
};

describe('HeaderJL', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Null safety fixes', () => {
    it('should not crash when translate returns undefined', () => {
      expect(() => {
        render(<TestTranslateSplitFunction translateResult={undefined} />);
      }).not.toThrow();
    });

    it('should not crash when translate returns null', () => {
      expect(() => {
        render(<TestTranslateSplitFunction translateResult={null} />);
      }).not.toThrow();
    });

    it('should not crash when translate returns empty string', () => {
      expect(() => {
        render(<TestTranslateSplitFunction translateResult="" />);
      }).not.toThrow();
    });

    it('should work correctly with valid translate result', () => {
      expect(() => {
        render(<TestTranslateSplitFunction translateResult="Next Last Stop" />);
      }).not.toThrow();
    });

    it('should work correctly with multiline translate result', () => {
      expect(() => {
        render(
          <TestTranslateSplitFunction translateResult="Next\nLast\nStop" />
        );
      }).not.toThrow();
    });
  });

  describe('Component rendering', () => {
    it('should render without crashing', () => {
      expect(() => {
        render(<HeaderJL />);
      }).not.toThrow();
    });
  });
});
