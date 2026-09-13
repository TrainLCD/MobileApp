import { fireEvent, render } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import { STORAGE_KEYS } from '~/constants';
import {
  getRemoteTTSOverride,
  REMOTE_TTS_OVERRIDE,
  resetRemoteTTSOverrideForTests,
} from '~/lib/remoteTTSOverride';
import { storage } from '~/lib/storage';
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
  telemetryEnabled = false,
  untouchableModeEnabled = false
) => {
  const store = createStore();
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
    resetRemoteTTSOverrideForTests();
  });

  it('ポートレートモードのトグルは外観設定へ移設され表示されない', () => {
    const { queryByLabelText } = renderWithStore();

    expect(queryByLabelText('portraitModeTitle')).toBeNull();
  });

  it('ETA補助トグルは廃止され表示されない(自動有効化)', () => {
    const { queryByLabelText } = renderWithStore();

    expect(queryByLabelText('etaAssistTitle')).toBeNull();
  });

  it('テレメトリをONにするとatomとストレージへ保存される', () => {
    const { getByLabelText, store } = renderWithStore();

    fireEvent.press(getByLabelText('optInTelemetryTitle'));

    expect(store.get(tuningState).telemetryEnabled).toBe(true);
    expect(storage.getString(STORAGE_KEYS.TELEMETRY_ENABLED)).toBe('true');
  });

  it('テレメトリをOFFにするとatomとストレージへ保存される', () => {
    const { getByLabelText, store } = renderWithStore(true);

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
    const { getByLabelText, store } = renderWithStore();

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
    const { getByLabelText, store } = renderWithStore();

    fireEvent.press(getByLabelText('untouchableModeTitle'));

    expect(store.get(tuningState).untouchableModeEnabled).toBe(true);
    expect(storage.getString(STORAGE_KEYS.UNTOUCHABLE_MODE_ENABLED)).toBe(
      'true'
    );
  });

  it('タッチ不可モードをOFFにするとatomとストレージへ保存される', () => {
    const { getByLabelText, store } = renderWithStore(false, true);

    fireEvent.press(getByLabelText('untouchableModeTitle'));

    expect(store.get(tuningState).untouchableModeEnabled).toBe(false);
    expect(storage.getString(STORAGE_KEYS.UNTOUCHABLE_MODE_ENABLED)).toBe(
      'false'
    );
  });

  it('リモートTTSの強制切替は既定で自動が使用中になっている', () => {
    const { getByLabelText } = renderWithStore();

    expect(
      getByLabelText('remoteTTSOverrideAuto').props.accessibilityState.checked
    ).toBe(true);
    expect(
      getByLabelText('remoteTTSOverrideOn').props.accessibilityState.checked
    ).toBe(false);
  });

  it('リモートTTSを強制的に有効にすると保存され表示も切り替わる', () => {
    const { getByLabelText } = renderWithStore();

    fireEvent.press(getByLabelText('remoteTTSOverrideOn'));

    expect(getRemoteTTSOverride()).toBe(REMOTE_TTS_OVERRIDE.ON);
    expect(storage.getString(STORAGE_KEYS.REMOTE_TTS_OVERRIDE)).toBe('on');
    expect(
      getByLabelText('remoteTTSOverrideOn').props.accessibilityState.checked
    ).toBe(true);
  });

  it('リモートTTSを強制的に無効にすると保存される', () => {
    const { getByLabelText } = renderWithStore();

    fireEvent.press(getByLabelText('remoteTTSOverrideOff'));

    expect(getRemoteTTSOverride()).toBe(REMOTE_TTS_OVERRIDE.OFF);
    expect(storage.getString(STORAGE_KEYS.REMOTE_TTS_OVERRIDE)).toBe('off');
  });

  it('リモートTTSの強制切替の保存に失敗した場合はエラーを通知し値を進めない', () => {
    jest.spyOn(storage, 'set').mockImplementationOnce(() => {
      throw new Error('storage failure');
    });
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const { getByLabelText } = renderWithStore();

    fireEvent.press(getByLabelText('remoteTTSOverrideOn'));

    expect(getRemoteTTSOverride()).toBe(REMOTE_TTS_OVERRIDE.AUTO);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to save remote TTS override setting',
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

  it('タッチ不可モードのストレージ保存に失敗した場合はatom状態をロールバックしエラーを通知する', () => {
    jest.spyOn(storage, 'set').mockImplementationOnce(() => {
      throw new Error('storage failure');
    });
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const { getByLabelText, store } = renderWithStore();

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
