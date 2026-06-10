import type * as Location from 'expo-location';
import { createStore } from 'jotai';
import { locationAtom } from '~/store/atoms/location';
import { locationAccuracyAtom } from './location';

const buildLocation = (accuracy: number | null): Location.LocationObject => ({
  timestamp: Date.now(),
  coords: {
    latitude: 35.0,
    longitude: 139.0,
    accuracy,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  },
});

describe('location selectors', () => {
  it('位置情報が無い場合はnullを返す', () => {
    const store = createStore();
    expect(store.get(locationAccuracyAtom)).toBeNull();
  });

  it('accuracyを導出する', () => {
    const store = createStore();
    store.set(locationAtom, buildLocation(12));
    expect(store.get(locationAccuracyAtom)).toBe(12);
  });

  it('accuracyが変わらない座標更新では購読者に通知しない', () => {
    const store = createStore();
    store.set(locationAtom, buildLocation(12));
    const listener = jest.fn();
    const unsub = store.sub(locationAccuracyAtom, listener);

    store.set(locationAtom, buildLocation(12));
    expect(listener).not.toHaveBeenCalled();

    store.set(locationAtom, buildLocation(30));
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();
  });
});
