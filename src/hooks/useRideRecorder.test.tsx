import { act, renderHook } from '@testing-library/react-native';
import { Provider as JotaiProvider } from 'jotai';
import { createStore } from 'jotai/vanilla';
import type { ReactNode } from 'react';
import { StopCondition } from '~/@types/graphql';
import {
  appendRideStop,
  insertRideSession,
  updateRideStopDeparture,
} from '~/lib/rideLog';
import { autoModeEnabledAtom } from '~/store/atoms/navigation';
import {
  arrivedAtom,
  selectedDirectionAtom,
  stationAtom,
  stationsAtom,
} from '~/store/atoms/station';
import { getRideDistanceMeters } from '~/utils/rideDistance';
import { createLine, createStation } from '~/utils/test/factories';
import { useRideRecorder } from './useRideRecorder';

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'session-1'),
}));

jest.mock('~/lib/rideLog', () => ({
  insertRideSession: jest.fn(() => Promise.resolve()),
  appendRideStop: jest.fn(() => Promise.resolve()),
  updateRideStopDeparture: jest.fn(() => Promise.resolve()),
}));

jest.mock('./useCurrentLine', () => ({
  useCurrentLine: () => mockLine,
}));
jest.mock('./useCurrentTrainType', () => ({
  useCurrentTrainType: () => null,
}));
jest.mock('./useLoopLine', () => ({
  useLoopLine: () => ({ isLoopLine: false }),
}));

const mockLine = createLine(11, { nameShort: '中央線快速', color: '#F15A22' });

const at = (id: number, lon: number, pass = false) =>
  createStation(id, {
    latitude: 35.68,
    longitude: lon,
    stopCondition: pass ? StopCondition.Not : StopCondition.All,
    line: { id: 11, nameShort: '中央線快速', color: '#F15A22' },
  });

const a = at(1, 139.7);
const b = at(2, 139.711, true);
const c = at(3, 139.722);
const d = at(4, 139.733);
const e = at(5, 139.744);
const stations = [a, b, c, d, e];

// 書き込みキューは Promise を数段つなぐので、何周か回して流し切る
const flush = async () => {
  await act(async () => {
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
    }
  });
};

const setup = () => {
  const store = createStore();
  store.set(stationsAtom, stations);
  store.set(stationAtom, a);
  store.set(arrivedAtom, true);
  store.set(selectedDirectionAtom, 'INBOUND');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <JotaiProvider store={store}>{children}</JotaiProvider>
  );
  const hook = renderHook(() => useRideRecorder(), { wrapper });
  return { store, hook };
};

let now = 1_000;
const tick = (ms: number) => {
  now += ms;
};

