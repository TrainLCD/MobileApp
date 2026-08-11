import { renderHook } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import type React from 'react';
import { BackHandler } from 'react-native';
import tuningState from '~/store/atoms/tuning';
import { usePreventBackInUntouchableMode } from './usePreventBackInUntouchableMode';

let mockIsFocused = true;

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => mockIsFocused,
}));

const renderWithStore = (untouchableModeEnabled: boolean) => {
  const store = createStore();
  store.set(tuningState, (prev) => ({ ...prev, untouchableModeEnabled }));

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );

  return renderHook(() => usePreventBackInUntouchableMode(), { wrapper });
};

describe('usePreventBackInUntouchableMode', () => {
  const mockRemove = jest.fn();
  let addEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    mockIsFocused = true;
    addEventListenerSpy = jest
      .spyOn(BackHandler, 'addEventListener')
      .mockReturnValue({ remove: mockRemove } as ReturnType<
        typeof BackHandler.addEventListener
      >);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('タッチ不可モードが有効な場合は戻る操作を握りつぶす', () => {
    renderWithStore(true);

    expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
    const [eventName, handler] = addEventListenerSpy.mock.calls[0];
    expect(eventName).toBe('hardwareBackPress');
    // trueを返すことで戻る操作が画面遷移へ伝播しない
    expect(handler()).toBe(true);
  });

  it('タッチ不可モードが無効な場合は戻る操作を購読しない', () => {
    renderWithStore(false);

    expect(addEventListenerSpy).not.toHaveBeenCalled();
  });

  it('走行画面がフォーカスを失っている場合は購読しない', () => {
    mockIsFocused = false;

    renderWithStore(true);

    expect(addEventListenerSpy).not.toHaveBeenCalled();
  });

  it('アンマウント時に購読を解除する', () => {
    const { unmount } = renderWithStore(true);

    unmount();

    expect(mockRemove).toHaveBeenCalledTimes(1);
  });
});
