import { fireEvent, render } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import { stationAtom } from '~/store/atoms/station';
import { createStation } from '~/utils/test/factories';
import { AgentEntryBanner } from './AgentEntryBanner';

// 実体はフォント読み込みで非同期 setState するため、act 警告を避けて素の View に差し替える
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: View };
});

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockIsAIAgentFeatureEnabled = jest.fn<boolean, []>();
jest.mock('~/lib/remoteConfig', () => ({
  isAIAgentFeatureEnabled: () => mockIsAIAgentFeatureEnabled(),
  subscribeRemoteConfig: () => () => undefined,
}));

jest.mock('~/translation', () => ({
  translate: (key: string) => key,
  isJapanese: true,
}));

const BANNER_LABEL = 'destinationAgentEntryTitle destinationAgentEntrySubtitle';

const renderBanner = (station: ReturnType<typeof createStation> | null) => {
  const store = createStore();
  store.set(stationAtom, station);
  return render(
    <Provider store={store}>
      <AgentEntryBanner />
    </Provider>
  );
};

describe('AgentEntryBanner', () => {
  beforeEach(() => {
    mockIsAIAgentFeatureEnabled.mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('現在駅が確定していればタップでAIチャットへ遷移する', () => {
    const { getByLabelText } = renderBanner(createStation(1130205));

    fireEvent.press(getByLabelText(BANNER_LABEL));

    expect(mockNavigate).toHaveBeenCalledWith('DestinationAgent');
  });

  it('現在駅が未確定ならタップしても遷移しない', () => {
    const { getByLabelText } = renderBanner(null);

    fireEvent.press(getByLabelText(BANNER_LABEL));

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('現在駅が未確定なら無効状態として読み上げられる', () => {
    const { getByLabelText } = renderBanner(null);

    expect(getByLabelText(BANNER_LABEL)).toBeDisabled();
  });

  it('フィーチャーフラグがoffならバナー自体を描画しない', () => {
    mockIsAIAgentFeatureEnabled.mockReturnValue(false);

    const { queryByLabelText } = renderBanner(createStation(1130205));

    expect(queryByLabelText(BANNER_LABEL)).toBeNull();
  });
});
