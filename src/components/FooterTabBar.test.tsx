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
    mockLiquidGlassAvailable = false;
  });

  afterEach(() => {
    jest.clearAllMocks();
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

    const layoutEvent = (x: number) => ({
      nativeEvent: { layout: { x, y: 8, width: 48, height: 48 } },
    });

    // ピルとタブボタンの onLayout を発火させ、ピル配置ロジックを通す
    const fireBarLayouts = (api: ReturnType<typeof render>) => {
      fireEvent(api.getByTestId('footer-active-pill'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 8, width: 48, height: 48 } },
      });
      const [search, home, settings] = api.getAllByRole('button');
      fireEvent(search, 'layout', layoutEvent(20));
      fireEvent(home, 'layout', layoutEvent(84));
      fireEvent(settings, 'layout', layoutEvent(148));
    };

    it('タブバー全体で共有ピルが1つだけ表示される', () => {
      const { getAllByTestId } = render(<FooterTabBar active="home" />);
      expect(getAllByTestId('footer-active-pill')).toHaveLength(1);
    });

    it('レイアウト確定後もピルは1つのまま維持される', () => {
      const api = render(<FooterTabBar active="home" />);
      fireBarLayouts(api);
      expect(api.getAllByTestId('footer-active-pill')).toHaveLength(1);
    });

    it('別タブがアクティブなバーを再マウントしてもクラッシュしない（スライド経路）', () => {
      // 画面遷移によるタブバーの再マウントを模す。1 回目で lastActiveTab が
      // 記録され、2 回目のマウントでスライド配置の分岐を通る
      const first = render(<FooterTabBar active="home" />);
      fireBarLayouts(first);
      first.unmount();

      const second = render(<FooterTabBar active="search" />);
      fireBarLayouts(second);
      expect(second.getAllByTestId('footer-active-pill')).toHaveLength(1);
    });
  });

  describe('従来バー（Liquid Glass 非対応）', () => {
    it('アクティブピルを表示しない', () => {
      const { queryByTestId } = render(<FooterTabBar active="home" />);
      expect(queryByTestId('footer-active-pill')).toBeNull();
    });
  });
});
