/** biome-ignore-all lint/suspicious/noExplicitAny: テストコードまで型安全にするのはつらい */
import { renderHook } from '@testing-library/react-native';
import { Provider, useAtomValue, useSetAtom } from 'jotai';
import { OperationStatus, type Station, StopCondition } from '~/@types/graphql';
import { MAX_PERMIT_ACCURACY } from '~/constants/location';
import * as useApproachingStationModule from '~/hooks/useApproachingStation';
import * as useCanGoForwardModule from '~/hooks/useCanGoForward';
import * as useNearestStationModule from '~/hooks/useNearestStation';
import * as useNextStationModule from '~/hooks/useNextStation';
import { useRefreshStation } from '~/hooks/useRefreshStation';
import * as useThresholdModule from '~/hooks/useThreshold';
import * as useWrongDirectionDetectorModule from '~/hooks/useWrongDirectionDetector';
import * as remoteConfigModule from '~/lib/remoteConfig';
import { store } from '~/store';
import { etaAnchorAtom } from '~/store/atoms/etaFallback';
import * as etaPhaseNowModule from '~/utils/etaPhaseNow';
import sendNotificationAsync from '~/utils/native/ios/sensitiveNotificationMoudle';

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

jest.mock('~/utils/native/ios/sensitiveNotificationMoudle', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockSendNotification = sendNotificationAsync as jest.MockedFunction<
  typeof sendNotificationAsync
>;

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
    // 接近駅は現在地基準で算出されるが、本テストでは最寄り駅と同一座標の
    // mockStation を返すことで従来(次駅基準)と同じ接近判定挙動を再現する。
    jest
      .spyOn(useApproachingStationModule, 'useApproachingStation')
      .mockReturnValue(mockStation);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    // R1テストで設定したETAアンカーを既定(null)へ戻し、他テストへ漏れないようにする
    store.set(etaAnchorAtom, null);
  });

  it('runs without crashing with basic mocks', () => {
    // locationAtom, locationAccuracyOutlierAtom, notifyStateの順で呼ばれる
    mockUseAtomValue
      .mockReturnValueOnce({
        coords: {
          latitude: 35.0,
          longitude: 135.0,
        },
      }) // locationAtom
      .mockReturnValueOnce(false) // locationAccuracyOutlierAtom
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
    // ワンショット取得などフィルタを経由せず粗い精度の測位がlocationAtomに入った場合、
    // 最寄り駅と完全に同一座標でも到着とみなさない
    mockUseAtomValue
      .mockReturnValueOnce({
        coords: {
          latitude: 35.0,
          longitude: 135.0,
          accuracy: MAX_PERMIT_ACCURACY + 1,
        },
      }) // locationAtom
      .mockReturnValueOnce(false) // locationAccuracyOutlierAtom
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

  it('外れ値フラグが立っている場合は精度が良好でもarrivedを強制的にfalseにする', () => {
    // 継続測位ではMAX_PERMIT_ACCURACY超の測位は棄却され座標が前回値で凍結するため、
    // locationAtomの精度は良好なまま。棄却の事実は外れ値フラグから判定する
    mockUseAtomValue
      .mockReturnValueOnce({
        coords: {
          latitude: 35.0,
          longitude: 135.0,
          accuracy: 10,
        },
      }) // locationAtom
      .mockReturnValueOnce(true) // locationAccuracyOutlierAtom
      .mockReturnValue({ targetStationIds: [] }); // notifyState

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

  it('強制未到着トグルが無効なら精度超過・外れ値でも通常の到着判定を行う', () => {
    // Remote Configのフィーチャートグルで無効化された場合、精度に依らず
    // 最寄り駅と同一座標なら到着とみなす
    jest
      .spyOn(remoteConfigModule, 'isForceNotArrivedOnLowAccuracyEnabled')
      .mockReturnValue(false);

    mockUseAtomValue
      .mockReturnValueOnce({
        coords: {
          latitude: 35.0,
          longitude: 135.0,
          accuracy: MAX_PERMIT_ACCURACY + 1,
        },
      }) // locationAtom
      .mockReturnValueOnce(true) // locationAccuracyOutlierAtom
      .mockReturnValue({ targetStationIds: [] }); // notifyState

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
    expect(nextState.arrived).toBe(true);
  });

  it('接近判定は次駅ではなく現在地基準の接近駅(useApproachingStation)を基準にする', () => {
    // 接近駅は現在地と同一座標、次駅・最寄り駅は遠方に置くことで、
    // 接近判定が approachingStation を基準にしていることを担保する。
    const approachingStation = {
      ...mockStation,
      id: 10,
      groupId: 10,
      latitude: 35.0,
      longitude: 135.0,
      stopCondition: StopCondition.All,
    };
    // 最寄り(停車駅)は遠方に置き、到着判定が立たないようにする
    const farNearestStop = {
      ...mockStation,
      id: 20,
      groupId: 20,
      latitude: 35.5,
      longitude: 135.0,
      stopCondition: StopCondition.All,
    };

    mockUseAtomValue
      .mockReturnValueOnce({
        coords: {
          latitude: 35.0,
          longitude: 135.0,
        },
      }) // locationAtom
      .mockReturnValueOnce(false) // locationAccuracyOutlierAtom
      .mockReturnValue({ targetStationIds: [] }); // notifyState

    const setStation = jest.fn();
    mockUseSetAtom.mockReturnValueOnce(setStation).mockReturnValue(jest.fn());

    jest
      .spyOn(useNearestStationModule, 'useNearestStation')
      .mockReturnValue(farNearestStop);
    // 次駅は遠方の別駅。これが基準なら isApproaching は false になる
    jest
      .spyOn(useNextStationModule, 'useNextStation')
      .mockReturnValue(farNearestStop);
    jest
      .spyOn(useApproachingStationModule, 'useApproachingStation')
      .mockReturnValue(approachingStation);
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
    // 現在地と同一座標の接近駅により approaching が成立する
    expect(nextState.arrived).toBe(false);
    expect(nextState.approaching).toBe(true);
  });

  it('最寄りが通過駅の場合は接近圏内でも approaching を抑止する(意図的なゲート)', () => {
    // isApproaching が true でも、最寄り駅が通過駅のときは「まもなく」を出さない。
    // これは通過(通過表示)中に「まもなく」が点灯しないようにするための意図的なゲート。
    const approachingStation = {
      ...mockStation,
      id: 10,
      groupId: 10,
      latitude: 35.0,
      longitude: 135.0,
      stopCondition: StopCondition.All,
    };
    // 最寄りは通過駅。到着圏外に置く
    const farNearestPass = {
      ...mockStation,
      id: 30,
      groupId: 30,
      latitude: 35.5,
      longitude: 135.0,
      stopCondition: StopCondition.Not,
    };

    mockUseAtomValue
      .mockReturnValueOnce({
        coords: {
          latitude: 35.0,
          longitude: 135.0,
        },
      }) // locationAtom
      .mockReturnValueOnce(false) // locationAccuracyOutlierAtom
      .mockReturnValue({ targetStationIds: [] }); // notifyState

    const setStation = jest.fn();
    mockUseSetAtom.mockReturnValueOnce(setStation).mockReturnValue(jest.fn());

    jest
      .spyOn(useNearestStationModule, 'useNearestStation')
      .mockReturnValue(farNearestPass);
    jest
      .spyOn(useNextStationModule, 'useNextStation')
      .mockReturnValue(approachingStation);
    jest
      .spyOn(useApproachingStationModule, 'useApproachingStation')
      .mockReturnValue(approachingStation);
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
    expect(nextState.approaching).toBe(false);
  });

  it('駅接近ローカル通知は最寄り駅ではなく現在地基準の接近駅を通知する', () => {
    // 最寄り駅(発車直後の駅など)は遠方かつ別駅。接近駅は現在地と同一座標の通知対象駅。
    // 通知される駅名がヘッダーの「まもなく」と同じ接近駅になることを担保する。
    const approachingTarget = {
      ...mockStation,
      id: 2,
      groupId: 2,
      name: 'Approaching Station',
      nameRoman: 'Approaching Station',
      latitude: 35.0,
      longitude: 135.0,
    };
    const farNearestStation = {
      ...mockStation,
      id: 1,
      groupId: 1,
      name: 'Nearest Station',
      nameRoman: 'Nearest Station',
      latitude: 35.5,
      longitude: 135.0,
    };

    mockUseAtomValue
      .mockReturnValueOnce({
        coords: { latitude: 35.0, longitude: 135.0 },
      }) // locationAtom
      .mockReturnValueOnce(false) // locationAccuracyOutlierAtom
      .mockReturnValue({ targetStationIds: [2] }); // notifyState(接近駅id=2が通知対象)

    mockUseSetAtom.mockReturnValue(jest.fn());

    jest
      .spyOn(useApproachingStationModule, 'useApproachingStation')
      .mockReturnValue(approachingTarget);
    jest
      .spyOn(useNearestStationModule, 'useNearestStation')
      .mockReturnValue(farNearestStation);
    jest
      .spyOn(useNextStationModule, 'useNextStation')
      .mockReturnValue(approachingTarget);
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

    expect(mockSendNotification).toHaveBeenCalled();
    const body = mockSendNotification.mock.calls[0][0].body;
    expect(body).toContain('Approaching Station');
    expect(body).not.toContain('Nearest Station');
  });

  // R1(到着圏の緩和)は「発車(DEPARTED)を観測済みで、ETAが前方の次駅で停車中」の
  // ときだけ効く。精度800mでは通常圏は arrivedThreshold(100)+min(400,150)=250m、
  // R1圏は 100+min(400,500)=500m。駅から約350m(通常圏外・R1圏内)に現在地を置き、
  // アンカー種別だけを変えて緩和の有無を検証する。
  const setupR1 = (anchorKind: 'AT_STATION' | 'DEPARTED') => {
    // mockStation.id は Maybe<number> だが実体は 1。R1は phase.stationId と
    // nearestStation.id の一致で効くため、同じ値を数値として使い回す。
    const stationId = mockStation.id as number;

    jest.spyOn(remoteConfigModule, 'isEtaAssistEnabled').mockReturnValue(true);

    // 駅(35.0,135.0)から約350m北。通常圏(250m)外・R1圏(500m)内。
    mockUseAtomValue
      .mockReturnValueOnce({
        coords: {
          latitude: 35.00315,
          longitude: 135.0,
          accuracy: 800,
        },
      }) // locationAtom
      .mockReturnValueOnce(false) // locationAccuracyOutlierAtom
      .mockReturnValue({ targetStationIds: [] }); // notifyState

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

    store.set(etaAnchorAtom, {
      stationId: anchorKind === 'DEPARTED' ? 99 : stationId,
      kind: anchorKind,
      observedAtMs: 0,
    });
    // フェーズは常駐atomではなくオンデマンド計算になったため、計算結果をスタブする
    jest
      .spyOn(etaPhaseNowModule, 'getEtaPhaseNow')
      .mockReturnValue({ kind: 'DWELLING', stationId });

    renderHook(() => useRefreshStation(), {
      wrapper: ({ children }) => <Provider>{children}</Provider>,
    });

    expect(setStation).toHaveBeenCalled();
    const updater = setStation.mock.calls[0][0] as (prev: any) => any;
    return updater({});
  };

  it('R1: DEPARTED後にETAが前方の次駅で停車中なら到着圏を広げて到着を確定する', () => {
    const nextState = setupR1('DEPARTED');
    expect(nextState.arrived).toBe(true);
  });

  it('R1: AT_STATION(停車中の自駅)には緩和を効かせず始発駅ロックを防ぐ', () => {
    // AT_STATION アンカーの自駅DWELLINGでは緩和しないため、通常圏(250m)外の
    // 現在地は到着扱いにならない。これにより arrived が張り付いてDEPARTEDが
    // 記録されない自己強化ロック(始発駅から進めない)を防ぐ。
    const nextState = setupR1('AT_STATION');
    expect(nextState.arrived).toBe(false);
  });
});
