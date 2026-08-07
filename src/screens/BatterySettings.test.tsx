import { fireEvent, render } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import { STORAGE_KEYS } from '~/constants';
import { storage } from '~/lib/storage';
import { powerSavingLocationEnabledAtom } from '~/store/atoms/battery';
import {
  getDialogPresentationSnapshot,
  resetDialogPresentationForTests,
} from '~/utils/dialogPresentation';
import BatterySettingsScreen from './BatterySettings';

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

const renderWithStore = (powerSavingLocationEnabled = false) => {
  const store = createStore();
  store.set(powerSavingLocationEnabledAtom, powerSavingLocationEnabled);

  const screen = render(
    <Provider store={store}>
      <BatterySettingsScreen />
    </Provider>
  );

  return { ...screen, store };
};

describe('BatterySettingsScreen', () => {
  afterEach(() => {
    jest.clearAllMocks();
    resetDialogPresentationForTests();
  });

  it('省電力測位モードをONにするとatomとストレージへ保存される', () => {
    const { getByLabelText, store } = renderWithStore(false);

    fireEvent.press(getByLabelText('powerSavingLocationTitle'));

    expect(store.get(powerSavingLocationEnabledAtom)).toBe(true);
    expect(storage.getString(STORAGE_KEYS.POWER_SAVING_LOCATION_ENABLED)).toBe(
      'true'
    );
  });

  it('省電力測位モードをOFFにするとatomとストレージへ保存される', () => {
    const { getByLabelText, store } = renderWithStore(true);

    fireEvent.press(getByLabelText('powerSavingLocationTitle'));

    expect(store.get(powerSavingLocationEnabledAtom)).toBe(false);
    expect(storage.getString(STORAGE_KEYS.POWER_SAVING_LOCATION_ENABLED)).toBe(
      'false'
    );
  });

  it('ストレージへの保存に失敗した場合はatom状態をロールバックしエラーを通知する', () => {
    const setSpy = jest.spyOn(storage, 'set').mockImplementationOnce(() => {
      throw new Error('storage failure');
    });
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const { getByLabelText, store } = renderWithStore(false);

    fireEvent.press(getByLabelText('powerSavingLocationTitle'));

    // 保存失敗後にロールバックされる（MMKVは同期APIのため即時）
    expect(store.get(powerSavingLocationEnabledAtom)).toBe(false);

    // エラーログとユーザーへのダイアログ表示を検証
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to save power saving location setting',
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
