import { isClip } from 'react-native-app-clip';
import { APP_THEME } from '~/models/Theme';

jest.mock('react-native-app-clip', () => ({
  isClip: jest.fn(() => false),
}));

jest.mock('~/translation', () => ({
  translate: (key: string) => key,
  isJapanese: false,
}));

const mockedIsClip = jest.mocked(isClip);

// isDevApp は import 時に評価される定数のため、テストごとにモック値を変えて
// モジュールを読み直す
const loadThemes = (isDevApp: boolean) => {
  let themes: ReturnType<typeof import('./theme').getSettingsThemes> = [];
  jest.isolateModules(() => {
    jest.doMock('./isDevApp', () => ({ isDevApp }));
    themes = require('./theme').getSettingsThemes();
  });
  return themes;
};

describe('getSettingsThemes', () => {
  beforeEach(() => {
    mockedIsClip.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('本番ビルドでは devOnly なテーマを一覧に含めない', () => {
    const themes = loadThemes(false);
    expect(themes.some((t) => t.devOnly)).toBe(false);
    expect(themes.some((t) => t.value === APP_THEME.LOW_POWER)).toBe(false);
  });

  it('カナリア版では devOnly なテーマも一覧に含める', () => {
    const themes = loadThemes(true);
    expect(themes.some((t) => t.value === APP_THEME.LOW_POWER)).toBe(true);
  });

  it('本番ビルドでも devOnly でないテーマは一覧に残る', () => {
    const themes = loadThemes(false);
    expect(themes.some((t) => t.value === APP_THEME.TOKYO_METRO)).toBe(true);
    expect(themes.some((t) => t.value === APP_THEME.LED)).toBe(true);
  });

  it('App Clip では LED テーマを一覧に含めない', () => {
    mockedIsClip.mockReturnValue(true);
    const themes = loadThemes(false);
    expect(themes.some((t) => t.value === APP_THEME.LED)).toBe(false);
  });
});
