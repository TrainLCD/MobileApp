import { render } from '@testing-library/react-native';
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

jest.mock('~/lib/remoteConfig', () => ({
  isTTSFeatureEnabled: jest.fn(() => true),
}));

const mockedIsTTSFeatureEnabled = jest.mocked(isTTSFeatureEnabled);
const mockedUseTTS = jest.mocked(useTTS);

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
});
