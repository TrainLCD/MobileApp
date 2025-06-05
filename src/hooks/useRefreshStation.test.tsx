import { renderHook } from '@testing-library/react-native';
import { Provider } from 'jotai';
import * as useCanGoForwardModule from '~/hooks/useCanGoForward';
import * as useLocationStoreModule from '~/hooks/useLocationStore';
import * as useNearestStationModule from '~/hooks/useNearestStation';
import * as useNextStationModule from '~/hooks/useNextStation';
import { useRefreshStation } from '~/hooks/useRefreshStation';
import * as useThresholdModule from '~/hooks/useThreshold';

const mockStation = {
  id: 1,
  name: 'Test Station',
  nameRoman: 'Test Station',
  latitude: 35.0,
  longitude: 135.0,
  stationNumbers: [{ stationNumber: 'T01' }],
};

describe('useRefreshStation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(global.Date, 'now').mockImplementation(() => 100000);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('runs without crashing with basic mocks', () => {
    jest
      .spyOn(useLocationStoreModule, 'useLocationStore')
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      .mockImplementation((fn: any) =>
        fn({
          coords: { latitude: 35.0, longitude: 135.0, speed: 0, accuracy: 5 },
        })
      );

    jest
      .spyOn(useNearestStationModule, 'useNearestStation')
      .mockReturnValue(mockStation);
    jest
      .spyOn(useNextStationModule, 'useNextStation')
      .mockReturnValue(mockStation);
    jest.spyOn(useCanGoForwardModule, 'useCanGoForward').mockReturnValue(true);
    jest.spyOn(useThresholdModule, 'useThreshold').mockReturnValue({
      arrivedThreshold: 100,
      approachingThreshold: 300,
    });

    const { result } = renderHook(() => useRefreshStation(), {
      wrapper: ({ children }) => <Provider>{children}</Provider>,
    });

    expect(result).toBeTruthy();
  });
});
