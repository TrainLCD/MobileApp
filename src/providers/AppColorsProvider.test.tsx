import { render } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import { StyleSheet } from 'react-native';
import Typography from '~/components/Typography';
import { DARK_APP_COLORS, LIGHT_APP_COLORS } from '~/constants/colorScheme';
import { COLOR_SCHEME_PREFERENCE } from '~/models/ColorScheme';
import { colorSchemePreferenceAtom } from '~/store/atoms/colorScheme';
import { AppColorsProvider } from './AppColorsProvider';

jest.mock('~/translation', () => ({
  translate: (key: string) => key,
  isJapanese: true,
}));

const renderWithDarkPreference = (ui: React.ReactElement) => {
  const store = createStore();
  store.set(colorSchemePreferenceAtom, COLOR_SCHEME_PREFERENCE.DARK);

  return render(<Provider store={store}>{ui}</Provider>);
};

const getColor = (element: { props: Record<string, unknown> }) =>
  (StyleSheet.flatten(element.props.style as never) as { color?: string })
    .color;

describe('AppColorsProvider', () => {
  it('配下のコンポーネントへダークの配色を配る', () => {
    const { getByText } = renderWithDarkPreference(
      <AppColorsProvider>
        <Typography>inside</Typography>
      </AppColorsProvider>
    );

    expect(getColor(getByText('inside'))).toBe(DARK_APP_COLORS.text);
  });

  // 走行画面(Main)は Provider の外側で描画されるため、
  // ダークモードを選んでも従来のライトの配色のままであることを保証する
  it('Providerの外側ではダークを選んでもライトの配色のままにする', () => {
    const { getByText } = renderWithDarkPreference(
      <Typography>outside</Typography>
    );

    expect(getColor(getByText('outside'))).toBe(LIGHT_APP_COLORS.text);
  });
});
