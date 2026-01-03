import { render } from '@testing-library/react-native';
import type React from 'react';
import { createMockHeaderProps } from '~/__fixtures__/headerProps';
import HeaderLED from './HeaderLED';

// Mock dependencies
jest.mock('jotai', () => ({
  useAtomValue: jest.fn((atom) => {
    if (atom === require('~/store/atoms/station').default) {
      return { selectedBound: null };
    }
    if (atom === require('~/store/atoms/navigation').default) {
      return { headerState: 'CURRENT' };
    }
    return {};
  }),
}));

jest.mock('~/store/atoms/navigation', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('~/store/atoms/station', () => ({
  __esModule: true,
  default: {},
}));

const mockStation = {
  id: 1,
  name: 'Test Station',
  nameRoman: 'Test Station',
  nameKatakana: 'テストステーション',
};

const mockNextStation = {
  id: 2,
  name: 'Next Station',
  nameRoman: 'Next Station',
  nameKatakana: 'ネクストステーション',
};

jest.mock('~/hooks', () => ({
  useCurrentStation: jest.fn(() => mockStation),
  useNextStation: jest.fn(() => mockNextStation),
  useIsNextLastStop: jest.fn(() => false),
  useNumbering: jest.fn(() => [
    { stationNumber: 'JY01', lineSymbolShape: 'round' },
    null,
  ]),
}));

jest.mock('~/translation', () => ({
  translate: jest.fn((key) => {
    const translations: Record<string, string> = {
      nowStoppingAt: '停車中',
      soon: 'まもなく',
      soonLast: 'まもなく終点',
      soonEn: 'Arriving at',
      soonEnLast: 'Arriving at terminal',
      next: '次は',
      nextLast: '次は終点',
      nextEn: 'Next',
      nextEnLast: 'Next terminal',
    };
    return translations[key] || key;
  }),
}));

jest.mock('./Typography', () => {
  const { Text } = require('react-native');
  return function MockTypography({
    children,
    style,
  }: {
    children: React.ReactNode;
    style?: unknown;
  }) {
    return <Text style={style}>{children}</Text>;
  };
});

describe('HeaderLED', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component rendering', () => {
    it('should render without crashing', () => {
      expect(() => {
        render(<HeaderLED {...createMockHeaderProps()} />);
      }).not.toThrow();
    });

    it('should render with station name', () => {
      const { getByText } = render(<HeaderLED {...createMockHeaderProps()} />);
      // Station name is split into individual characters for Japanese
      expect(getByText('新')).toBeTruthy();
    });
  });

  describe('Header state handling', () => {
    it('should handle CURRENT state', () => {
      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 } };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'CURRENT' };
        }
        return {};
      });

      expect(() => {
        render(<HeaderLED {...createMockHeaderProps()} />);
      }).not.toThrow();
    });

    it('should handle NEXT state', () => {
      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 } };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'NEXT' };
        }
        return {};
      });

      expect(() => {
        render(<HeaderLED {...createMockHeaderProps()} />);
      }).not.toThrow();
    });

    it('should handle ARRIVING state', () => {
      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 } };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'ARRIVING' };
        }
        return {};
      });

      expect(() => {
        render(<HeaderLED {...createMockHeaderProps()} />);
      }).not.toThrow();
    });

    it('should handle CURRENT_EN state', () => {
      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 } };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'CURRENT_EN' };
        }
        return {};
      });

      expect(() => {
        render(<HeaderLED {...createMockHeaderProps()} />);
      }).not.toThrow();
    });

    it('should handle NEXT_EN state', () => {
      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 } };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'NEXT_EN' };
        }
        return {};
      });

      expect(() => {
        render(<HeaderLED {...createMockHeaderProps()} />);
      }).not.toThrow();
    });

    it('should handle ARRIVING_KANA state', () => {
      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 } };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'ARRIVING_KANA' };
        }
        return {};
      });

      expect(() => {
        render(<HeaderLED {...createMockHeaderProps()} />);
      }).not.toThrow();
    });

    it('should handle NEXT_KANA state', () => {
      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 } };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'NEXT_KANA' };
        }
        return {};
      });

      expect(() => {
        render(<HeaderLED {...createMockHeaderProps()} />);
      }).not.toThrow();
    });

    it('should handle CURRENT_KANA state', () => {
      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 } };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'CURRENT_KANA' };
        }
        return {};
      });

      expect(() => {
        render(<HeaderLED {...createMockHeaderProps()} />);
      }).not.toThrow();
    });

    it('should handle ARRIVING_EN state', () => {
      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 } };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'ARRIVING_EN' };
        }
        return {};
      });

      expect(() => {
        render(<HeaderLED {...createMockHeaderProps()} />);
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
          return { selectedBound: { id: 1 } };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'NEXT' };
        }
        return {};
      });

      expect(() => {
        render(<HeaderLED {...createMockHeaderProps()} />);
      }).not.toThrow();
    });
  });

  describe('Without selected bound', () => {
    it('should render correctly without selected bound', () => {
      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: null };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'CURRENT' };
        }
        return {};
      });

      expect(() => {
        render(<HeaderLED {...createMockHeaderProps()} />);
      }).not.toThrow();
    });
  });
});
