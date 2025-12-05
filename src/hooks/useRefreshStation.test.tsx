/** biome-ignore-all lint/suspicious/noExplicitAny: テストコードまで型安全にするのはつらい */
import { renderHook } from '@testing-library/react-native';
import { Provider } from 'jotai';
import { OperationStatus, type Station, StopCondition } from '~/@types/graphql';
import * as useCanGoForwardModule from '~/hooks/useCanGoForward';
import * as useLocationStoreModule from '~/hooks/useLocationStore';
import * as useNearestStationModule from '~/hooks/useNearestStation';
import * as useNextStationModule from '~/hooks/useNextStation';
import { useRefreshStation } from '~/hooks/useRefreshStation';
import * as useThresholdModule from '~/hooks/useThreshold';

const mockStation: Station = {
  __typename: 'Station',
  id: 1,
  groupId: 1,
  name: 'Test Station',
  nameKatakana: 'テストステーション',
  nameRoman: 'Test Station',
  nameChinese: undefined,
  nameKorean: undefined,
  threeLetterCode: undefined,
  latitude: 35.0,
  longitude: 135.0,
  lines: [],
  prefectureId: 13,
  postalCode: '100-0001',
  address: 'Tokyo',
  openedAt: '1900-01-01',
  closedAt: '9999-12-31',
  status: OperationStatus.InOperation,
  stationNumbers: [],
  stopCondition: StopCondition.All,
  distance: undefined,
  hasTrainTypes: undefined,
  line: undefined,
  trainType: undefined,
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

      .mockImplementation((fn: any) =>
        fn({
          location: {
            coords: {
              latitude: 35.0,
              longitude: 135.0,
              speed: 0,
              accuracy: 5,
            },
          },
          accuracyHistory: [5],
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
