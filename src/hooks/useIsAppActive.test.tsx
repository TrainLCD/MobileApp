import { act, render } from '@testing-library/react-native';
import type React from 'react';
import { AppState, Text } from 'react-native';
import { useIsAppActive } from './useIsAppActive';

const mockAddEventListener = jest.fn();
const mockRemove = jest.fn();

jest.spyOn(AppState, 'addEventListener').mockImplementation((_, handler) => {
  mockAddEventListener(handler);
  return { remove: mockRemove };
});

let latestValue: boolean | null = null;

const TestComponent: React.FC = () => {
  latestValue = useIsAppActive();
  return <Text testID="test">{String(latestValue)}</Text>;
};

describe('useIsAppActive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    latestValue = null;
    (AppState as { currentState: string }).currentState = 'active';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('マウント時点でAppStateがactiveならtrueを返す', () => {
    (AppState as { currentState: string }).currentState = 'active';
    render(<TestComponent />);
    expect(latestValue).toBe(true);
  });

  it('マウント時点でAppStateがbackgroundならfalseを返す', () => {
    (AppState as { currentState: string }).currentState = 'background';
    render(<TestComponent />);
    expect(latestValue).toBe(false);
  });

  it('backgroundへ移行するとfalse、activeへ復帰するとtrueになる', () => {
    render(<TestComponent />);
    const handler = mockAddEventListener.mock.calls[0][0];

    act(() => {
      handler('background');
    });
    expect(latestValue).toBe(false);

    act(() => {
      handler('active');
    });
    expect(latestValue).toBe(true);
  });

  it('inactiveへ移行するとfalseになる', () => {
    render(<TestComponent />);
    const handler = mockAddEventListener.mock.calls[0][0];

    act(() => {
      handler('inactive');
    });
    expect(latestValue).toBe(false);
  });

  it('アンマウント時にリスナーが解除される', () => {
    const { unmount } = render(<TestComponent />);
    unmount();
    expect(mockRemove).toHaveBeenCalled();
  });
});
