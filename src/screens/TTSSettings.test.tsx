import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import { Linking, Platform } from 'react-native';
import { STATUS_URL, STORAGE_KEYS } from '~/constants';
import { isRemoteTTSEnabled, isTTSFeatureEnabled } from '~/lib/remoteConfig';
import { storage } from '~/lib/storage';
import {
  TTS_SPEED_PREFERENCE,
  type TTSSpeedPreference,
} from '~/models/TTSSpeed';
import speechState, {
  type StationState,
  ttsSpeedPreferenceAtom,
} from '~/store/atoms/speech';
import {
  getDialogPresentationSnapshot,
  resetDialogPresentationForTests,
} from '~/utils/dialogPresentation';
import TTSSettingsScreen from './TTSSettings';

jest.mock('~/utils/isDevApp', () => ({
  isDevApp: false,
}));

jest.mock('~/lib/remoteConfig', () => ({
  isTTSFeatureEnabled: jest.fn(() => true),
  isRemoteTTSEnabled: jest.fn(() => true),
  subscribeRemoteConfig: jest.fn(() => () => {}),
}));

const mockedIsTTSFeatureEnabled = jest.mocked(isTTSFeatureEnabled);
const mockedIsRemoteTTSEnabled = jest.mocked(isRemoteTTSEnabled);

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

const renderWithSpeechState = (
  speech: Partial<StationState>,
  speedPreference?: TTSSpeedPreference
) => {
  const store = createStore();
  store.set(speechState, {
    enabled: true,
    backgroundEnabled: false,
    ttsEnabledLanguages: ['JA', 'EN'],
    monetizedPlanEnabled: false,
    ...speech,
  });
  if (speedPreference) {
    store.set(ttsSpeedPreferenceAtom, speedPreference);
  }

  const screen = render(
    <Provider store={store}>
      <TTSSettingsScreen />
    </Provider>
  );

  return { ...screen, store };
};

// jest-expo の既定 Platform.OS は 'ios'。プラットフォーム別の案内を検証する際は
// 明示的に切り替え、afterEach で必ず元へ戻す。
const originalPlatformOS = Platform.OS;
const setPlatformOS = (os: typeof Platform.OS) => {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
};

