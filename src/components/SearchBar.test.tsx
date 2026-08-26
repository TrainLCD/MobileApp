import { render } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import { StyleSheet, type ViewStyle } from 'react-native';
import { DARK_APP_COLORS } from '~/constants/colorScheme';
import { COLOR_SCHEME_PREFERENCE } from '~/models/ColorScheme';
import { THEME_PREFERENCE } from '~/models/Theme';
import { AppColorsProvider } from '~/providers/AppColorsProvider';
import { colorSchemePreferenceAtom } from '~/store/atoms/colorScheme';
import { themePreferenceAtom } from '~/store/atoms/theme';
import { SearchBar } from './SearchBar';

jest.mock('~/translation', () => ({
  translate: (key: string) => key,
  isJapanese: true,
}));

type Options = {
  colorScheme?: (typeof COLOR_SCHEME_PREFERENCE)[keyof typeof COLOR_SCHEME_PREFERENCE];
  led?: boolean;
};

const renderSearchBar = ({
  colorScheme = COLOR_SCHEME_PREFERENCE.LIGHT,
  led = false,
}: Options = {}) => {
  const store = createStore();
  store.set(colorSchemePreferenceAtom, colorScheme);
  store.set(
    themePreferenceAtom,
    led ? THEME_PREFERENCE.LED : THEME_PREFERENCE.TOKYO_METRO
  );

  const screen = render(
    <Provider store={store}>
      <AppColorsProvider>
        <SearchBar />
      </AppColorsProvider>
    </Provider>
  );

  const input = screen.getByPlaceholderText('routeSearchPlaceholder');
  // ルート要素が検索バーの外枠そのもの
  const container = screen.toJSON() as unknown as {
    props: { style: ViewStyle };
  };
  return {
    containerStyle: StyleSheet.flatten(container.props.style) as ViewStyle,
    inputColor: (StyleSheet.flatten(input.props.style) as { color?: string })
      .color,
  };
};

describe('SearchBar', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // 従来のライトの配色を変えていないことの回帰テスト
  it('ライトでは従来どおりの背景色と文字色を使う', () => {
    const { containerStyle, inputColor } = renderSearchBar();

    expect(containerStyle.backgroundColor).toBe('#FCFCFC');
    expect(inputColor).toBe('black');
  });

  it('ダークでは暗い背景色と明るい文字色を使う', () => {
    const { containerStyle, inputColor } = renderSearchBar({
      colorScheme: COLOR_SCHEME_PREFERENCE.DARK,
    });

    expect(containerStyle.backgroundColor).toBe(DARK_APP_COLORS.subtleSurface);
    expect(inputColor).toBe('white');
  });

  // LEDテーマはダークモード設定の影響を受けない
  it('LEDテーマではダークを選んでも従来のLEDの配色を使う', () => {
    const { containerStyle, inputColor } = renderSearchBar({
      colorScheme: COLOR_SCHEME_PREFERENCE.DARK,
      led: true,
    });

    expect(containerStyle.backgroundColor).toBe('#333');
    expect(inputColor).toBe('white');
  });
});
