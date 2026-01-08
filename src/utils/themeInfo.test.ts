import { APP_THEME, type AppTheme } from '~/models/Theme';
import { getThemeInfo } from './themeInfo';

jest.mock('~/translation', () => ({
  translate: jest.fn((key: string) => `translated:${key}`),
}));

describe('getThemeInfo', () => {
  const allThemes: AppTheme[] = [
    APP_THEME.TOKYO_METRO,
    APP_THEME.TOEI,
    APP_THEME.YAMANOTE,
    APP_THEME.JR_WEST,
    APP_THEME.TY,
    APP_THEME.SAIKYO,
    APP_THEME.LED,
    APP_THEME.JO,
    APP_THEME.JL,
    APP_THEME.JR_KYUSHU,
  ];

  it.each(allThemes)('%sテーマに対して正しい構造を返す', (theme) => {
    const themeInfo = getThemeInfo(theme);

    expect(themeInfo).toHaveProperty('description');
    expect(themeInfo).toHaveProperty('spImage');
    expect(themeInfo).toHaveProperty('tabletImage');
    expect(typeof themeInfo.description).toBe('string');
    expect(themeInfo.description).toBeTruthy();
  });

  it.each([
    [APP_THEME.TOKYO_METRO, 'themeDescriptionTokyoMetro'],
    [APP_THEME.TOEI, 'themeDescriptionToei'],
    [APP_THEME.YAMANOTE, 'themeDescriptionYamanote'],
    [APP_THEME.JR_WEST, 'themeDescriptionJrWest'],
    [APP_THEME.TY, 'themeDescriptionTy'],
    [APP_THEME.SAIKYO, 'themeDescriptionSaikyo'],
    [APP_THEME.LED, 'themeDescriptionLed'],
    [APP_THEME.JO, 'themeDescriptionJo'],
    [APP_THEME.JL, 'themeDescriptionJl'],
    [APP_THEME.JR_KYUSHU, 'themeDescriptionJrKyushu'],
  ])('%sテーマは正しい翻訳キーを使用する', (theme, expectedKey) => {
    const themeInfo = getThemeInfo(theme);

    expect(themeInfo.description).toBe(`translated:${expectedKey}`);
  });

  it('全てのテーマにプレビュー画像が設定されている', () => {
    for (const theme of allThemes) {
      const themeInfo = getThemeInfo(theme);

      expect(themeInfo.spImage).toBeDefined();
      expect(themeInfo.tabletImage).toBeDefined();
    }
  });
});
