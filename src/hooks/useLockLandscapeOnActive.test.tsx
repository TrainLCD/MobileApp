import { act, render } from '@testing-library/react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { createStore, Provider } from 'jotai';
import type React from 'react';
import { AppState, Text } from 'react-native';
import reportModalVisibleAtom from '~/store/atoms/reportModal';
import { useLockLandscapeOnActive } from './useLockLandscapeOnActive';

jest.mock('expo-screen-orientation', () => ({
  __esModule: true,
  lockAsync: jest.fn().mockResolvedValue(undefined),
  OrientationLock: {
    LANDSCAPE: 'LANDSCAPE',
  },
}));

const mockAddEventListener = jest.fn();
const mockRemove = jest.fn();

jest.spyOn(AppState, 'addEventListener').mockImplementation((_, handler) => {
  mockAddEventListener(handler);
  return { remove: mockRemove };
});

const TestComponent: React.FC = () => {
  useLockLandscapeOnActive();
  return <Text testID="test">Test</Text>;
};

describe('useLockLandscapeOnActive', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    jest.clearAllMocks();
  });

  it('reportModalが表示されていない時、AppStateがactiveになるとlockAsyncが呼ばれる', () => {
    store.set(reportModalVisibleAtom, false);

    render(
      <Provider store={store}>
        <TestComponent />
      </Provider>
    );

    expect(mockAddEventListener).toHaveBeenCalled();
    const handler = mockAddEventListener.mock.calls[0][0];

    act(() => {
      handler('active');
    });

    expect(ScreenOrientation.lockAsync).toHaveBeenCalledWith(
      ScreenOrientation.OrientationLock.LANDSCAPE
    );
  });

  it('reportModalが表示されている時、AppStateがactiveになってもlockAsyncが呼ばれない', () => {
    store.set(reportModalVisibleAtom, true);

    render(
      <Provider store={store}>
        <TestComponent />
      </Provider>
    );

    expect(mockAddEventListener).toHaveBeenCalled();
    const handler = mockAddEventListener.mock.calls[0][0];

    act(() => {
      handler('active');
    });

    expect(ScreenOrientation.lockAsync).not.toHaveBeenCalled();
  });

  it('AppStateがactive以外の場合はlockAsyncが呼ばれない', () => {
    store.set(reportModalVisibleAtom, false);

    render(
      <Provider store={store}>
        <TestComponent />
      </Provider>
    );

    const handler = mockAddEventListener.mock.calls[0][0];

    act(() => {
      handler('background');
    });

    expect(ScreenOrientation.lockAsync).not.toHaveBeenCalled();
  });

  it('アンマウント時にリスナーが削除される', () => {
    const { unmount } = render(
      <Provider store={store}>
        <TestComponent />
      </Provider>
    );

    expect(AppState.addEventListener).toHaveBeenCalled();

    unmount();

    expect(mockRemove).toHaveBeenCalled();
  });

  it('reportModalVisibleAtomが変更されるとリスナーが再登録される', () => {
    store.set(reportModalVisibleAtom, false);

    const { rerender } = render(
      <Provider store={store}>
        <TestComponent />
      </Provider>
    );

    expect(mockAddEventListener).toHaveBeenCalledTimes(1);

    act(() => {
      store.set(reportModalVisibleAtom, true);
    });

    rerender(
      <Provider store={store}>
        <TestComponent />
      </Provider>
    );

    // 依存配列が変更されたのでリスナーが再登録される
    expect(mockRemove).toHaveBeenCalled();
  });
});
