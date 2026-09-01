import { fireEvent, render } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import { STORAGE_KEYS } from '~/constants';
import { storage } from '~/lib/storage';
import { COLOR_SCHEME_PREFERENCE } from '~/models/ColorScheme';
import { colorSchemePreferenceAtom } from '~/store/atoms/colorScheme';
import { portraitModeEnabledAtom } from '~/store/atoms/display';
import {
  getDialogPresentationSnapshot,
  resetDialogPresentationForTests,
} from '~/utils/dialogPresentation';
import ColorSchemeSettingsScreen from './ColorSchemeSettings';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
  }),
}));

jest.mock('~/components/FooterTabBar', () => () => null);
jest.mock('~/components/SettingsHeader', () => ({
  SettingsHeader: () => null,
}));
jest.mock('~/components/Button', () => () => null);
jest.mock('~/translation', () => ({
  translate: (key: string) => key,
}));

const renderWithStore = (
  preference = COLOR_SCHEME_PREFERENCE.AUTO as (typeof COLOR_SCHEME_PREFERENCE)[keyof typeof COLOR_SCHEME_PREFERENCE],
  portraitModeEnabled = false
) => {
  const store = createStore();
  store.set(colorSchemePreferenceAtom, preference);
  store.set(portraitModeEnabledAtom, portraitModeEnabled);

  const screen = render(
    <Provider store={store}>
      <ColorSchemeSettingsScreen />
    </Provider>
  );

  return { ...screen, store };
};

describe('ColorSchemeSettingsScreen', () => {
  afterEach(() => {
    jest.clearAllMocks();
    resetDialogPresentationForTests();
  });

  it('自動・ライト・ダークの3項目を表示する', () => {
    const { getByLabelText } = renderWithStore();

    expect(getByLabelText('colorSchemeAuto')).toBeTruthy();
    expect(getByLabelText('colorSchemeLight')).toBeTruthy();
    expect(getByLabelText('colorSchemeDark')).toBeTruthy();
  });

  it('現在の設定にチェックが入る', () => {
    const { getByLabelText } = renderWithStore(COLOR_SCHEME_PREFERENCE.DARK);

    expect(getByLabelText('colorSchemeDark').props.accessibilityState).toEqual(
      expect.objectContaining({ checked: true })
    );
    expect(getByLabelText('colorSchemeAuto').props.accessibilityState).toEqual(
      expect.objectContaining({ checked: false })
    );
  });

  it('ダークを選ぶとatomとストレージへ保存される', () => {
    const { getByLabelText, store } = renderWithStore();

    fireEvent.press(getByLabelText('colorSchemeDark'));

    expect(store.get(colorSchemePreferenceAtom)).toBe(
      COLOR_SCHEME_PREFERENCE.DARK
    );
    expect(storage.getString(STORAGE_KEYS.COLOR_SCHEME_PREFERENCE)).toBe(
      COLOR_SCHEME_PREFERENCE.DARK
    );
  });

  it('ポートレートモードをONにするとatomとストレージへ保存される', () => {
    const { getByLabelText, store } = renderWithStore();

    fireEvent.press(getByLabelText('portraitModeTitle'));

    expect(store.get(portraitModeEnabledAtom)).toBe(true);
    expect(storage.getString(STORAGE_KEYS.PORTRAIT_MODE_ENABLED)).toBe('true');
  });

  it('ポートレートモードをOFFにするとatomとストレージへ保存される', () => {
    const { getByLabelText, store } = renderWithStore(
      COLOR_SCHEME_PREFERENCE.AUTO,
      true
    );

    fireEvent.press(getByLabelText('portraitModeTitle'));

    expect(store.get(portraitModeEnabledAtom)).toBe(false);
    expect(storage.getString(STORAGE_KEYS.PORTRAIT_MODE_ENABLED)).toBe('false');
  });

  it('ポートレートモードの保存に失敗した場合はatom状態をロールバックしエラーを通知する', () => {
    // 画面はマウント時にも訴求フラグを書くため、対象キーの書き込みだけを落とす
    const setSpy = jest.spyOn(storage, 'set').mockImplementation((key) => {
      if (key === STORAGE_KEYS.PORTRAIT_MODE_ENABLED) {
        throw new Error('storage failure');
      }
    });
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const { getByLabelText, store } = renderWithStore();

    fireEvent.press(getByLabelText('portraitModeTitle'));

    expect(store.get(portraitModeEnabledAtom)).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to save portrait mode setting',
      expect.any(Error)
    );
    expect(getDialogPresentationSnapshot().request).toMatchObject({
      title: 'errorTitle',
      message: 'failedToSavePreference',
    });

    setSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('ストレージへの保存に失敗した場合はatom状態をロールバックしエラーを通知する', () => {
    const setSpy = jest.spyOn(storage, 'set').mockImplementation((key) => {
      if (key === STORAGE_KEYS.COLOR_SCHEME_PREFERENCE) {
        throw new Error('storage failure');
      }
    });
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const { getByLabelText, store } = renderWithStore();

    fireEvent.press(getByLabelText('colorSchemeLight'));

    expect(store.get(colorSchemePreferenceAtom)).toBe(
      COLOR_SCHEME_PREFERENCE.AUTO
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to save color scheme setting',
      expect.any(Error)
    );
    expect(getDialogPresentationSnapshot().request).toMatchObject({
      title: 'errorTitle',
      message: 'failedToSavePreference',
    });

    setSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});
