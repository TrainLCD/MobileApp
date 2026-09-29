import { act, renderHook } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import type React from 'react';
import {
  rideLogEnabledAtom,
  rideLogSettingsSeenAtom,
} from '~/store/atoms/rideLog';
import { useRideLogSettingsHint } from './useRideLogSettingsHint';

const renderHint = (store: ReturnType<typeof createStore>) =>
  renderHook(() => useRideLogSettingsHint(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    ),
  });

const buildStore = ({ seen = false, enabled = false } = {}) => {
  const store = createStore();
  store.set(rideLogSettingsSeenAtom, seen);
  store.set(rideLogEnabledAtom, enabled);
  return store;
};

describe('useRideLogSettingsHint', () => {
  it('振り返りの設定を開いておらず、有効にもしていなければ出す', () => {
    const { result } = renderHint(buildStore());
    expect(result.current).toBe(true);
  });

  it('振り返りの設定を開いたら出さない', () => {
    const { result } = renderHint(buildStore({ seen: true }));
    expect(result.current).toBe(false);
  });

  it('振り返りを有効にしていれば出さない', () => {
    const { result } = renderHint(buildStore({ enabled: true }));
    expect(result.current).toBe(false);
  });

  it('振り返りの設定を開いた時点で、再マウントされなくても消える', () => {
    const store = buildStore();
    const { result } = renderHint(store);
    expect(result.current).toBe(true);
    act(() => {
      store.set(rideLogSettingsSeenAtom, true);
    });
    expect(result.current).toBe(false);
  });
});