describe('TTSSettingsScreen', () => {
  beforeEach(() => {
    mockedIsTTSFeatureEnabled.mockReturnValue(true);
    mockedIsRemoteTTSEnabled.mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
    resetDialogPresentationForTests();
    setPlatformOS(originalPlatformOS);
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

  describe('feature flag(プラットフォーム別TTSキー)がfalseの場合', () => {
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

    it('サービスステータスリンクを開けなかった場合はエラーダイアログを表示する', async () => {
      jest
        .spyOn(Linking, 'openURL')
        .mockRejectedValue(new Error('cannot open'));
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { getByText } = renderWithSpeechState({ enabled: true });

      fireEvent.press(getByText('serviceStatus'));

      await waitFor(() => {
        expect(getDialogPresentationSnapshot()).toMatchObject({
          visible: true,
          request: {
            title: 'errorTitle',
            message: 'failedToOpenLink',
          },
        });
      });
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  it('feature flagがtrueの場合はサービスステータスリンクを表示しない', () => {
    const { queryByText } = renderWithSpeechState({ enabled: true });

    expect(queryByText('ttsFeatureDisabledText')).toBeNull();
    expect(queryByText('serviceStatus')).toBeNull();
  });

  // 読み上げ経路がプラットフォームで異なるため、案内文の出し分けを固定する。
  // 音質案内はAndroidのTTSエンジン設定を指す内容なので、その設定を持たない
  // iOS・web へ漏れないことまで確認する。
  describe('アナウンス速度', () => {
    it('既定では「普通」が使用中になる', () => {
      const { getByLabelText } = renderWithSpeechState({ enabled: true });

      expect(
        getByLabelText('ttsSpeedNormal').props.accessibilityState
      ).toMatchObject({ checked: true, disabled: false });
      expect(
        getByLabelText('ttsSpeedSlow').props.accessibilityState
      ).toMatchObject({ checked: false });
      expect(
        getByLabelText('ttsSpeedFast').props.accessibilityState
      ).toMatchObject({ checked: false });
    });

    it('選択した速度を保存する', () => {
      const { getByLabelText, store } = renderWithSpeechState({
        enabled: true,
      });

      fireEvent.press(getByLabelText('ttsSpeedFast'));

      expect(store.get(ttsSpeedPreferenceAtom)).toBe(TTS_SPEED_PREFERENCE.FAST);
      expect(storage.getString(STORAGE_KEYS.TTS_SPEED_PREFERENCE)).toBe(
        TTS_SPEED_PREFERENCE.FAST
      );
    });

    it('保存済みの速度を選択状態として表示する', () => {
      const { getByLabelText } = renderWithSpeechState(
        { enabled: true },
        TTS_SPEED_PREFERENCE.SLOW
      );

      expect(
        getByLabelText('ttsSpeedSlow').props.accessibilityState
      ).toMatchObject({ checked: true });
      expect(
        getByLabelText('ttsSpeedNormal').props.accessibilityState
      ).toMatchObject({ checked: false });
    });

    it('端末内蔵TTSで読み上げる構成では速度設定を表示しない', () => {
      // 端末内蔵TTSは端末側の読み上げ速度設定に従うため、選ばせても反映されない
      mockedIsRemoteTTSEnabled.mockReturnValue(false);

      const { queryByLabelText, queryByText } = renderWithSpeechState({
        enabled: true,
      });

      expect(queryByLabelText('ttsSpeedNormal')).toBeNull();
      expect(queryByText('ttsSpeedTitle')).toBeNull();
    });

    it('TTSがOFFの時は速度を変更できない', () => {
      const { getByLabelText, store } = renderWithSpeechState({
        enabled: false,
      });

      fireEvent.press(getByLabelText('ttsSpeedFast'));

      expect(
        getByLabelText('ttsSpeedFast').props.accessibilityState
      ).toMatchObject({ checked: false, disabled: true });
      expect(store.get(ttsSpeedPreferenceAtom)).toBe(
        TTS_SPEED_PREFERENCE.NORMAL
      );
      expect(storage.contains(STORAGE_KEYS.TTS_SPEED_PREFERENCE)).toBe(false);
    });
  });

  describe('プラットフォーム別の案内表示', () => {
    const openTTSNoticeDialog = () => {
      const { getByLabelText } = renderWithSpeechState({ enabled: false });
      fireEvent.press(getByLabelText('toEnabled'));
    };

    it('[Android] 端末内蔵TTSの音質案内を表示する', () => {
      setPlatformOS('android');

      const { getByText } = renderWithSpeechState({ enabled: true });

      expect(getByText('ttsVoiceQualityNoticeAndroid')).toBeTruthy();
    });

    it('[iOS] リモート合成のため音質案内を表示しない', () => {
      setPlatformOS('ios');

      const { queryByText } = renderWithSpeechState({ enabled: true });

      expect(queryByText('ttsVoiceQualityNoticeAndroid')).toBeNull();
    });

    it('[web] Android固有の音質案内を表示しない', () => {
      setPlatformOS('web');

      const { queryByText } = renderWithSpeechState({ enabled: true });

      expect(queryByText('ttsVoiceQualityNoticeAndroid')).toBeNull();
    });

    it('[iOS] 有効化時の注意ダイアログはリモート合成向けの文言になる', () => {
      setPlatformOS('ios');

      openTTSNoticeDialog();

      expect(getDialogPresentationSnapshot()).toMatchObject({
        visible: true,
        request: { title: 'notice', message: 'ttsAlertTextIOS' },
      });
    });

    it('[Android] 有効化時の注意ダイアログは端末内蔵TTS向けの文言になる', () => {
      setPlatformOS('android');

      openTTSNoticeDialog();

      expect(getDialogPresentationSnapshot()).toMatchObject({
        visible: true,
        request: { title: 'notice', message: 'ttsAlertTextAndroid' },
      });
    });

    // webのexpo-speechもブラウザ・OSの読み上げ音声を使うため、Androidと同じ
    // 注意文で実態と合う（web専用キーは設けていない）
    it('[web] 有効化時の注意ダイアログは端末内蔵TTS向けの文言になる', () => {
      setPlatformOS('web');

      openTTSNoticeDialog();

      expect(getDialogPresentationSnapshot()).toMatchObject({
        visible: true,
        request: { title: 'notice', message: 'ttsAlertTextAndroid' },
      });
    });
  });
});
