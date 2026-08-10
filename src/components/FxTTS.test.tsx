import { act, render } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import { useTTS } from '~/hooks/useTTS';
import { isTTSFeatureEnabled } from '~/lib/remoteConfig';
import speechState from '~/store/atoms/speech';
import { FxTTS } from './FxTTS';

jest.mock('~/utils/isDevApp', () => ({
  isDevApp: false,
}));

jest.mock('~/hooks/useTTS', () => ({
  useTTS: jest.fn(),
}));

// useTTSFeatureEnabled(useSyncExternalStore) が購読するリスナーを捕捉し、
// Remote Config 取得完了(キャッシュ更新)をテストから擬似的に発火できるようにする。
const mockRemoteConfigListeners = new Set<() => void>();
jest.mock('~/lib/remoteConfig', () => ({
  isTTSFeatureEnabled: jest.fn(() => true),
  subscribeRemoteConfig: jest.fn((listener: () => void) => {
    mockRemoteConfigListeners.add(listener);
    return () => {
      mockRemoteConfigListeners.delete(listener);
    };
  }),
}));

const mockedIsTTSFeatureEnabled = jest.mocked(isTTSFeatureEnabled);
const mockedUseTTS = jest.mocked(useTTS);

const emitRemoteConfigUpdate = () => {
  act(() => {
    for (const listener of mockRemoteConfigListeners) {
      listener();
    }
  });
};

const renderFxTTS = (enabled: boolean) => {
  const store = createStore();
  store.set(speechState, {
    enabled,
    backgroundEnabled: false,
    ttsEnabledLanguages: ['JA', 'EN'],
    monetizedPlanEnabled: false,
  });

  return render(
    <Provider store={store}>
      <FxTTS />
    </Provider>
  );
};

describe('FxTTS', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockRemoteConfigListeners.clear();
  });

  it.each`
    userEnabled | featureEnabled | shouldMount
    ${true}     | ${true}        | ${true}
    ${true}     | ${false}       | ${false}
    ${false}    | ${true}        | ${false}
    ${false}    | ${false}       | ${false}
  `(
    'ユーザー設定=$userEnabled / Remote Config=$featureEnabled のときマウント=$shouldMount',
    ({ userEnabled, featureEnabled, shouldMount }) => {
      mockedIsTTSFeatureEnabled.mockReturnValue(featureEnabled);

      renderFxTTS(userEnabled);

      if (shouldMount) {
        expect(mockedUseTTS).toHaveBeenCalled();
      } else {
        expect(mockedUseTTS).not.toHaveBeenCalled();
      }
    }
  );

  it('マウント後にRemote Configで無効化されるとアンマウントされる', () => {
    mockedIsTTSFeatureEnabled.mockReturnValue(true);

    renderFxTTS(true);

    expect(mockedUseTTS).toHaveBeenCalled();
    mockedUseTTS.mockClear();

    // 起動時の非同期取得が後からTTS無効(プラットフォーム別キーがfalse)を返したケースを再現する
    mockedIsTTSFeatureEnabled.mockReturnValue(false);
    emitRemoteConfigUpdate();

    expect(mockedUseTTS).not.toHaveBeenCalled();
  });

  it('マウント後にRemote Configで有効化されるとマウントされる', () => {
    mockedIsTTSFeatureEnabled.mockReturnValue(false);

    renderFxTTS(true);

    expect(mockedUseTTS).not.toHaveBeenCalled();

    mockedIsTTSFeatureEnabled.mockReturnValue(true);
    emitRemoteConfigUpdate();

    expect(mockedUseTTS).toHaveBeenCalled();
  });
});
