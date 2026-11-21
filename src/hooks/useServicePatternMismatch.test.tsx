import { act, renderHook } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import type { PropsWithChildren } from 'react';
import { type Line, type Station, StopCondition } from '~/@types/graphql';
import { selectedLineAtom } from '~/store/atoms/line';
import { rawLocationAtom } from '~/store/atoms/location';
import { autoModeEnabledAtom } from '~/store/atoms/navigation';
import {
  servicePatternDetectionEnabledAtom,
  servicePatternWarningAtom,
} from '~/store/atoms/servicePatternMismatch';
import {
  selectedBoundAtom,
  selectedDirectionAtom,
  stationsAtom,
} from '~/store/atoms/station';
import { useServicePatternMismatch } from './useServicePatternMismatch';

jest.mock('~/utils/isDevApp', () => ({ isCanaryApp: true, isDevApp: true }));
jest.mock('./useLoopLine', () => ({
  useLoopLine: () => ({ isLoopLine: false }),
}));
jest.mock('./useGraphQLQuery', () => ({
  useGraphQLQuery: () => ({ data: undefined }),
}));

it('有効化後の測位だけで警告し、設定・経路・オートモードの変更で警告を破棄する', () => {
  const store = createStore();
  const latitudeAt = (meters: number) => 35 + meters / 111_320;
  const stations = [-500, 0, 500].map(
    (meters, i) =>
      ({
        id: i + 1,
        groupId: i + 1,
        latitude: latitudeAt(meters),
        longitude: 139,
        stopCondition: StopCondition.All,
      }) as Station
  );
  store.set(stationsAtom, stations);
  store.set(selectedLineAtom, { id: 1 } as Line);
  store.set(selectedBoundAtom, stations[2]);
  store.set(selectedDirectionAtom, 'INBOUND');

  renderHook(() => useServicePatternMismatch(), {
    wrapper: ({ children }: PropsWithChildren) => (
      <Provider store={store}>{children}</Provider>
    ),
  });

  const start = Date.now() - 11_000;
  const sendFix = (meters: number, timestamp: number) => {
    store.set(rawLocationAtom, {
      timestamp,
      coords: {
        latitude: latitudeAt(meters),
        longitude: 139,
        speed: 15,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
      },
    });
  };
  sendFix(-75, start);
  sendFix(75, start + 10_000);
  expect(store.get(servicePatternWarningAtom)).toBeNull();

  let now = Date.now();
  const clock = jest.spyOn(Date, 'now').mockImplementation(() => now);
  try {
    act(() => store.set(servicePatternDetectionEnabledAtom, true));
    sendFix(75, now);
    expect(store.get(servicePatternWarningAtom)).toBeNull();

    const pass = () => {
      now += 1_000;
      sendFix(-75, now);
      now += 10_000;
      sendFix(75, now);
      expect(store.get(servicePatternWarningAtom)).toEqual({
        kind: 'rail-pass',
        station: stations[1],
      });
    };

    // 初回の測位が駅の先なので、一度区間を空けてから手前→奥を入力する。
    now += 12_000;
    pass();
    act(() => store.set(servicePatternDetectionEnabledAtom, false));
    expect(store.get(servicePatternWarningAtom)).toBeNull();

    act(() => store.set(servicePatternDetectionEnabledAtom, true));
    pass();
    act(() => store.set(autoModeEnabledAtom, true));
    expect(store.get(servicePatternWarningAtom)).toBeNull();

    act(() => store.set(autoModeEnabledAtom, false));
    pass();
    act(() => store.set(stationsAtom, [...stations]));
    expect(store.get(servicePatternWarningAtom)).toBeNull();
  } finally {
    clock.mockRestore();
  }
});
