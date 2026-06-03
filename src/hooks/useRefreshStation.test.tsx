/** biome-ignore-all lint/suspicious/noExplicitAny: テストコードまで型安全にするのはつらい */
import { renderHook } from '@testing-library/react-native';
import { Provider, useAtomValue, useSetAtom } from 'jotai';
import { OperationStatus, type Station, StopCondition } from '~/@types/graphql';
import { MAX_PERMIT_ACCURACY } from '~/constants/location';
import * as useCanGoForwardModule from '~/hooks/useCanGoForward';
import * as useNearestStationModule from '~/hooks/useNearestStation';
import * as useNextStationModule from '~/hooks/useNextStation';
import { useRefreshStation } from '~/hooks/useRefreshStation';
import * as useThresholdModule from '~/hooks/useThreshold';
import * as useWrongDirectionDetectorModule from '~/hooks/useWrongDirectionDetector';

jest.mock('jotai', () => {
  const actual = jest.requireActual('jotai');
  return {
    ...actual,
    useAtomValue: jest.fn(),
    useSetAtom: jest.fn(() => jest.fn()),
  };
});

jest.mock('~/store/atoms/notify', () => ({
  __esModule: true,
  default: {},
}));

const mockUseAtomValue = useAtomValue as jest.MockedFunction<
  typeof useAtomValue
>;

const mockUseSetAtom = useSetAtom as jest.MockedFunction<typeof useSetAtom>;

const mockStation: Station = {
  __typename: 'Station',
  id: 1,
  groupId: 1,
  name: 'Test Station',
  nameKatakana: 'テストステーション',
  nameRoman: 'Test Station',
  nameChinese: undefined,
  nameIpa: null,
  nameRomanIpa: null,
  nameTtsSegments: null,
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
  transportType: undefined,
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
    // locationAtom, notifyStateの順で呼ばれる
    mockUseAtomValue
      .mockReturnValueOnce({
        coords: {
          latitude: 35.0,
          longitude: 135.0,
        },
      }) // locationAtom
      .mockReturnValue({ targetStationIds: [] }); // notifyState

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
    jest
      .spyOn(useWrongDirectionDetectorModule, 'useWrongDirectionDetector')
      .mockReturnValue({
        isWrongDirection: false,
        isLoopLineWrongDirection: false,
      });

    const { result } = renderHook(() => useRefreshStation(), {
      wrapper: ({ children }) => <Provider>{children}</Provider>,
    });

    expect(result).toBeTruthy();
  });

  it('実際の精度がMAX_PERMIT_ACCURACYを超える場合はarrivedを強制的にfalseにする', () => {
    // 最寄り駅と完全に同一座標でも、精度が許容上限を超えていれば到着とみなさない
    mockUseAtomValue
      .mockReturnValueOnce({
        coords: {
          latitude: 35.0,
          longitude: 135.0,
          accuracy: MAX_PERMIT_ACCURACY + 1,
        },
      }) // locationAtom
      .mockReturnValue({ targetStationIds: [] }); // notifyState

    // useRefreshStation内のuseSetAtom呼び出し順:
    // 1回目=setStation(stationState), 2回目=setNavigation(navigationState)
    const setStation = jest.fn();
    mockUseSetAtom.mockReturnValueOnce(setStation).mockReturnValue(jest.fn());

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
    jest
      .spyOn(useWrongDirectionDetectorModule, 'useWrongDirectionDetector')
      .mockReturnValue({
        isWrongDirection: false,
        isLoopLineWrongDirection: false,
      });

    renderHook(() => useRefreshStation(), {
      wrapper: ({ children }) => <Provider>{children}</Provider>,
    });

    expect(setStation).toHaveBeenCalled();
    const updater = setStation.mock.calls[0][0] as (prev: any) => any;
    const nextState = updater({});
    expect(nextState.arrived).toBe(false);
  });
});
