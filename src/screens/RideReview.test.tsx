import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import { Polyline } from 'react-native-maps';
import { STORAGE_KEYS } from '~/constants';
import { useRideReviewWalkthrough } from '~/hooks/useRideReviewWalkthrough';
import {
  getRideSessionsStartedBetween,
  type RideSessionWithStops,
} from '~/lib/rideLog';
import { storage } from '~/lib/storage';
import { rideLogEnabledAtom } from '~/store/atoms/rideLog';
import { getRidePeriodRange } from '~/utils/rideStats';
import RideReviewScreen from './RideReview';

const mockDispatch = jest.fn();

jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    // 画面が表示されたときの読み込みを、マウント時の effect として再現する
    useFocusEffect: (effect: () => undefined | (() => void)) => {
      useEffect(effect, [effect]);
    },
    useNavigation: () => ({ dispatch: mockDispatch }),
    CommonActions: {
      navigate: (payload: unknown) => ({ type: 'NAVIGATE', payload }),
    },
  };
});

// 実物のフックを包み、案内を始めてよいか(canStart)を記録する
jest.mock('~/hooks/useRideReviewWalkthrough', () => {
  const actual = jest.requireActual('~/hooks/useRideReviewWalkthrough');
  return {
    ...actual,
    useRideReviewWalkthrough: jest.fn(actual.useRideReviewWalkthrough),
  };
});

jest.mock('~/lib/rideLog', () => ({
  getRideSessionsStartedBetween: jest.fn(() => Promise.resolve([])),
}));

