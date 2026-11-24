import { render } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import { StyleSheet, type TextStyle } from 'react-native';
import { FONTS } from '../constants';
import { APP_THEME, type AppTheme } from '../models/Theme';
import { themePreferenceAtom } from '../store/atoms/theme';
import Typography from './Typography';

const renderStyle = (theme: AppTheme, style?: TextStyle) => {
  const store = createStore();
  store.set(themePreferenceAtom, theme);
  const { getByText } = render(
    <Provider store={store}>
      <Typography style={style}>東京</Typography>
    </Provider>
  );
  return StyleSheet.flatten(getByText('東京').props.style);
};

describe('Typography', () => {
  it('leaves the font family unset for regular and bold text outside LED', () => {
    expect(renderStyle(APP_THEME.JR_315).fontFamily).toBeUndefined();
    const style = renderStyle(APP_THEME.JR_315, { fontWeight: 'bold' });
    expect(style.fontFamily).toBeUndefined();
    expect(style.fontWeight).toBe('bold');
  });

  it('uses the normal-weight dot font for LED', () => {
    expect(renderStyle(APP_THEME.LED, { fontWeight: 'bold' })).toMatchObject({
      fontFamily: FONTS.JFDotJiskan24h,
      fontWeight: 'normal',
    });
  });

  it.each([APP_THEME.JR_315, APP_THEME.LED])(
    'preserves an explicit font family for %s',
    (theme) => {
      expect(renderStyle(theme, { fontFamily: 'custom' }).fontFamily).toBe(
        'custom'
      );
    }
  );
});
