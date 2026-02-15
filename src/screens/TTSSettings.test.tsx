import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import { ASYNC_STORAGE_KEYS } from '~/constants';
import speechState, { type StationState } from '~/store/atoms/speech';
import TTSSettingsScreen from './TTSSettings';

jest.mock('~/utils/isDevApp', () => ({
  isDevApp: false,
}));

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
    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(
      ASYNC_STORAGE_KEYS.TTS_ENABLED_LANGUAGES,
      expect.any(String)
    );
  });
});
