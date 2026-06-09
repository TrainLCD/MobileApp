import { createStore } from 'jotai';
import stationState from '~/store/atoms/station';
import { approachingAtom, arrivedAtom } from './station';

describe('station selectors', () => {
  it('stationStateのフィールド値を導出する', () => {
    const store = createStore();
    store.set(stationState, {
      ...store.get(stationState),
      arrived: true,
      approaching: false,
    });
    expect(store.get(arrivedAtom)).toBe(true);
    expect(store.get(approachingAtom)).toBe(false);
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
