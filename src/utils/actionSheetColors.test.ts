import { DARK_APP_COLORS, LIGHT_APP_COLORS } from '~/constants/colorScheme';
import { getActionSheetColorOptions } from './actionSheetColors';

describe('getActionSheetColorOptions', () => {
  it('ライトでは外観だけを固定しスタイルは既定値のままにする', () => {
    expect(getActionSheetColorOptions(LIGHT_APP_COLORS)).toEqual({
      userInterfaceStyle: 'light',
    });
  });

  it('ダークでは外観とスタイルの両方を指定する', () => {
    expect(getActionSheetColorOptions(DARK_APP_COLORS)).toEqual({
      userInterfaceStyle: 'dark',
      containerStyle: { backgroundColor: DARK_APP_COLORS.card },
      textStyle: { color: DARK_APP_COLORS.text },
      titleTextStyle: { color: DARK_APP_COLORS.secondaryText },
      messageTextStyle: { color: DARK_APP_COLORS.secondaryText },
      separatorStyle: { backgroundColor: DARK_APP_COLORS.border },
    });
  });
});
