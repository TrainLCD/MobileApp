import { act, renderHook } from '@testing-library/react-hooks';
import { AppState } from 'react-native';
import useAppState from '../../src/hooks/useAppState';

describe('useAppState', () => {
  it('AppStateの変更が監視できてるはず', () => {
    AppState.currentState = 'active';
    const appStateSpy = jest.spyOn(AppState, 'addEventListener');
    const { result } = renderHook(() => useAppState());

    expect(result.current).toBe('active');
    act(() => {
      appStateSpy.mock.calls[0][1]('background');
    });
    expect(result.current).toBe('background');
    appStateSpy.mockRestore();
  });
});
