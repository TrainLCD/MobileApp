import { act, renderHook } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import type React from 'react';
import { DEFAULT_BOTTOM_TRANSITION_INTERVAL } from '~/constants';
import { THEME_PREFERENCE, type ThemePreference } from '~/models/Theme';
import { portraitModeEnabledAtom } from '~/store/atoms/experimental';
import { bottomStateAtom } from '~/store/atoms/navigation';
import { themePreferenceAtom } from '~/store/atoms/theme';
import { useUpdateBottomState } from './useUpdateBottomState';

// 乗換路線が1件でもあれば LINE -> TRANSFER へ進む
jest.mock('./useTransferLines', () => ({
  useTransferLines: () => [{ id: 1 }],
}));
jest.mock('./useTypeWillChange', () => ({
  useTypeWillChange: () => false,
}));
jest.mock('./useShouldHideTypeChange', () => ({
  useShouldHideTypeChange: () => false,
}));

const mockLayout = { isPortrait: false };
jest.mock('./useLandscapeWindowDimensions', () => ({
  useLandscapeWindowDimensions: () => ({
    width: 800,
    height: 400,
    isPortrait: mockLayout.isPortrait,
  }),
}));

const renderWithStore = (store: ReturnType<typeof createStore>) =>
  renderHook(() => useUpdateBottomState(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    ),
  });

const buildStore = ({
  theme,
  portraitModeEnabled,
  isPortrait,
}: {
  theme: ThemePreference;
  portraitModeEnabled: boolean;
  isPortrait: boolean;
}) => {
  const store = createStore();
  store.set(themePreferenceAtom, theme);
  store.set(portraitModeEnabledAtom, portraitModeEnabled);
  mockLayout.isPortrait = isPortrait;
  return store;
};

const advanceOneInterval = () => {
  act(() => {
    jest.advanceTimersByTime(DEFAULT_BOTTOM_TRANSITION_INTERVAL);
  });
};

describe('useUpdateBottomState', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    mockLayout.isPortrait = false;
  });

  it('通常のテーマでは一定間隔でのりかえ案内へ進む', () => {
    const store = buildStore({
      theme: THEME_PREFERENCE.TOKYO_METRO,
      portraitModeEnabled: false,
      isPortrait: false,
    });
    renderWithStore(store);

    advanceOneInterval();

    expect(store.get(bottomStateAtom)).toBe('TRANSFER');
  });

  it('横画面の電光掲示板風テーマは下部の領域を持たないので切り替えない', () => {
    const store = buildStore({
      theme: THEME_PREFERENCE.LED,
      portraitModeEnabled: false,
      isPortrait: false,
    });
    renderWithStore(store);

    advanceOneInterval();

    expect(store.get(bottomStateAtom)).toBe('LINE');
  });

  it('ポートレートレイアウト中は電光掲示板風テーマでも切り替える', () => {
    // ポートレートは路線テーマに依存しない独自の画面なので、
    // 電光掲示板風テーマを選んでいてものりかえ案内は出す
    const store = buildStore({
      theme: THEME_PREFERENCE.LED,
      portraitModeEnabled: true,
      isPortrait: true,
    });
    renderWithStore(store);

    advanceOneInterval();

    expect(store.get(bottomStateAtom)).toBe('TRANSFER');
  });

  it('ポートレートモードが有効でも端末が横向きなら従来どおり切り替えない', () => {
    const store = buildStore({
      theme: THEME_PREFERENCE.LED,
      portraitModeEnabled: true,
      isPortrait: false,
    });
    renderWithStore(store);

    advanceOneInterval();

    expect(store.get(bottomStateAtom)).toBe('LINE');
  });
});
