import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import { Alert, Linking } from 'react-native';
import { STATUS_URL, STORAGE_KEYS } from '~/constants';
import { isTTSFeatureEnabled } from '~/lib/remoteConfig';
import { storage } from '~/lib/storage';
import speechState, { type StationState } from '~/store/atoms/speech';
import TTSSettingsScreen from './TTSSettings';

jest.mock('~/utils/isDevApp', () => ({
  isDevApp: false,
}));

jest.mock('~/lib/remoteConfig', () => ({
  isTTSFeatureEnabled: jest.fn(() => true),
  subscribeRemoteConfig: jest.fn(() => () => {}),
}));

const mockedIsTTSFeatureEnabled = jest.mocked(isTTSFeatureEnabled);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
  }),
}));

jest.mock('react-native-app-clip', () => ({
  isClip: jest.fn(() => false),
}));

jest.mock('~/components/FooterTabBar', () => () => null);
jest.mock('~/components/SettingsHeader', () => ({
  SettingsHeader: () => null,
}));
jest.mock('~/components/Button', () => () => null);
jest.mock('~/translation', () => ({
  translate: (key: string) => key,
}));

const renderWithSpeechState = (speech: Partial<StationState>) => {
  const store = createStore();
  store.set(speechState, {
    enabled: true,
    backgroundEnabled: false,
    ttsEnabledLanguages: ['JA', 'EN'],
    monetizedPlanEnabled: false,
    ...speech,
  });

  const screen = render(
    <Provider store={store}>
      <TTSSettingsScreen />
    </Provider>
  );

  return { ...screen, store };
};

describe('TTSSettingsScreen', () => {
  beforeEach(() => {
    mockedIsTTSFeatureEnabled.mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('日本語をOFFにしても英語はONのままになる', () => {
    const { getByLabelText } = renderWithSpeechState({
      enabled: true,
      ttsEnabledLanguages: ['JA', 'EN'],
    });

    fireEvent.press(getByLabelText('japanese'));

    expect(getByLabelText('japanese').props.accessibilityState).toMatchObject({
      checked: false,
      disabled: false,
    });
    expect(getByLabelText('english').props.accessibilityState).toMatchObject({
      checked: true,
      disabled: true,
    });
  });

  it('TTSがOFFの時は言語トグルを無効化し設定保存しない', () => {
    const { getByLabelText, store } = renderWithSpeechState({
      enabled: false,
      ttsEnabledLanguages: ['JA', 'EN'],
    });

    fireEvent.press(getByLabelText('japanese'));

    expect(getByLabelText('japanese').props.accessibilityState).toMatchObject({
      checked: true,
      disabled: true,
    });
    expect(getByLabelText('english').props.accessibilityState).toMatchObject({
      checked: true,
      disabled: true,
    });
    expect(store.get(speechState).ttsEnabledLanguages).toEqual(['JA', 'EN']);
    expect(storage.contains(STORAGE_KEYS.TTS_ENABLED_LANGUAGES)).toBe(false);
  });

  describe('feature flag(tts_enabled)がfalseの場合', () => {
    beforeEach(() => {
      mockedIsTTSFeatureEnabled.mockReturnValue(false);
    });

    it('TTSトグルをOFF表示かつ無効化し設定を変更できない', () => {
      const { getByLabelText, store } = renderWithSpeechState({
        enabled: true,
      });

      const ttsToggle = getByLabelText('toEnabled');
      expect(ttsToggle.props.accessibilityState).toMatchObject({
        checked: false,
        disabled: true,
      });

      fireEvent.press(ttsToggle);

      // 保存済みのユーザー設定自体は破棄しない（フラグ復帰時に元へ戻る）
      expect(store.get(speechState).enabled).toBe(true);
      expect(storage.contains(STORAGE_KEYS.SPEECH_ENABLED)).toBe(false);
    });

    it('バックグラウンド再生・言語トグルも無効化される', () => {
      const { getByLabelText } = renderWithSpeechState({
        enabled: true,
        backgroundEnabled: true,
      });

      expect(
        getByLabelText('autoAnnounceBackgroundTitle').props.accessibilityState
      ).toMatchObject({ checked: false, disabled: true });
      expect(getByLabelText('japanese').props.accessibilityState).toMatchObject(
        { disabled: true }
      );
      expect(getByLabelText('english').props.accessibilityState).toMatchObject({
        disabled: true,
      });
    });

    it('利用不可の説明とサービスステータスリンクを表示しタップでブラウザを開く', () => {
      const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

      const { getByText } = renderWithSpeechState({ enabled: true });

      expect(getByText('ttsFeatureDisabledText')).toBeTruthy();

      fireEvent.press(getByText('serviceStatus'));

      expect(openURLSpy).toHaveBeenCalledWith(STATUS_URL);
    });

    it('サービスステータスリンクを開けなかった場合はエラーAlertを表示する', async () => {
      jest
        .spyOn(Linking, 'openURL')
        .mockRejectedValue(new Error('cannot open'));
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { getByText } = renderWithSpeechState({ enabled: true });

      fireEvent.press(getByText('serviceStatus'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('errorTitle', 'failedToOpenLink');
      });
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  it('feature flagがtrueの場合はサービスステータスリンクを表示しない', () => {
    const { queryByText } = renderWithSpeechState({ enabled: true });

    expect(queryByText('ttsFeatureDisabledText')).toBeNull();
    expect(queryByText('serviceStatus')).toBeNull();
  });
});
