import { fireEvent, render } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import { Alert } from 'react-native';
import { STORAGE_KEYS } from '~/constants';
import * as remoteConfigModule from '~/lib/remoteConfig';
import { storage } from '~/lib/storage';
import {
  etaAssistManualEnabledAtom,
  portraitModeEnabledAtom,
} from '~/store/atoms/experimental';
import tuningState from '~/store/atoms/tuning';
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
  etaAssistManualEnabled = false
) => {
  const store = createStore();
  store.set(portraitModeEnabledAtom, portraitModeEnabled);
  store.set(etaAssistManualEnabledAtom, etaAssistManualEnabled);
  store.set(tuningState, (prev) => ({ ...prev, telemetryEnabled }));

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
    const setSpy = jest.spyOn(storage, 'set').mockImplementationOnce(() => {
      throw new Error('storage failure');
    });
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { getByLabelText, store } = renderWithStore(false);

    fireEvent.press(getByLabelText('portraitModeTitle'));

    // 保存失敗後にロールバックされる（MMKVは同期APIのため即時）
    expect(store.get(portraitModeEnabledAtom)).toBe(false);

    // エラーログとユーザーへのアラート表示を検証
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to save portrait mode setting',
      expect.any(Error)
    );
    expect(alertSpy).toHaveBeenCalledWith(
      'errorTitle',
      'failedToSavePreference'
    );

    setSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    alertSpy.mockRestore();
  });

  it('Remote Config が許可していればETA補助をONにできる(atomとストレージへ保存)', () => {
    jest
      .spyOn(remoteConfigModule, 'isEtaAssistRemoteEnabled')
      .mockReturnValue(true);
    const { getByLabelText, store } = renderWithStore(false);

    fireEvent.press(getByLabelText('etaAssistTitle'));

    expect(store.get(etaAssistManualEnabledAtom)).toBe(true);
    expect(storage.getString(STORAGE_KEYS.ETA_ASSIST_MANUAL_ENABLED)).toBe(
      'true'
    );
  });

  it('Remote Config が許可していればETA補助をOFFにできる(atomとストレージへ保存)', () => {
    jest
      .spyOn(remoteConfigModule, 'isEtaAssistRemoteEnabled')
      .mockReturnValue(true);
    const { getByLabelText, store } = renderWithStore(false, false, true);

    fireEvent.press(getByLabelText('etaAssistTitle'));

    expect(store.get(etaAssistManualEnabledAtom)).toBe(false);
    expect(storage.getString(STORAGE_KEYS.ETA_ASSIST_MANUAL_ENABLED)).toBe(
      'false'
    );
  });

  it('Remote Config が false のときはETA補助トグルを操作できない', () => {
    jest
      .spyOn(remoteConfigModule, 'isEtaAssistRemoteEnabled')
      .mockReturnValue(false);
    const { getByLabelText, store } = renderWithStore(false);

    // 操作不可(disabled)。押してもatomはONにならず、ONの永続化も走らない。
    fireEvent.press(getByLabelText('etaAssistTitle'));

    expect(store.get(etaAssistManualEnabledAtom)).toBe(false);
    expect(storage.getString(STORAGE_KEYS.ETA_ASSIST_MANUAL_ENABLED)).not.toBe(
      'true'
    );
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
    const setSpy = jest.spyOn(storage, 'set').mockImplementationOnce(() => {
      throw new Error('storage failure');
    });
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { getByLabelText, store } = renderWithStore(false);

    fireEvent.press(getByLabelText('optInTelemetryTitle'));

    expect(store.get(tuningState).telemetryEnabled).toBe(false);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to save telemetry setting',
      expect.any(Error)
    );
    expect(alertSpy).toHaveBeenCalledWith(
      'errorTitle',
      'failedToSavePreference'
    );

    setSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    alertSpy.mockRestore();
  });
});
