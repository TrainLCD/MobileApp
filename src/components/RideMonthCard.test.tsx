import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import {
  getRideSessionsStartedBetween,
  type RideSessionWithStops,
} from '~/lib/rideLog';
import { getRidePeriodRange } from '~/utils/rideStats';
import { RideMonthCard } from './RideMonthCard';

const mockDispatch = jest.fn();

jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    useNavigation: () => ({ dispatch: mockDispatch }),
    StackActions: {
      replace: (name: string) => ({ type: 'REPLACE', payload: { name } }),
    },
    useFocusEffect: (effect: () => undefined | (() => void)) => {
      useEffect(effect, [effect]);
    },
  };
});

jest.mock('~/lib/rideLog', () => ({
  getRideSessionsStartedBetween: jest.fn(() => Promise.resolve([])),
}));

jest.mock('~/translation', () => ({
  translate: (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

const mockGetRides = getRideSessionsStartedBetween as jest.Mock;

const renderCard = () =>
  render(
    <Provider store={createStore()}>
      <RideMonthCard />
    </Provider>
  );

// 今月の中で、1駅進んだ乗車(2,000m・8分)
const sampleRide = (): RideSessionWithStops => {
  const { start } = getRidePeriodRange('month', new Date());
  const startedAt = start.getTime() + 8 * 60 * 60 * 1000;
  const base = {
    stationGroupId: null,
    stationName: null,
    lineId: 11,
    lineName: '中央線快速',
    lineColor: '#F15A22',
    distanceSource: 'haversine' as const,
    latitude: null,
    longitude: null,
    pathFromPrevious: null,
  };
  return {
    id: 'r1',
    startedAt,
    endedAt: startedAt + 8 * 60 * 1000,
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
        arrivedAt: startedAt + 8 * 60 * 1000,
        departedAt: null,
        distanceFromPrevious: 2000,
      },
    ],
  };
};

describe('RideMonthCard', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('今月の記録を読み、距離と時間を表示する', async () => {
    mockGetRides.mockResolvedValueOnce([sampleRide()]);
    const { getByTestId } = renderCard();

    const range = getRidePeriodRange('month', new Date());
    expect(mockGetRides).toHaveBeenCalledWith(
      range.start.getTime(),
      range.end.getTime()
    );
    await waitFor(() =>
      expect(getByTestId('ride-month-card-value').props.children).toBe(
        `rideMonthCardValue:${JSON.stringify({
          distance: (2).toLocaleString(undefined, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          }),
          duration: 'rideReviewDurationMinutes:{"minutes":8}',
        })}`
      )
    );
  });

  it('記録が0件なら、記録中であることを表示する', async () => {
    const { getByTestId } = renderCard();
    await waitFor(() =>
      expect(getByTestId('ride-month-card-value').props.children).toBe(
        'rideMonthCardEmpty'
      )
    );
  });

  it('読み込みに失敗したら、記録が無いときと区別できる文言を出す', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    mockGetRides.mockRejectedValueOnce(new Error('db'));
    const { getByTestId } = renderCard();
    await waitFor(() =>
      expect(getByTestId('ride-month-card-value').props.children).toBe(
        'rideReviewLoadFailed'
      )
    );
    consoleErrorSpy.mockRestore();
  });

  it('タップすると振り返りタブへ replace で移る', async () => {
    const { getByTestId } = renderCard();
    await waitFor(() => expect(mockGetRides).toHaveBeenCalled());
    fireEvent.press(getByTestId('ride-month-card'));
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'REPLACE',
      payload: { name: 'RideReview' },
    });
  });
});
