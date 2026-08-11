import { fireEvent, render } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import { STORAGE_KEYS } from '~/constants';
import { storage } from '~/lib/storage';
import { portraitModeEnabledAtom } from '~/store/atoms/experimental';
import tuningState from '~/store/atoms/tuning';
import {
  getDialogPresentationSnapshot,
  resetDialogPresentationForTests,
} from '~/utils/dialogPresentation';
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

const renderWithStore = (
  portraitModeEnabled: boolean,
  telemetryEnabled = false,
  untouchableModeEnabled = false
) => {
  const store = createStore();
  store.set(portraitModeEnabledAtom, portraitModeEnabled);
  store.set(tuningState, (prev) => ({
    ...prev,
    telemetryEnabled,
    untouchableModeEnabled,
  }));

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
    // アサーション失敗で個別のmockRestoreに到達しなくても、
    // spyOnした実装が後続テストへ漏れないようここで一括復元する
    jest.restoreAllMocks();
    resetDialogPresentationForTests();
  });

  it('ポートレートモードをONにするとatomとストレージへ保存される', () => {
    const { getByLabelText, store } = renderWithStore(false);

    fireEvent.press(getByLabelText('portraitModeTitle'));

    expect(store.get(portraitModeEnabledAtom)).toBe(true);
    expect(storage.getString(STORAGE_KEYS.PORTRAIT_MODE_ENABLED)).toBe('true');
  });

  it('ポートレートモードをOFFにするとatomとストレージへ保存される', () => {
    const { getByLabelText, store } = renderWithStore(true);

    fireEvent.press(getByLabelText('portraitModeTitle'));

    expect(store.get(portraitModeEnabledAtom)).toBe(false);
    expect(storage.getString(STORAGE_KEYS.PORTRAIT_MODE_ENABLED)).toBe('false');
  });

  it('ストレージへの保存に失敗した場合はatom状態をロールバックしエラーを通知する', () => {
    jest.spyOn(storage, 'set').mockImplementationOnce(() => {
      throw new Error('storage failure');
    });
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const { getByLabelText, store } = renderWithStore(false);

    fireEvent.press(getByLabelText('portraitModeTitle'));

    // 保存失敗後にロールバックされる（MMKVは同期APIのため即時）
    expect(store.get(portraitModeEnabledAtom)).toBe(false);

    // エラーログとユーザーへのダイアログ表示を検証
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to save portrait mode setting',
      expect.any(Error)
    );
    expect(getDialogPresentationSnapshot()).toMatchObject({
      visible: true,
      request: {
        title: 'errorTitle',
        message: 'failedToSavePreference',
      },
    });
  });

  it('ETA補助トグルは廃止され表示されない(自動有効化)', () => {
    const { queryByLabelText } = renderWithStore(false);

    expect(queryByLabelText('etaAssistTitle')).toBeNull();
  });

  it('テレメトリをONにするとatomとストレージへ保存される', () => {
    const { getByLabelText, store } = renderWithStore(false);

    fireEvent.press(getByLabelText('optInTelemetryTitle'));

    expect(store.get(tuningState).telemetryEnabled).toBe(true);
    expect(storage.getString(STORAGE_KEYS.TELEMETRY_ENABLED)).toBe('true');
  });

  it('テレメトリをOFFにするとatomとストレージへ保存される', () => {
    const { getByLabelText, store } = renderWithStore(false, true);

    fireEvent.press(getByLabelText('optInTelemetryTitle'));

    expect(store.get(tuningState).telemetryEnabled).toBe(false);
    expect(storage.getString(STORAGE_KEYS.TELEMETRY_ENABLED)).toBe('false');
  });

  it('テレメトリのストレージ保存に失敗した場合はatom状態をロールバックしエラーを通知する', () => {
    jest.spyOn(storage, 'set').mockImplementationOnce(() => {
      throw new Error('storage failure');
    });
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const { getByLabelText, store } = renderWithStore(false);

    fireEvent.press(getByLabelText('optInTelemetryTitle'));

    expect(store.get(tuningState).telemetryEnabled).toBe(false);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to save telemetry setting',
      expect.any(Error)
    );
    expect(getDialogPresentationSnapshot()).toMatchObject({
      visible: true,
      request: {
        title: 'errorTitle',
        message: 'failedToSavePreference',
      },
    });
  });

  it('タッチ不可モードをONにするとatomとストレージへ保存される', () => {
    const { getByLabelText, store } = renderWithStore(false);

    fireEvent.press(getByLabelText('untouchableModeTitle'));

    expect(store.get(tuningState).untouchableModeEnabled).toBe(true);
    expect(storage.getString(STORAGE_KEYS.UNTOUCHABLE_MODE_ENABLED)).toBe(
      'true'
    );
  });

  it('タッチ不可モードをOFFにするとatomとストレージへ保存される', () => {
    const { getByLabelText, store } = renderWithStore(false, false, true);

    fireEvent.press(getByLabelText('untouchableModeTitle'));

    expect(store.get(tuningState).untouchableModeEnabled).toBe(false);
    expect(storage.getString(STORAGE_KEYS.UNTOUCHABLE_MODE_ENABLED)).toBe(
      'false'
    );
  });

  it('タッチ不可モードのストレージ保存に失敗した場合はatom状態をロールバックしエラーを通知する', () => {
    jest.spyOn(storage, 'set').mockImplementationOnce(() => {
      throw new Error('storage failure');
    });
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const { getByLabelText, store } = renderWithStore(false);

    fireEvent.press(getByLabelText('untouchableModeTitle'));

    expect(store.get(tuningState).untouchableModeEnabled).toBe(false);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to save untouchable mode setting',
      expect.any(Error)
    );
    expect(getDialogPresentationSnapshot()).toMatchObject({
      visible: true,
      request: {
        title: 'errorTitle',
        message: 'failedToSavePreference',
      },
    });
  });
});
