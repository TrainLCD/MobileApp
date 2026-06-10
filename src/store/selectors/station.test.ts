import { createStore } from 'jotai';
import type { Station } from '~/@types/graphql';
import stationState from '~/store/atoms/station';
import { approachingAtom, arrivedAtom, stationsAtom } from './station';

describe('station selectors', () => {
  it('stationStateのフィールド値を導出する', () => {
    const store = createStore();
    const stations = [{ id: 1, name: 'テスト駅' }] as Station[];
    store.set(stationState, {
      ...store.get(stationState),
      arrived: true,
      approaching: false,
      stations,
    });
    expect(store.get(arrivedAtom)).toBe(true);
    expect(store.get(approachingAtom)).toBe(false);
    expect(store.get(stationsAtom)).toBe(stations);
  });

  it('stationsAtomは無関係なフィールドの変更では購読者に通知しない', () => {
    const store = createStore();
    const listener = jest.fn();
    const unsub = store.sub(stationsAtom, listener);

    // stationsはそのままarrivedだけ変更
    store.set(stationState, {
      ...store.get(stationState),
      arrived: !store.get(stationState).arrived,
    });
    expect(listener).not.toHaveBeenCalled();

    // stationsの差し替えは通知される
    store.set(stationState, {
      ...store.get(stationState),
      stations: [{ id: 2, name: '新しい駅' }] as Station[],
    });
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();
  });

  it('無関係なフィールドの変更では購読者に通知しない', () => {
    const store = createStore();
    const listener = jest.fn();
    const unsub = store.sub(arrivedAtom, listener);

    // arrivedはそのままapproachingだけ変更
    store.set(stationState, {
      ...store.get(stationState),
      approaching: true,
    });
    expect(listener).not.toHaveBeenCalled();

    // arrivedの変更は通知される
    store.set(stationState, {
      ...store.get(stationState),
      arrived: !store.get(stationState).arrived,
    });
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();
  });
});
