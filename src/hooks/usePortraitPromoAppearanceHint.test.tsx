import { act, renderHook } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import type React from 'react';
import { storage } from '~/lib/storage';
import {
  portraitModeEnabledAtom,
  portraitPromoAppearanceSeenAtom,
} from '~/store/atoms/display';
import { finishPortraitPromo } from '~/utils/portraitPromo';
import { usePortraitPromoAppearanceHint } from './usePortraitPromoAppearanceHint';

const renderHint = (store: ReturnType<typeof createStore>) =>
  renderHook(() => usePortraitPromoAppearanceHint(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    ),
  });

const buildStore = ({
  appearanceSeen = false,
  portraitModeEnabled = false,
} = {}) => {
  const store = createStore();
  store.set(portraitPromoAppearanceSeenAtom, appearanceSeen);
  store.set(portraitModeEnabledAtom, portraitModeEnabled);
  return store;
};

describe('usePortraitPromoAppearanceHint', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('未読かつ無効なら印を出す', () => {
    const { result } = renderHint(buildStore());

    expect(result.current).toBe(true);
  });

  it('外観画面を開いたら印を消す（再マウントを待たずに反映する）', () => {
    const store = buildStore();
    const { result } = renderHint(store);

    expect(result.current).toBe(true);

    act(() => {
      store.set(portraitPromoAppearanceSeenAtom, true);
    });

    expect(result.current).toBe(false);
  });

  it('ポートレートモードを有効にしたら印を消す', () => {
    const store = buildStore();
    const { result } = renderHint(store);

    act(() => {
      store.set(portraitModeEnabledAtom, true);
    });

    expect(result.current).toBe(false);
  });

  it('訴求を打ち切ったあとは印を出さない', () => {
    finishPortraitPromo();

    const { result } = renderHint(buildStore());

    expect(result.current).toBe(false);
  });
});
