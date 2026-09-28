import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import { STORAGE_KEYS } from '~/constants';
import {
  getRideSessionsStartedBetween,
  type RideSessionWithStops,
} from '~/lib/rideLog';
import { storage } from '~/lib/storage';
import { rideLogEnabledAtom } from '~/store/atoms/rideLog';
import { getRidePeriodRange } from '~/utils/rideStats';
import RideReviewScreen from './RideReview';

jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    // 画面が表示されたときの読み込みを、マウント時の effect として再現する
    useFocusEffect: (effect: () => undefined | (() => void)) => {
      useEffect(effect, [effect]);
    },
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
