import { act, renderHook } from '@testing-library/react-native';
import { Image } from 'expo-image';
import { AppState, type AppStateStatus } from 'react-native';
import { useTrimMemoryOnBackground } from './useTrimMemoryOnBackground';

jest.mock('expo-image', () => ({
  Image: { clearMemoryCache: jest.fn(() => Promise.resolve(true)) },
}));

const clearMemoryCache = Image.clearMemoryCache as jest.Mock;

let listener: ((state: AppStateStatus) => void) | undefined;
const remove = jest.fn();

beforeEach(() => {
  listener = undefined;
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_type, handler) => {
      listener = handler as (state: AppStateStatus) => void;
      return { remove } as ReturnType<typeof AppState.addEventListener>;
    });
});

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

const emit = (state: AppStateStatus) =>
  act(() => {
    listener?.(state);
  });

describe('useTrimMemoryOnBackground', () => {
  it("'background' でメモリキャッシュを破棄する", () => {
    renderHook(() => useTrimMemoryOnBackground());

    emit('background');

    expect(clearMemoryCache).toHaveBeenCalledTimes(1);
  });

  it("'active' と 'inactive' では破棄しない", () => {
    renderHook(() => useTrimMemoryOnBackground());

    // 'inactive' は iOS のアプリスイッチャー表示などで頻発し、すぐ 'active' に戻る。
    // ここで破棄すると復帰のたびに再デコードが走る
    emit('inactive');
    emit('active');

    expect(clearMemoryCache).not.toHaveBeenCalled();
  });

  it('clearMemoryCache の失敗を握りつぶす', () => {
    clearMemoryCache.mockRejectedValueOnce(new Error('failed'));
    renderHook(() => useTrimMemoryOnBackground());

    expect(() => emit('background')).not.toThrow();
  });

  it('アンマウントでリスナーを解除する', () => {
    const { unmount } = renderHook(() => useTrimMemoryOnBackground());

    unmount();

    expect(remove).toHaveBeenCalledTimes(1);
  });
});
