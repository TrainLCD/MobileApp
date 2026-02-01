import { act, renderHook } from '@testing-library/react-native';
import { useTTSCache } from './useTTSCache';

describe('useTTSCache', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should store and retrieve cache entries', () => {
    const { result } = renderHook(() => useTTSCache());

    act(() => {
      result.current.store(
        'test-id-1',
        { text: 'テスト1', path: '/path/to/test1_ja.mp3' },
        { text: 'Test 1', path: '/path/to/test1_en.mp3' }
      );
    });

    const cache = result.current.getByText('テスト1');
    expect(cache).not.toBeNull();
    expect(cache?.id).toBe('test-id-1');
    expect(cache?.ja.text).toBe('テスト1');
    expect(cache?.en.text).toBe('Test 1');
  });

  it('should return null for non-existent cache', () => {
    const { result } = renderHook(() => useTTSCache());

    const cache = result.current.getByText('存在しないテキスト');
    expect(cache).toBeNull();
  });

  it('should clear all cache entries', () => {
    const { result } = renderHook(() => useTTSCache());

    act(() => {
      result.current.store(
        'test-id-1',
        { text: 'テスト1', path: '/path/to/test1_ja.mp3' },
        { text: 'Test 1', path: '/path/to/test1_en.mp3' }
      );
      result.current.store(
        'test-id-2',
        { text: 'テスト2', path: '/path/to/test2_ja.mp3' },
        { text: 'Test 2', path: '/path/to/test2_en.mp3' }
      );
    });

    expect(result.current.getByText('テスト1')).not.toBeNull();
    expect(result.current.getByText('テスト2')).not.toBeNull();

    act(() => {
      result.current.clearCache();
    });

    expect(result.current.getByText('テスト1')).toBeNull();
    expect(result.current.getByText('テスト2')).toBeNull();
  });

  it('should limit cache size to prevent memory leak', () => {
    const { result } = renderHook(() => useTTSCache());

    // キャッシュの最大サイズ50を超える数のエントリを追加
    act(() => {
      for (let i = 0; i < 60; i++) {
        result.current.store(
          `test-id-${i}`,
          { text: `テスト${i}`, path: `/path/to/test${i}_ja.mp3` },
          { text: `Test ${i}`, path: `/path/to/test${i}_en.mp3` }
        );
      }
    });

    // 最初の10個は削除されているはず
    for (let i = 0; i < 10; i++) {
      expect(result.current.getByText(`テスト${i}`)).toBeNull();
    }

    // 最後の50個は残っているはず
    for (let i = 10; i < 60; i++) {
      expect(result.current.getByText(`テスト${i}`)).not.toBeNull();
    }
  });

  it('should maintain most recent entries when cache limit is reached', () => {
    const { result } = renderHook(() => useTTSCache());

    // 最大サイズ50を1つ超えるエントリを追加
    act(() => {
      for (let i = 0; i < 51; i++) {
        result.current.store(
          `test-id-${i}`,
          { text: `テスト${i}`, path: `/path/to/test${i}_ja.mp3` },
          { text: `Test ${i}`, path: `/path/to/test${i}_en.mp3` }
        );
      }
    });

    // 最も古いエントリは削除されているはず
    expect(result.current.getByText('テスト0')).toBeNull();

    // 最新の50個は残っているはず
    for (let i = 1; i < 51; i++) {
      const cache = result.current.getByText(`テスト${i}`);
      expect(cache).not.toBeNull();
      expect(cache?.id).toBe(`test-id-${i}`);
    }
  });
});