jest.mock('~/components/FooterTabBar', () => {
  const FooterTabBar = () => null;
  return { __esModule: true, default: FooterTabBar, useFooterHeight: () => 0 };
});
jest.mock('~/components/SettingsHeader', () => ({
  SettingsHeader: () => null,
}));
jest.mock('~/components/Button', () => {
  const { Pressable, Text } = require('react-native');
  return ({ children, onPress }: { children: string; onPress: () => void }) => (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Text>{children}</Text>
    </Pressable>
  );
});
jest.mock('~/translation', () => ({
  translate: (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

const mockGetRides = getRideSessionsStartedBetween as jest.Mock;

const renderScreen = (enabled: boolean) => {
  const store = createStore();
  store.set(rideLogEnabledAtom, enabled);
  const screen = render(
    <Provider store={store}>
      <RideReviewScreen />
    </Provider>
  );
  return { ...screen, store };
};

// 今月の中で、2駅進んだ乗車(合計 2,500m・12分)
const sampleRide = (): RideSessionWithStops => {
  const { start } = getRidePeriodRange('month', new Date());
  const startedAt = start.getTime() + 8 * 60 * 60 * 1000;
  const base = {
    stationGroupId: null,
    stationName: null,
    lineId: 11,
    lineName: '中央線快速',
    lineColor: '#F15A22',
    departedAt: null,
    distanceSource: 'haversine' as const,
    latitude: null,
    longitude: null,
    pathFromPrevious: null,
    prefectureId: null,
    etaMinutesFromPrevious: null,
  };
  return {
    id: 'r1',
    startedAt,
    endedAt: startedAt + 12 * 60 * 1000,
    lineId: 11,
    lineName: '中央線快速',
    lineColor: '#F15A22',
    trainTypeId: null,
    direction: 'INBOUND',
    stops: [
      {
        ...base,
        seq: 0,
        stationId: 1,
        kind: 'arrived',
        arrivedAt: null,
        departedAt: startedAt,
        distanceFromPrevious: 0,
      },
      {
        ...base,
        seq: 1,
        stationId: 2,
        kind: 'arrived',
        arrivedAt: startedAt + 5 * 60 * 1000,
        distanceFromPrevious: 1000,
      },
      {
        ...base,
        seq: 2,
        stationId: 3,
        kind: 'arrived',
        arrivedAt: startedAt + 12 * 60 * 1000,
        distanceFromPrevious: 1500,
      },
    ],
  };
};

// sampleRide の3駅に座標を付ける。1駅目と2駅目のあいだは、検出できなかった駅を1つ通る
const withCoordinates = (ride: RideSessionWithStops): RideSessionWithStops => {
  const coords = [
    { latitude: 35.7027, longitude: 139.5607 },
    { latitude: 35.7031, longitude: 139.5798 },
    { latitude: 35.7046, longitude: 139.62 },
  ];
  return {
    ...ride,
    stops: ride.stops.map((stop, i) => ({
      ...stop,
      ...coords[i],
      pathFromPrevious:
        i === 1 ? [{ latitude: 35.703, longitude: 139.57 }] : [],
    })),
  };
};

describe('RideReviewScreen', () => {
  afterEach(() => {
    jest.clearAllMocks();
    storage.remove(STORAGE_KEYS.RIDE_LOG_ENABLED);
  });

  it('無効のときは紹介を表示し、記録は読みに行かない', () => {
    const { getByText } = renderScreen(false);
    expect(getByText('rideReviewIntroTitle')).toBeTruthy();
    expect(mockGetRides).not.toHaveBeenCalled();
  });

  it('「有効にする」で記録をオンにして保存する', async () => {
    const { getByText, store } = renderScreen(false);
    fireEvent.press(getByText('rideReviewEnable'));
    expect(store.get(rideLogEnabledAtom)).toBe(true);
    expect(storage.getString(STORAGE_KEYS.RIDE_LOG_ENABLED)).toBe('true');
    // 有効になった画面で今月の記録を読みに行く
    await waitFor(() => expect(mockGetRides).toHaveBeenCalled());
  });

  it('有効で記録が無ければ、空の状態を表示する', async () => {
    const { findByText, queryByTestId } = renderScreen(true);
    expect(await findByText('rideReviewEmptyTitle')).toBeTruthy();
    expect(queryByTestId('ride-review-chart')).toBeNull();

    const range = getRidePeriodRange('month', new Date());
    expect(mockGetRides).toHaveBeenCalledWith(
      range.start.getTime(),
      range.end.getTime()
    );
  });

  it('記録があれば、合計・グラフ・よく乗った路線を表示する', async () => {
    mockGetRides.mockResolvedValueOnce([sampleRide()]);
    const { findByTestId, getByTestId, getByText } = renderScreen(true);

    expect((await findByTestId('ride-review-distance')).props.children).toBe(
      (2.5).toLocaleString(undefined, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })
    );
    expect(getByTestId('ride-review-duration').props.children).toBe(
      'rideReviewDurationMinutes:{"minutes":12}'
    );
    expect(getByTestId('ride-review-count').props.children).toBe(
      'rideReviewRideCountValue:{"count":1}'
    );
    expect(getByTestId('ride-review-chart')).toBeTruthy();
    expect(getByText('中央線快速')).toBeTruthy();
  });

  it('グラフの棒に、日付と距離を読み上げるラベルを付ける', async () => {
    mockGetRides.mockResolvedValueOnce([sampleRide()]);
    const { findByTestId, getByLabelText } = renderScreen(true);
    await findByTestId('ride-review-chart');
    const { start } = getRidePeriodRange('month', new Date());
    const label = `${start.getMonth() + 1}/${start.getDate()}`;
    expect(
      getByLabelText(
        `rideReviewChartBarLabel:${JSON.stringify({
          label,
          distance: (2.5).toLocaleString(undefined, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          }),
        })}`
      )
    ).toBeTruthy();
  });

  it('駅の座標がある乗車は、移動経路の地図に路線色の線で描く', async () => {
    mockGetRides.mockResolvedValueOnce([withCoordinates(sampleRide())]);
    const { findByTestId, getByLabelText, queryByText, UNSAFE_getAllByType } =
      renderScreen(true);
    await findByTestId('ride-review-route-map-expand');

    // 線は縁取りと路線色の2本を重ねる。通った駅を含めて4駅をつなぐ
    const polylines = UNSAFE_getAllByType(Polyline);
    expect(polylines).toHaveLength(2);
    const lines = polylines.filter((l) => l.props.strokeColor === '#F15A22');
    expect(lines).toHaveLength(1);
    expect(lines[0].props.coordinates).toHaveLength(4);
    expect(
      getByLabelText('rideReviewRouteMapLabel:{"lines":"中央線快速"}')
    ).toBeTruthy();
    expect(queryByText('rideReviewRouteMapNone')).toBeNull();
  });

  it('地図の全画面ボタンで、表示中の期間の地図を開く', async () => {
    mockGetRides.mockResolvedValueOnce([withCoordinates(sampleRide())]);
    const { findByTestId } = renderScreen(true);
    fireEvent.press(await findByTestId('ride-review-route-map-expand'));
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'NAVIGATE',
      payload: { name: 'RideRouteMap', params: { period: 'month' } },
    });
  });

  it('駅の座標を保存する前の乗車が混ざると、地図に出ていない回数を添える', async () => {
    mockGetRides.mockResolvedValueOnce([
      withCoordinates(sampleRide()),
      { ...sampleRide(), id: 'r2' },
    ]);
    const { findByText } = renderScreen(true);
    expect(
      await findByText('rideReviewRouteMapUnmapped:{"count":1}')
    ).toBeTruthy();
  });

  it('期間の乗車がすべて座標の保存前なら、地図を出さずに理由を出す', async () => {
    mockGetRides.mockResolvedValueOnce([sampleRide()]);
    const { findByText, queryByTestId } = renderScreen(true);
    expect(await findByText('rideReviewRouteMapNone')).toBeTruthy();
    expect(queryByTestId('ride-review-route-map-expand')).toBeNull();
  });

  // sampleRide の3駅に都道府県を付けた乗車。出発駅と到着駅の都道府県を指定する
  const withPrefectures = (
    ride: RideSessionWithStops,
    prefectureIds: number[]
  ): RideSessionWithStops => ({
    ...ride,
    stops: ride.stops.map((stop, i) => ({
      ...stop,
      prefectureId: prefectureIds[i] ?? null,
    })),
  });

  it('訪れた都道府県の数と、都道府県ごとの距離を出す', async () => {
    mockGetRides.mockResolvedValueOnce([
      withPrefectures(sampleRide(), [11, 13, 13]),
    ]);
    const { findByTestId, getAllByTestId, getByText, queryByTestId } =
      renderScreen(true);
    expect(
      (await findByTestId('ride-review-prefecture-count')).props.children
    ).toBe(2);
    expect(getAllByTestId('ride-review-prefecture')).toHaveLength(2);
    // PREFECTURES_JA / PREFECTURES_ROMAN のどちらかで名前を出す
    expect(getByText(/東京都|Tokyo/)).toBeTruthy();
    expect(queryByTestId('ride-review-prefectures-toggle')).toBeNull();
  });

  it('6都道府県以上なら上位5件だけを出し、「すべて表示」で開閉する', async () => {
    const rides = [1, 2, 3, 4, 5, 6, 7].map((prefectureId, i) => ({
      ...withPrefectures(sampleRide(), [
        prefectureId,
        prefectureId,
        prefectureId,
      ]),
      id: `r${i}`,
    }));
    mockGetRides.mockResolvedValueOnce(rides);
    const { findByTestId, getAllByTestId, getByTestId, getByText } =
      renderScreen(true);
    expect(
      (await findByTestId('ride-review-prefecture-count')).props.children
    ).toBe(7);
    expect(getAllByTestId('ride-review-prefecture')).toHaveLength(5);
    expect(getByText('rideReviewPrefecturesShowAll:{"count":2}')).toBeTruthy();

    fireEvent.press(getByTestId('ride-review-prefectures-toggle'));
    expect(getAllByTestId('ride-review-prefecture')).toHaveLength(7);
    expect(getByText('close')).toBeTruthy();

    fireEvent.press(getByTestId('ride-review-prefectures-toggle'));
    expect(getAllByTestId('ride-review-prefecture')).toHaveLength(5);
  });

  it('都道府県を記録する前の乗車が混ざると、その回数を添える', async () => {
    mockGetRides.mockResolvedValueOnce([
      withPrefectures(sampleRide(), [13, 13, 13]),
      { ...sampleRide(), id: 'old' },
    ]);
    const { findByText } = renderScreen(true);
    expect(
      await findByText('rideReviewPrefecturesUnrecorded:{"count":1}')
    ).toBeTruthy();
  });

  it('期間の乗車がすべて都道府県の記録前なら、理由を出す', async () => {
    mockGetRides.mockResolvedValueOnce([sampleRide()]);
    const { findByText, queryByTestId } = renderScreen(true);
    expect(await findByText('rideReviewPrefecturesNone')).toBeTruthy();
    expect(queryByTestId('ride-review-prefecture-count')).toBeNull();
  });

  describe('ウォークスルー(#7117)', () => {
    const lastCanStart = () => {
      const calls = (useRideReviewWalkthrough as jest.Mock).mock.calls;
      return calls[calls.length - 1]?.[0];
    };

    it('記録があり、案内するカードがそろったら始める', async () => {
      mockGetRides.mockResolvedValueOnce([sampleRide()]);
      const { findByTestId } = renderScreen(true);
      await findByTestId('ride-review-chart');
      await waitFor(() => expect(lastCanStart()).toBe(true));
    });

    it('記録が無ければ始めない', async () => {
      const { findByText } = renderScreen(true);
      await findByText('rideReviewEmptyTitle');
      expect(lastCanStart()).toBe(false);
    });

    it('振り返りが無効なら始めない', () => {
      renderScreen(false);
      expect(lastCanStart()).toBe(false);
    });
  });

  it('読み込みが終わるまで、読み込み中の表示を出す', async () => {
    let resolve: (value: RideSessionWithStops[]) => void = () => {};
    mockGetRides.mockImplementationOnce(
      () =>
        new Promise<RideSessionWithStops[]>((r) => {
          resolve = r;
        })
    );
    const { getByTestId, findByText, queryByTestId } = renderScreen(true);
    expect(getByTestId('ride-review-loading')).toBeTruthy();
    resolve([]);
    await findByText('rideReviewEmptyTitle');
    expect(queryByTestId('ride-review-loading')).toBeNull();
  });

  it('期間を切り替えると、その期間で読み直す', async () => {
    const { findByText, getByText } = renderScreen(true);
    await findByText('rideReviewEmptyTitle');

    fireEvent.press(getByText('rideReviewPeriodWeek'));
    const week = getRidePeriodRange('week', new Date());
    await waitFor(() =>
      expect(mockGetRides).toHaveBeenLastCalledWith(
        week.start.getTime(),
        week.end.getTime()
      )
    );
  });

  it('読み込みに失敗したら、エラーの文言を出す', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    mockGetRides.mockRejectedValueOnce(new Error('db'));
    const { findByText } = renderScreen(true);
    expect(await findByText('rideReviewLoadFailed')).toBeTruthy();
    consoleErrorSpy.mockRestore();
  });
});
