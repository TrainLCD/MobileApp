import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import { Alert } from 'react-native';
import { ASYNC_STORAGE_KEYS } from '~/constants';
import { portraitModeEnabledAtom } from '~/store/atoms/experimental';
import ExperimentalSettingsScreen from './ExperimentalSettings';

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

const renderWithStore = (portraitModeEnabled: boolean) => {
  const store = createStore();
  store.set(portraitModeEnabledAtom, portraitModeEnabled);

  const screen = render(
    <Provider store={store}>
      <ExperimentalSettingsScreen />
    </Provider>
  );

  return { ...screen, store };
};

describe('ExperimentalSettingsScreen', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('ポートレートモードをONにするとatomとAsyncStorageへ保存される', () => {
    const { getByLabelText, store } = renderWithStore(false);

    fireEvent.press(getByLabelText('portraitModeTitle'));

    expect(store.get(portraitModeEnabledAtom)).toBe(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      ASYNC_STORAGE_KEYS.PORTRAIT_MODE_ENABLED,
      'true'
    );
  });

  it('ポートレートモードをOFFにするとatomとAsyncStorageへ保存される', () => {
    const { getByLabelText, store } = renderWithStore(true);

    fireEvent.press(getByLabelText('portraitModeTitle'));

    expect(store.get(portraitModeEnabledAtom)).toBe(false);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      ASYNC_STORAGE_KEYS.PORTRAIT_MODE_ENABLED,
      'false'
    );
  });

  it('AsyncStorageへの保存に失敗した場合はatom状態をロールバックしエラーを通知する', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(
      new Error('storage failure')
    );
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { getByLabelText, store } = renderWithStore(false);

    fireEvent.press(getByLabelText('portraitModeTitle'));

    // 楽観的更新で一度ONになる
    expect(store.get(portraitModeEnabledAtom)).toBe(true);

    // 保存失敗後にロールバックされる
    await waitFor(() => {
      expect(store.get(portraitModeEnabledAtom)).toBe(false);
    });

    // エラーログとユーザーへのアラート表示を検証
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to save portrait mode setting',
      expect.any(Error)
    );
    expect(alertSpy).toHaveBeenCalledWith(
      'errorTitle',
      'failedToSavePreference'
    );

    consoleErrorSpy.mockRestore();
    alertSpy.mockRestore();
  });
});
