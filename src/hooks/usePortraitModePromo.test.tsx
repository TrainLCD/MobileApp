import { act, renderHook } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import type React from 'react';
import { STORAGE_KEYS } from '~/constants/storage';
import { storage } from '~/lib/storage';
import { portraitModeEnabledAtom } from '~/store/atoms/display';
import { arrivedAtom, selectedBoundAtom } from '~/store/atoms/station';
import tuningState from '~/store/atoms/tuning';
import {
  isPortraitPromoFinished,
  PORTRAIT_PROMPT_MAX_COUNT,
  recordPortraitPromptDismissed,
} from '~/utils/portraitPromo';
import {
  PORTRAIT_HOLD_DURATION_MS,
  usePortraitModePromo,
} from './usePortraitModePromo';

const mockDimensions = { width: 360, height: 780 };
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => mockDimensions,
}));

jest.mock('~/translation', () => ({
  translate: (key: string) => key,
}));

jest.mock('~/utils/dialogPresentation', () => ({
  showDialog: jest.fn(),
}));

type Options = {
  portraitModeEnabled?: boolean;
  arrived?: boolean;
  hasBound?: boolean;
  untouchableModeEnabled?: boolean;
};

const buildStore = ({
  portraitModeEnabled = false,
  arrived = true,
  hasBound = true,
  untouchableModeEnabled = false,
}: Options = {}) => {
  const store = createStore();
  store.set(portraitModeEnabledAtom, portraitModeEnabled);
  store.set(arrivedAtom, arrived);
  store.set(
    selectedBoundAtom,
    hasBound ? ({ id: 1, name: '東京' } as never) : null
  );
  store.set(tuningState, (prev) => ({ ...prev, untouchableModeEnabled }));
  return store;
};

const renderPromo = (store: ReturnType<typeof createStore>) =>
  renderHook(() => usePortraitModePromo(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    ),
  });

const holdPortrait = () => {
  act(() => {
    jest.advanceTimersByTime(PORTRAIT_HOLD_DURATION_MS);
  });
};

describe('usePortraitModePromo', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    storage.clearAll();
    mockDimensions.width = 360;
    mockDimensions.height = 780;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('縦持ちが一定時間続いたら表示する', () => {
    const { result } = renderPromo(buildStore());

    expect(result.current.visible).toBe(false);

    holdPortrait();

    expect(result.current.visible).toBe(true);
  });

  it('端末が横向きの間は表示しない', () => {
    mockDimensions.width = 780;
    mockDimensions.height = 360;

    const { result } = renderPromo(buildStore());
    holdPortrait();

    expect(result.current.visible).toBe(false);
  });

  it('走行中(未到着)は表示しない', () => {
    const { result } = renderPromo(buildStore({ arrived: false }));
    holdPortrait();

    expect(result.current.visible).toBe(false);
  });

  it('行先未選択のときは表示しない', () => {
    const { result } = renderPromo(buildStore({ hasBound: false }));
    holdPortrait();

    expect(result.current.visible).toBe(false);
  });

  it('無操作モード中は表示しない', () => {
    const { result } = renderPromo(
      buildStore({ untouchableModeEnabled: true })
    );
    holdPortrait();

    expect(result.current.visible).toBe(false);
  });

  it('すでにポートレートモードが有効なら表示しない', () => {
    const { result } = renderPromo(buildStore({ portraitModeEnabled: true }));
    holdPortrait();

    expect(result.current.visible).toBe(false);
  });

  it('上限まで提示済みなら表示しない', () => {
    for (let i = 0; i < PORTRAIT_PROMPT_MAX_COUNT; i++) {
      recordPortraitPromptDismissed(i);
    }

    const { result } = renderPromo(buildStore());
    holdPortrait();

    expect(result.current.visible).toBe(false);
  });

  it('「オンにする」で設定を保存し、以降の訴求を打ち切る', () => {
    const store = buildStore();
    const { result } = renderPromo(store);
    holdPortrait();

    act(() => {
      result.current.enable();
    });

    expect(result.current.visible).toBe(false);
    expect(store.get(portraitModeEnabledAtom)).toBe(true);
    expect(storage.getString(STORAGE_KEYS.PORTRAIT_MODE_ENABLED)).toBe('true');
    expect(isPortraitPromoFinished()).toBe(true);
  });

  it('「今はしない」で閉じると提示回数を記録する', () => {
    const store = buildStore();
    const { result } = renderPromo(store);
    holdPortrait();

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.visible).toBe(false);
    expect(store.get(portraitModeEnabledAtom)).toBe(false);
    expect(storage.getString(STORAGE_KEYS.PORTRAIT_PROMO_PROMPT_COUNT)).toBe(
      '1'
    );
    expect(isPortraitPromoFinished()).toBe(false);
  });
});
