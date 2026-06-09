import { createStore } from 'jotai';
import navigationState from '~/store/atoms/navigation';
import { enabledLanguagesAtom, leftStationsAtom } from './navigation';

describe('navigation selectors', () => {
  it('navigationStateのフィールド値を導出する', () => {
    const store = createStore();
    const { leftStations, enabledLanguages } = store.get(navigationState);
    expect(store.get(leftStationsAtom)).toBe(leftStations);
    expect(store.get(enabledLanguagesAtom)).toBe(enabledLanguages);
  });

  it('headerStateのローテーションでは購読者に通知しない', () => {
    const store = createStore();
    const listener = jest.fn();
    const unsub = store.sub(leftStationsAtom, listener);

    store.set(navigationState, {
      ...store.get(navigationState),
      headerState: 'NEXT',
    });
    expect(listener).not.toHaveBeenCalled();

    store.set(navigationState, {
      ...store.get(navigationState),
      leftStations: [],
    });
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();
  });
});
