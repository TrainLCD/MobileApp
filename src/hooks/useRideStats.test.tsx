import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { getRideSessionsStartedBetween } from '~/lib/rideLog';
import { useRideStats } from './useRideStats';

jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    useFocusEffect: (effect: () => undefined | (() => void)) => {
      useEffect(effect, [effect]);
    },
  };
});

jest.mock('~/lib/rideLog', () => ({
  getRideSessionsStartedBetween: jest.fn(() => Promise.resolve([])),
}));

const mockGetRides = getRideSessionsStartedBetween as jest.Mock;
// npm test は TZ=UTC で動くため、ローカル時刻 = UTC として日時を組み立てる
const at = (iso: string) => new Date(iso).getTime();

const flushPromises = async () => {
  await act(async () => {
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
    }
  });
};

describe('useRideStats', () => {
  let appStateHandler: ((state: string) => void) | null = null;

  beforeEach(() => {
    jest.useFakeTimers();
    appStateHandler = null;
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_type, handler) => {
        appStateHandler = handler as (state: string) => void;
        return { remove: jest.fn() } as unknown as ReturnType<
          typeof AppState.addEventListener
        >;
      });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('表示中に月が変わったら、翌月の範囲で読み直す', async () => {
    jest.setSystemTime(new Date('2026-09-30T23:59:00Z'));
    const { result } = renderHook(() => useRideStats('month', true));
    await flushPromises();
    expect(mockGetRides).toHaveBeenLastCalledWith(
      at('2026-09-01T00:00:00Z'),
      at('2026-10-01T00:00:00Z')
    );

    await act(async () => {
      jest.advanceTimersByTime(60 * 1000);
    });
    await flushPromises();
    expect(mockGetRides).toHaveBeenLastCalledWith(
      at('2026-10-01T00:00:00Z'),
      at('2026-11-01T00:00:00Z')
    );
    expect(result.current).toMatchObject({ status: 'ready', period: 'month' });
    if (result.current.status === 'ready') {
      expect(result.current.range.start.toISOString()).toBe(
        '2026-10-01T00:00:00.000Z'
      );
    }
  });

  it('アプリが前面に戻ったら読み直す', async () => {
    jest.setSystemTime(new Date('2026-09-15T12:00:00Z'));
    renderHook(() => useRideStats('week', true));
    await flushPromises();
    expect(mockGetRides).toHaveBeenCalledTimes(1);

    // 裏にいるあいだに週が変わっていた
    jest.setSystemTime(new Date('2026-09-22T08:00:00Z'));
    await act(async () => {
      appStateHandler?.('active');
    });
    await flushPromises();
    expect(mockGetRides).toHaveBeenCalledTimes(2);
    expect(mockGetRides).toHaveBeenLastCalledWith(
      at('2026-09-21T00:00:00Z'),
      at('2026-09-28T00:00:00Z')
    );
  });

  it('期間の終わりまでが setTimeout の上限より長いときは、途中で待ち直す', async () => {
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    renderHook(() => useRideStats('year', true));
    await flushPromises();
    expect(mockGetRides).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(2 ** 31 - 1);
    });
    await flushPromises();
    // まだ年は変わっていないので読み直さない
    expect(mockGetRides).toHaveBeenCalledTimes(1);
  });

  it('前の読み込みの結果が遅れて届いても、新しい結果を上書きしない', async () => {
    jest.setSystemTime(new Date('2026-09-15T12:00:00Z'));
    let resolveFirst: (value: unknown[]) => void = () => {};
    mockGetRides.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        })
    );
    const { result } = renderHook(() => useRideStats('month', true));
    await act(async () => {
      appStateHandler?.('active');
    });
    await flushPromises();
    expect(result.current.status).toBe('ready');

    // 1回目の結果が遅れて届く(乗車1件)。2回目の結果(0件)のままであるべき
    await act(async () => {
      resolveFirst([
        {
          id: 'late',
          startedAt: at('2026-09-15T08:00:00Z'),
          endedAt: at('2026-09-15T08:10:00Z'),
          lineId: 1,
          lineName: null,
          lineColor: null,
          trainTypeId: null,
          direction: null,
          stops: [],
        },
      ]);
    });
    await flushPromises();
    if (result.current.status === 'ready') {
      expect(result.current.stats.rideCount).toBe(0);
    }
  });

  it('無効のときは読みに行かない', async () => {
    renderHook(() => useRideStats('month', false));
    await flushPromises();
    expect(mockGetRides).not.toHaveBeenCalled();
  });
});
