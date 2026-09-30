import { fireEvent, render } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import { stationAtom } from '~/store/atoms/station';
import { stationSearchModalVisibleAtom } from '~/store/atoms/stationSearchPrompt';
import { createStation } from '~/utils/test/factories';
import { CurrentStationPrompt } from './CurrentStationPrompt';

// 実体はフォント読み込みで非同期 setState するため、act 警告を避けて素の View に差し替える
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: View };
});

const mockIsAIAgentFeatureEnabled = jest.fn<boolean, []>();
jest.mock('~/lib/remoteConfig', () => ({
  isAIAgentFeatureEnabled: () => mockIsAIAgentFeatureEnabled(),
  subscribeRemoteConfig: () => () => undefined,
}));

jest.mock('~/translation', () => ({
  translate: (key: string) => key,
  isJapanese: true,
}));

const renderPrompt = (station: ReturnType<typeof createStation> | null) => {
  const store = createStore();
  store.set(stationAtom, station);
  const utils = render(
    <Provider store={store}>
      <CurrentStationPrompt />
    </Provider>
  );
  return { store, ...utils };
};

describe('CurrentStationPrompt', () => {
  beforeEach(() => {
    mockIsAIAgentFeatureEnabled.mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('現在駅が無ければタップで駅名検索モーダルを開く', () => {
    const { store, getByLabelText } = renderPrompt(null);

    fireEvent.press(
      getByLabelText('currentStationPromptTitle currentStationPromptSubtitle')
    );

    expect(store.get(stationSearchModalVisibleAtom)).toBe(true);
  });

  it('AI相談が無効なら説明文からAI相談を外す', () => {
    mockIsAIAgentFeatureEnabled.mockReturnValue(false);

    const { getByLabelText } = renderPrompt(null);

    expect(
      getByLabelText(
        'currentStationPromptTitle currentStationPromptSubtitleNoAI'
      )
    ).toBeTruthy();
  });

  it('現在駅が確定していれば描画しない', () => {
    const { queryByLabelText } = renderPrompt(createStation(1130205));

    expect(
      queryByLabelText('currentStationPromptTitle currentStationPromptSubtitle')
    ).toBeNull();
  });
});
