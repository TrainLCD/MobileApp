import { act, render } from '@testing-library/react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import type React from 'react';
import { AppState, Text } from 'react-native';
import { useKeepAwake } from './useKeepAwake';

jest.mock('expo-keep-awake', () => ({
  __esModule: true,
  activateKeepAwakeAsync: jest.fn().mockResolvedValue(undefined),
  deactivateKeepAwake: jest.fn().mockResolvedValue(undefined),
}));

const mockAddEventListener = jest.fn();
const mockRemove = jest.fn();

jest.spyOn(AppState, 'addEventListener').mockImplementation((_, handler) => {
  mockAddEventListener(handler);
  return { remove: mockRemove };
});

const TestComponent: React.FC = () => {
  useKeepAwake();
  return <Text testID="test">Test</Text>;
};

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('useKeepAwake', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('マウント時にdeactivate→activateの順で呼ばれてネイティブ側のtagsをクリアする', async () => {
    render(<TestComponent />);

    await act(async () => {
      await flushPromises();
    });

    expect(deactivateKeepAwake).toHaveBeenCalledWith('TrainLCDMainKeepAwake');
    expect(activateKeepAwakeAsync).toHaveBeenCalledWith(
      'TrainLCDMainKeepAwake'
    );

    const deactivateOrder = (deactivateKeepAwake as jest.Mock).mock
      .invocationCallOrder[0];
    const activateOrder = (activateKeepAwakeAsync as jest.Mock).mock
      .invocationCallOrder[0];
    expect(deactivateOrder).toBeLessThan(activateOrder);
  });

  it('AppStateがactiveに復帰したときにdeactivate→activateを再実行する', async () => {
    render(<TestComponent />);

    await act(async () => {
      await flushPromises();
    });

    (deactivateKeepAwake as jest.Mock).mockClear();
    (activateKeepAwakeAsync as jest.Mock).mockClear();

    const handler = mockAddEventListener.mock.calls[0][0];

    await act(async () => {
      handler('active');
      await flushPromises();
    });

    expect(deactivateKeepAwake).toHaveBeenCalledWith('TrainLCDMainKeepAwake');
    expect(activateKeepAwakeAsync).toHaveBeenCalledWith(
      'TrainLCDMainKeepAwake'
    );
  });

  it('AppStateがbackgroundのときは再実行されない', async () => {
    render(<TestComponent />);

    await act(async () => {
      await flushPromises();
    });

    (deactivateKeepAwake as jest.Mock).mockClear();
    (activateKeepAwakeAsync as jest.Mock).mockClear();

    const handler = mockAddEventListener.mock.calls[0][0];

    await act(async () => {
      handler('background');
      await flushPromises();
    });

    expect(deactivateKeepAwake).not.toHaveBeenCalled();
    expect(activateKeepAwakeAsync).not.toHaveBeenCalled();
  });

  it('アンマウント時にリスナー解除とdeactivateが呼ばれる', async () => {
    const { unmount } = render(<TestComponent />);

    await act(async () => {
      await flushPromises();
    });

    (deactivateKeepAwake as jest.Mock).mockClear();

    unmount();

    expect(mockRemove).toHaveBeenCalled();
    expect(deactivateKeepAwake).toHaveBeenCalledWith('TrainLCDMainKeepAwake');
  });

  it('deactivateが失敗してもactivateが続行され、cleanupの例外も握りつぶされる', async () => {
    (deactivateKeepAwake as jest.Mock).mockRejectedValueOnce(
      new Error('current activity unavailable')
    );

    const { unmount } = render(<TestComponent />);

    await act(async () => {
      await flushPromises();
    });

    expect(activateKeepAwakeAsync).toHaveBeenCalledWith(
      'TrainLCDMainKeepAwake'
    );

    (deactivateKeepAwake as jest.Mock).mockRejectedValueOnce(
      new Error('current activity unavailable')
    );

    expect(() => unmount()).not.toThrow();
  });
});
