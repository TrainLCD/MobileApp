import { render } from '@testing-library/react-native';
import { APP_THEME } from '~/models/Theme';
import Header from './Header';

// Mock dependencies
const mockUseCurrentStation = jest.fn();
const mockUseThemeStore = jest.fn();

jest.mock('~/hooks', () => ({
  useCurrentStation: () => mockUseCurrentStation(),
  useThemeStore: (selector: (state: unknown) => unknown) =>
    selector(mockUseThemeStore()),
}));

// Mock all Header components
jest.mock('./HeaderTokyoMetro', () => {
  const { View, Text } = require('react-native');
  return function MockHeaderTokyoMetro() {
    return (
      <View testID="HeaderTokyoMetro">
        <Text>HeaderTokyoMetro</Text>
      </View>
    );
  };
});

jest.mock('./HeaderJRWest', () => {
  const { View, Text } = require('react-native');
  return function MockHeaderJRWest() {
    return (
      <View testID="HeaderJRWest">
        <Text>HeaderJRWest</Text>
      </View>
    );
  };
});

jest.mock('./HeaderE235', () => {
  const { View, Text } = require('react-native');
  return function MockHeaderE235({ isJO }: { isJO: boolean }) {
    return (
      <View testID="HeaderE235">
        <Text>{isJO ? 'HeaderE235-JO' : 'HeaderE235-Yamanote'}</Text>
      </View>
    );
  };
});

jest.mock('./HeaderTY', () => {
  const { View, Text } = require('react-native');
  return function MockHeaderTY() {
    return (
      <View testID="HeaderTY">
        <Text>HeaderTY</Text>
      </View>
    );
  };
});

jest.mock('./HeaderSaikyo', () => {
  const { View, Text } = require('react-native');
  return function MockHeaderSaikyo() {
    return (
      <View testID="HeaderSaikyo">
        <Text>HeaderSaikyo</Text>
      </View>
    );
  };
});

jest.mock('./HeaderLED', () => {
  const { View, Text } = require('react-native');
  return function MockHeaderLED() {
    return (
      <View testID="HeaderLED">
        <Text>HeaderLED</Text>
      </View>
    );
  };
});

jest.mock('./HeaderJL', () => {
  const { View, Text } = require('react-native');
  return function MockHeaderJL() {
    return (
      <View testID="HeaderJL">
        <Text>HeaderJL</Text>
      </View>
    );
  };
});

jest.mock('./HeaderJRKyushu', () => {
  const { View, Text } = require('react-native');
  return function MockHeaderJRKyushu() {
    return (
      <View testID="HeaderJRKyushu">
        <Text>HeaderJRKyushu</Text>
      </View>
    );
  };
});

const mockStation = {
  id: 1,
  name: 'Test Station',
  nameRoman: 'Test Station',
  nameKatakana: 'テストステーション',
};

describe('Header', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentStation.mockReturnValue(mockStation);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('renders null when station is not available', () => {
    it('should return null when currentStation is undefined', () => {
      mockUseCurrentStation.mockReturnValue(undefined);
      mockUseThemeStore.mockReturnValue(APP_THEME.TOKYO_METRO);

      const { toJSON } = render(<Header />);
      expect(toJSON()).toBeNull();
    });

    it('should return null when currentStation is null', () => {
      mockUseCurrentStation.mockReturnValue(null);
      mockUseThemeStore.mockReturnValue(APP_THEME.YAMANOTE);

      const { toJSON } = render(<Header />);
      expect(toJSON()).toBeNull();
    });
  });

  describe('theme-based header selection', () => {
    it('should render HeaderTokyoMetro for TOKYO_METRO theme', () => {
      mockUseThemeStore.mockReturnValue(APP_THEME.TOKYO_METRO);

      const { getByTestId, getByText } = render(<Header />);
      expect(getByTestId('HeaderTokyoMetro')).toBeTruthy();
      expect(getByText('HeaderTokyoMetro')).toBeTruthy();
    });

    it('should render HeaderTokyoMetro for TOEI theme', () => {
      mockUseThemeStore.mockReturnValue(APP_THEME.TOEI);

      const { getByTestId, getByText } = render(<Header />);
      expect(getByTestId('HeaderTokyoMetro')).toBeTruthy();
      expect(getByText('HeaderTokyoMetro')).toBeTruthy();
    });

    it('should render HeaderJRWest for JR_WEST theme', () => {
      mockUseThemeStore.mockReturnValue(APP_THEME.JR_WEST);

      const { getByTestId, getByText } = render(<Header />);
      expect(getByTestId('HeaderJRWest')).toBeTruthy();
      expect(getByText('HeaderJRWest')).toBeTruthy();
    });

    it('should render HeaderE235 with isJO=false for YAMANOTE theme', () => {
      mockUseThemeStore.mockReturnValue(APP_THEME.YAMANOTE);

      const { getByTestId, getByText } = render(<Header />);
      expect(getByTestId('HeaderE235')).toBeTruthy();
      expect(getByText('HeaderE235-Yamanote')).toBeTruthy();
    });

    it('should render HeaderE235 with isJO=true for JO theme', () => {
      mockUseThemeStore.mockReturnValue(APP_THEME.JO);

      const { getByTestId, getByText } = render(<Header />);
      expect(getByTestId('HeaderE235')).toBeTruthy();
      expect(getByText('HeaderE235-JO')).toBeTruthy();
    });

    it('should render HeaderTY for TY theme', () => {
      mockUseThemeStore.mockReturnValue(APP_THEME.TY);

      const { getByTestId, getByText } = render(<Header />);
      expect(getByTestId('HeaderTY')).toBeTruthy();
      expect(getByText('HeaderTY')).toBeTruthy();
    });

    it('should render HeaderSaikyo for SAIKYO theme', () => {
      mockUseThemeStore.mockReturnValue(APP_THEME.SAIKYO);

      const { getByTestId, getByText } = render(<Header />);
      expect(getByTestId('HeaderSaikyo')).toBeTruthy();
      expect(getByText('HeaderSaikyo')).toBeTruthy();
    });

    it('should render HeaderLED for LED theme', () => {
      mockUseThemeStore.mockReturnValue(APP_THEME.LED);

      const { getByTestId, getByText } = render(<Header />);
      expect(getByTestId('HeaderLED')).toBeTruthy();
      expect(getByText('HeaderLED')).toBeTruthy();
    });

    it('should render HeaderJL for JL theme', () => {
      mockUseThemeStore.mockReturnValue(APP_THEME.JL);

      const { getByTestId, getByText } = render(<Header />);
      expect(getByTestId('HeaderJL')).toBeTruthy();
      expect(getByText('HeaderJL')).toBeTruthy();
    });

    it('should render HeaderJRKyushu for JR_KYUSHU theme', () => {
      mockUseThemeStore.mockReturnValue(APP_THEME.JR_KYUSHU);

      const { getByTestId, getByText } = render(<Header />);
      expect(getByTestId('HeaderJRKyushu')).toBeTruthy();
      expect(getByText('HeaderJRKyushu')).toBeTruthy();
    });

    it('should return null for unknown theme', () => {
      mockUseThemeStore.mockReturnValue('UNKNOWN_THEME');

      const { toJSON } = render(<Header />);
      expect(toJSON()).toBeNull();
    });
  });
});
