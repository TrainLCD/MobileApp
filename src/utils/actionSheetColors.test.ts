import { DARK_APP_COLORS, LIGHT_APP_COLORS } from '~/constants/colorScheme';
import { getActionSheetColorOptions } from './actionSheetColors';

describe('getActionSheetColorOptions', () => {
  it('ライトでは外観だけを固定しスタイルは既定値のままにする', () => {
    expect(getActionSheetColorOptions(LIGHT_APP_COLORS, false)).toEqual({
      userInterfaceStyle: 'light',
    });
  });

  it('ダークでは外観とスタイルの両方を指定する', () => {
    expect(getActionSheetColorOptions(DARK_APP_COLORS, false)).toEqual({
      userInterfaceStyle: 'dark',
      containerStyle: { backgroundColor: DARK_APP_COLORS.card },
      textStyle: { color: DARK_APP_COLORS.text },
      titleTextStyle: { color: DARK_APP_COLORS.secondaryText },
      messageTextStyle: { color: DARK_APP_COLORS.secondaryText },
      separatorStyle: { backgroundColor: DARK_APP_COLORS.border },
    });
  });

  // 電光掲示板風テーマ中は導入前と同じく端末やライブラリの既定に任せる
  it('電光掲示板風テーマでは何も指定しない', () => {
    expect(getActionSheetColorOptions(LIGHT_APP_COLORS, true)).toEqual({});
    expect(getActionSheetColorOptions(DARK_APP_COLORS, true)).toEqual({});
  });
});
