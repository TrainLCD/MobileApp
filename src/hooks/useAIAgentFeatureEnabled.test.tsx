import { renderHook } from '@testing-library/react-native';
import { useAIAgentFeatureEnabled } from './useAIAgentFeatureEnabled';

const mockIsAIAgentFeatureEnabled = jest.fn<boolean, []>();

jest.mock('~/lib/remoteConfig', () => ({
  isAIAgentFeatureEnabled: () => mockIsAIAgentFeatureEnabled(),
  subscribeRemoteConfig: () => () => undefined,
}));

describe('useAIAgentFeatureEnabled', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it.each([true, false])(
    'Remote Config が %s の場合はその値を返す',
    (enabled) => {
      mockIsAIAgentFeatureEnabled.mockReturnValue(enabled);

      const { result } = renderHook(() => useAIAgentFeatureEnabled());

      expect(result.current).toBe(enabled);
    }
  );
});
