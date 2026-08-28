import { fireEvent, render } from '@testing-library/react-native';
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

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <Provider store={createStore()}>
      <AppColorsProvider>{ui}</AppColorsProvider>
    </Provider>
  );

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

  // 電光掲示板風テーマはダークモード設定の影響を受けない
  it('電光掲示板風テーマではダークを選んでも従来の配色を使う', () => {
    const { containerStyle, inputColor } = renderSearchBar({
      colorScheme: COLOR_SCHEME_PREFERENCE.DARK,
      led: true,
    });

    expect(containerStyle.backgroundColor).toBe('#333');
    expect(inputColor).toBe('white');
  });
});

// 種別の絞り込みなど、1 文字ごとに結果を更新する使い方を共通化した分の担保
describe('SearchBar（親が値を持つ使い方）', () => {
  it('渡した値を表示し、入力のたびに親へ通知する', () => {
    const onChangeText = jest.fn();
    const { getByTestId } = renderWithProviders(
      <SearchBar
        value="東上"
        onChangeText={onChangeText}
        testID="searchInput"
      />
    );

    expect(getByTestId('searchInput').props.value).toBe('東上');

    fireEvent.changeText(getByTestId('searchInput'), '東上線');

    expect(onChangeText).toHaveBeenCalledWith('東上線');
  });

  it('clearable では入力があるときだけクリアが出て、押すと空文字を通知する', () => {
    const onChangeText = jest.fn();
    const { queryByTestId } = renderWithProviders(
      <SearchBar value="" clearable clearButtonTestID="clear" />
    );
    expect(queryByTestId('clear')).toBeNull();

    const { getByTestId } = renderWithProviders(
      <SearchBar
        value="東上"
        onChangeText={onChangeText}
        clearable
        clearButtonTestID="clear"
      />
    );
    fireEvent.press(getByTestId('clear'));

    expect(onChangeText).toHaveBeenCalledWith('');
  });

  it('値を渡さないときは自前で入力を保持し、送信で現在の入力を渡す', () => {
    const onSearch = jest.fn();
    const { getByTestId } = renderWithProviders(
      <SearchBar onSearch={onSearch} testID="searchInput" />
    );

    fireEvent.changeText(getByTestId('searchInput'), '渋谷');
    fireEvent(getByTestId('searchInput'), 'submitEditing');

    expect(onSearch).toHaveBeenCalledWith('渋谷');
  });

  // iOS は autoCorrect={false}(autocorrectionType = .no) にすると日本語入力の
  // 変換候補バーごと消え、かなを漢字へ変換できなくなる。Android でも
  // TYPE_TEXT_FLAG_NO_SUGGESTIONS が立って候補が出なくなる。
  // 省略して既定に委ねると、New Architecture のビュー再利用で .no が残った
  // ビューを引き継ぐことがあるため、true を明示することまで含めて固定する
  it('日本語入力の変換候補を潰さないよう、オートコレクトを明示的に有効化する', () => {
    const { getByTestId } = renderWithProviders(
      <SearchBar testID="searchInput" />
    );

    expect(getByTestId('searchInput').props.autoCorrect).toBe(true);
  });
});