describe('useRideRecorder', () => {
  beforeEach(() => {
    now = 1_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('出発駅にいるだけでは何も書かない', async () => {
    const { store } = setup();
    tick(60_000);
    act(() => store.set(arrivedAtom, false));
    act(() => store.set(arrivedAtom, true));
    await flush();
    expect(insertRideSession).not.toHaveBeenCalled();
  });

  it('通過駅しか検出していない間は確定しない', async () => {
    const { store } = setup();
    act(() => store.set(arrivedAtom, false));
    act(() => store.set(stationAtom, b));
    await flush();
    expect(insertRideSession).not.toHaveBeenCalled();
  });

  it('次の駅に到着したら、溜めていた駅とまとめてセッションを書く', async () => {
    const { store } = setup();
    tick(10_000);
    const departedAt = now;
    act(() => store.set(arrivedAtom, false));
    tick(60_000);
    const passedAt = now;
    act(() => store.set(stationAtom, b));
    tick(60_000);
    const arrivedAt = now;
    act(() => {
      store.set(stationAtom, c);
      store.set(arrivedAtom, true);
    });
    await flush();

    expect(insertRideSession).toHaveBeenCalledTimes(1);
    const [session, stops] = (insertRideSession as jest.Mock).mock.calls[0];
    expect(session).toEqual({
      id: 'session-1',
      startedAt: departedAt,
      endedAt: arrivedAt,
      lineId: 11,
      lineName: '中央線快速',
      lineColor: '#F15A22',
      trainTypeId: null,
      direction: 'INBOUND',
    });
    expect(
      stops.map((s: { stationId: number; kind: string }) => [
        s.stationId,
        s.kind,
      ])
    ).toEqual([
      [1, 'arrived'],
      [2, 'passed'],
      [3, 'arrived'],
    ]);
    expect(stops[0]).toMatchObject({
      seq: 0,
      arrivedAt: null,
      departedAt,
      distanceFromPrevious: 0,
    });
    expect(stops[1]).toMatchObject({
      seq: 1,
      arrivedAt: passedAt,
      distanceFromPrevious: getRideDistanceMeters(stations, a, b, false),
    });
    expect(stops[2]).toMatchObject({
      seq: 2,
      arrivedAt,
      distanceFromPrevious: getRideDistanceMeters(stations, b, c, false),
    });
  });

  it('確定後は駅を検出するたびに追記し、発車時刻を書き足す', async () => {
    const { store } = setup();
    act(() => store.set(arrivedAtom, false));
    act(() => {
      store.set(stationAtom, c);
      store.set(arrivedAtom, true);
    });
    await flush();
    expect(insertRideSession).toHaveBeenCalledTimes(1);

    tick(30_000);
    const departedAt = now;
    act(() => store.set(arrivedAtom, false));
    await flush();
    expect(updateRideStopDeparture).toHaveBeenCalledWith(
      'session-1',
      1,
      departedAt
    );

    tick(60_000);
    act(() => {
      store.set(stationAtom, d);
      store.set(arrivedAtom, true);
    });
    await flush();
    expect(appendRideStop).toHaveBeenCalledWith(
      'session-1',
      expect.objectContaining({
        seq: 2,
        stationId: 4,
        kind: 'arrived',
        arrivedAt: now,
        distanceFromPrevious: getRideDistanceMeters(stations, c, d, false),
      })
    );
  });

  it('セッションの書き込みに失敗したら、次の発車で溜めた駅ごと書き直し、以降は追記する', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    (insertRideSession as jest.Mock).mockRejectedValueOnce(new Error('db'));
    const { store } = setup();
    act(() => store.set(arrivedAtom, false));
    act(() => {
      store.set(stationAtom, c);
      store.set(arrivedAtom, true);
    });
    await flush();
    expect(insertRideSession).toHaveBeenCalledTimes(1);

    tick(30_000);
    const departedAt = now;
    act(() => store.set(arrivedAtom, false));
    await flush();
    expect(insertRideSession).toHaveBeenCalledTimes(2);
    const [, retried] = (insertRideSession as jest.Mock).mock.calls[1];
    expect(retried.map((s: { stationId: number }) => s.stationId)).toEqual([
      1, 3,
    ]);
    // 書き直しの時点で分かっている発車時刻は、駅の行に含めて書く
    expect(retried[1].departedAt).toBe(departedAt);
    expect(updateRideStopDeparture).not.toHaveBeenCalled();

    act(() => {
      store.set(stationAtom, d);
      store.set(arrivedAtom, true);
    });
    await flush();
    expect(appendRideStop).toHaveBeenCalledWith(
      'session-1',
      expect.objectContaining({ seq: 2, stationId: 4 })
    );
    consoleErrorSpy.mockRestore();
  });

  it('最初の書き込み中に着いた駅も、書き込みが失敗したら書き直しに含める', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    let rejectFirst: (err: Error) => void = () => {};
    (insertRideSession as jest.Mock).mockImplementationOnce(
      () =>
        new Promise<void>((_, reject) => {
          rejectFirst = reject;
        })
    );
    const { store } = setup();
    act(() => store.set(arrivedAtom, false));
    act(() => {
      store.set(stationAtom, c);
      store.set(arrivedAtom, true);
    });
    await flush();
    // 最初の書き込みが終わる前に次の駅へ着く
    act(() => store.set(arrivedAtom, false));
    act(() => {
      store.set(stationAtom, d);
      store.set(arrivedAtom, true);
    });
    await flush();
    expect(insertRideSession).toHaveBeenCalledTimes(1);

    await act(async () => {
      rejectFirst(new Error('db'));
    });
    await flush();

    // 失敗したセッションへの追記ではなく、着いた駅まで含めて書き直す
    expect(appendRideStop).not.toHaveBeenCalled();
    expect(insertRideSession).toHaveBeenCalledTimes(2);
    const [, retried] = (insertRideSession as jest.Mock).mock.calls[1];
    expect(retried.map((s: { stationId: number }) => s.stationId)).toEqual([
      1, 3, 4,
    ]);
    consoleErrorSpy.mockRestore();
  });

  it('最後の到着で書き込みに失敗しても、画面を抜けるときに書き直す', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    (insertRideSession as jest.Mock).mockRejectedValueOnce(new Error('db'));
    const { store, hook } = setup();
    act(() => store.set(arrivedAtom, false));
    act(() => {
      store.set(stationAtom, c);
      store.set(arrivedAtom, true);
    });
    await flush();
    expect(insertRideSession).toHaveBeenCalledTimes(1);

    hook.unmount();
    await flush();
    expect(insertRideSession).toHaveBeenCalledTimes(2);
    const [, retried] = (insertRideSession as jest.Mock).mock.calls[1];
    expect(retried.map((s: { stationId: number }) => s.stationId)).toEqual([
      1, 3,
    ]);
    consoleErrorSpy.mockRestore();
  });

  it('書き込みが済んでいれば、画面を抜けても書き直さない', async () => {
    const { store, hook } = setup();
    act(() => store.set(arrivedAtom, false));
    act(() => {
      store.set(stationAtom, c);
      store.set(arrivedAtom, true);
    });
    await flush();
    hook.unmount();
    await flush();
    expect(insertRideSession).toHaveBeenCalledTimes(1);
    expect(appendRideStop).not.toHaveBeenCalled();
  });

  it('途中の駅を取りこぼしても、あいだの駅をたどった距離で記録する', async () => {
    const { store } = setup();
    act(() => store.set(arrivedAtom, false));
    act(() => {
      store.set(stationAtom, e);
      store.set(arrivedAtom, true);
    });
    await flush();
    const [, stops] = (insertRideSession as jest.Mock).mock.calls[0];
    expect(stops[1].distanceFromPrevious).toBe(
      getRideDistanceMeters(stations, a, e, false)
    );
  });

  it('オートモードを一度でも有効にしたら、画面を抜けるまで記録しない', async () => {
    const { store } = setup();
    act(() => store.set(autoModeEnabledAtom, true));
    act(() => store.set(stationAtom, c));
    act(() => store.set(autoModeEnabledAtom, false));
    act(() => {
      store.set(stationAtom, d);
      store.set(arrivedAtom, true);
    });
    await flush();
    expect(insertRideSession).not.toHaveBeenCalled();
    expect(appendRideStop).not.toHaveBeenCalled();
  });
});
