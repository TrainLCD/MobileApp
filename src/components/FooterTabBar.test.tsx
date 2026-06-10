import { fireEvent, render } from '@testing-library/react-native';
import FooterTabBar from './FooterTabBar';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('jotai', () => ({
  useAtomValue: jest.fn(() => false),
  atom: jest.fn((initialValue) => initialValue),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 34, left: 0 }),
}));

jest.mock('expo-glass-effect', () => {
  const { View } = require('react-native');
  return {
    GlassView: View,
    isLiquidGlassAvailable: jest.fn(() => false),
  };
});

// LIQUID_GLASS_AVAILABLE はモジュール読み込み時に確定するため、
// getter 経由でテストごとに切り替えられるようにする
let mockLiquidGlassAvailable = false;
jest.mock('~/utils/liquidGlass', () => ({
  get LIQUID_GLASS_AVAILABLE() {
    return mockLiquidGlassAvailable;
  },
}));

describe('FooterTabBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLiquidGlassAvailable = false;
  });

  it('visible=false の場合は何もレンダリングしない', () => {
    const { toJSON } = render(<FooterTabBar visible={false} />);
    expect(toJSON()).toBeNull();
  });

  it('検索・ホーム・設定の3つのタブボタンをレンダリングする', () => {
    const { getAllByRole } = render(<FooterTabBar active="home" />);
    expect(getAllByRole('button')).toHaveLength(3);
  });

  it('アクティブなタブに selected 状態が付与される', () => {
    const { getAllByRole } = render(<FooterTabBar active="settings" />);
    const [search, home, settings] = getAllByRole('button');
    expect(search.props.accessibilityState.selected).toBe(false);
    expect(home.props.accessibilityState.selected).toBe(false);
    expect(settings.props.accessibilityState.selected).toBe(true);
  });

  it('各タブを押すと対応する画面へ遷移する', () => {
    const { getAllByRole } = render(<FooterTabBar active="home" />);
    const [search, home, settings] = getAllByRole('button');

    fireEvent.press(search);
    expect(mockNavigate).toHaveBeenLastCalledWith('RouteSearch');

    fireEvent.press(home);
    expect(mockNavigate).toHaveBeenLastCalledWith('SelectLine');

    fireEvent.press(settings);
    expect(mockNavigate).toHaveBeenLastCalledWith('AppSettings');
  });

  describe('Liquid Glass モード', () => {
    beforeEach(() => {
      mockLiquidGlassAvailable = true;
    });

    it('アクティブタブの裏にピルが表示される', () => {
      const { getByTestId } = render(<FooterTabBar active="home" />);
      expect(getByTestId('footer-active-pill')).toBeTruthy();
    });

    it('ピルはアクティブタブにのみ表示される', () => {
      const { getAllByTestId } = render(<FooterTabBar active="search" />);
      expect(getAllByTestId('footer-active-pill')).toHaveLength(1);
    });
  });

  describe('従来バー（Liquid Glass 非対応）', () => {
    it('アクティブピルを表示しない', () => {
      const { queryByTestId } = render(<FooterTabBar active="home" />);
      expect(queryByTestId('footer-active-pill')).toBeNull();
    });
  });
});
