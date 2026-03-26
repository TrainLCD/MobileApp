import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import React from 'react';
import speechState, { resetFirstSpeechAtom } from '~/store/atoms/speech';
import { mockFetch } from '~/utils/test/ttsMocks';
import { clearFetchCache } from '~/utils/ttsSpeechFetcher';
import { useTTS } from './useTTS';

jest.mock('~/utils/isDevApp', () => ({
  isDevApp: false,
}));

const mockCreateAudioPlayer = jest.fn();
const mockSetAudioModeAsync = jest.fn();

jest.mock('expo-audio', () => ({
  createAudioPlayer: (...args: unknown[]) => mockCreateAudioPlayer(...args),
  setAudioModeAsync: (...args: unknown[]) => mockSetAudioModeAsync(...args),
}));

jest.mock('./useCurrentLine', () => ({
  useCurrentLine: jest.fn(() => undefined),
}));

jest.mock('./useTTSText', () => ({
  useTTSText: jest.fn(() => ({
    text: ['ja text', 'en text'],
    nextText: ['ja next', 'en next'],
  })),
}));

jest.mock('./useBusTTSText', () => ({
  useBusTTSText: jest.fn(() => ({
    text: ['ja text', 'en text'],
    nextText: ['ja next', 'en next'],
  })),
}));

jest.mock('./usePrevious', () => ({
  usePrevious: jest.fn(() => ['', '']),
}));

jest.mock('@react-native-firebase/auth', () => ({
  getIdToken: jest.fn(async () => 'token'),
}));

jest.mock('./useCachedAnonymousUser', () => ({
  useCachedInitAnonymousUser: jest.fn(() => ({ uid: 'test-user' })),
}));

jest.mock('./useStoppingState', () => ({
  useStoppingState: jest.fn(() => 'CURRENT'),
}));

type StatusCallback = (status: {
  didJustFinish?: boolean;
  error?: string;
}) => void;

const createMockPlayer = (opts?: { autoFinish?: boolean }) => {
  let playbackStatusListener: StatusCallback | null = null;
  const autoFinish = opts?.autoFinish ?? true;

  return {
    addListener: jest.fn((_event: string, callback: StatusCallback) => {
      playbackStatusListener = callback;
      return { remove: jest.fn() };
    }),
    play: jest.fn(() => {
      if (autoFinish) {
        setTimeout(() => {
          playbackStatusListener?.({ didJustFinish: true });
        }, 0);
      }
    }),
    pause: jest.fn(),
    remove: jest.fn(),
    emitStatus: (status: { didJustFinish?: boolean; error?: string }) => {
      playbackStatusListener?.(status);
    },
  };
};

const defaultSpeechState = {
  enabled: true,
  backgroundEnabled: false,
  ttsEnabledLanguages: ['JA', 'EN'] as ('JA' | 'EN')[],
  monetizedPlanEnabled: false,
};

const createWrapper =
  (store: ReturnType<typeof createStore>) =>
  ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store }, children);

const mockSuccessfulFetch = () => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      result: {
        id: 'tts-id',
        jaAudioContent: 'QQ==',
        enAudioContent: 'QQ==',
        jaAudioMimeType: 'audio/mpeg',
        enAudioMimeType: 'audio/mpeg',
      },
    }),
  });
};

describe('useTTS', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    clearFetchCache();
    mockSuccessfulFetch();
    mockCreateAudioPlayer.mockImplementation(() => createMockPlayer());
    // テスト間で useTTSText の mock を復元
    const { useTTSText } = jest.requireMock('./useTTSText') as {
      useTTSText: jest.Mock;
    };
    useTTSText.mockReturnValue({
      text: ['ja text', 'en text'],
      nextText: ['ja next', 'en next'],
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('英語のみ有効時は英語音声のみ再生プレイヤーを生成する', async () => {
    const store = createStore();
    store.set(speechState, {
      ...defaultSpeechState,
      ttsEnabledLanguages: ['EN'],
    });

    renderHook(() => useTTS(), { wrapper: createWrapper(store) });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    jest.runAllTimers();

    await waitFor(() => {
      expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(1);
    });

    expect(mockCreateAudioPlayer).toHaveBeenCalledWith({
      uri: '/tmp/tts-id_en.mp3',
    });
  });

  it('JA+EN有効時はJA→ENの順に再生する', async () => {
    const store = createStore();
    store.set(speechState, defaultSpeechState);

    const calls: string[] = [];
    mockCreateAudioPlayer.mockImplementation((source: { uri: string }) => {
      calls.push(source.uri);
      return createMockPlayer();
    });

    renderHook(() => useTTS(), { wrapper: createWrapper(store) });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // JA プレイヤーが先に生成される
    jest.runAllTimers();

    await waitFor(() => {
      expect(calls.length).toBeGreaterThanOrEqual(1);
    });

    expect(calls[0]).toBe('/tmp/tts-id_ja.mp3');

    // EN_PLAYBACK_DELAY_MS 後に EN プレイヤーが生成される
    jest.runAllTimers();

    await waitFor(() => {
      expect(calls.length).toBeGreaterThanOrEqual(2);
    });

    expect(calls[1]).toBe('/tmp/tts-id_en.mp3');
  });

  it('JAのみ有効時はJAプレイヤーのみ生成する', async () => {
    const store = createStore();
    store.set(speechState, {
      ...defaultSpeechState,
      ttsEnabledLanguages: ['JA'],
    });

    renderHook(() => useTTS(), { wrapper: createWrapper(store) });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    jest.runAllTimers();

    await waitFor(() => {
      expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(1);
    });

    expect(mockCreateAudioPlayer).toHaveBeenCalledWith({
      uri: '/tmp/tts-id_ja.mp3',
    });
  });

  it('無効時はfetch/playしない', async () => {
    const store = createStore();
    store.set(speechState, {
      ...defaultSpeechState,
      enabled: false,
    });

    renderHook(() => useTTS(), { wrapper: createWrapper(store) });

    jest.runAllTimers();

    await waitFor(() => {
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockCreateAudioPlayer).not.toHaveBeenCalled();
    });
  });

  it('テキスト空時にpendingをクリアする', async () => {
    const { useTTSText } = jest.requireMock('./useTTSText') as {
      useTTSText: jest.Mock;
    };

    const store = createStore();
    store.set(speechState, defaultSpeechState);

    // 最初は有効なテキストで再生開始
    useTTSText.mockReturnValue({
      text: ['ja text', 'en text'],
      nextText: ['ja next', 'en next'],
    });

    const { rerender } = renderHook(() => useTTS(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // テキストを空にして再描画
    useTTSText.mockReturnValue({ text: ['', ''], nextText: [] });
    rerender({});

    jest.runAllTimers();

    // 空テキストではfetchが追加で呼ばれない（本来のfetch + prefetch = 2回）
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('APIエラー時にfinishPlayingが呼ばれる', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const store = createStore();
    store.set(speechState, defaultSpeechState);

    renderHook(() => useTTS(), { wrapper: createWrapper(store) });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    jest.runAllTimers();

    // APIエラー後、プレイヤーは生成されない
    expect(mockCreateAudioPlayer).not.toHaveBeenCalled();
  });

  it('タイムアウト後に強制リセットされる', async () => {
    const store = createStore();
    store.set(speechState, {
      ...defaultSpeechState,
      ttsEnabledLanguages: ['EN'],
    });

    // didJustFinish を発火しないプレイヤー
    mockCreateAudioPlayer.mockImplementation(() =>
      createMockPlayer({ autoFinish: false })
    );

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    renderHook(() => useTTS(), { wrapper: createWrapper(store) });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // プレイヤーが生成されるまで待つ
    jest.advanceTimersByTime(100);

    await waitFor(() => {
      expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(1);
    });

    // 300秒のタイムアウトを発火
    jest.advanceTimersByTime(300_000);

    expect(warnSpy).toHaveBeenCalledWith(
      '[useTTS] Playback safety timeout reached, force resetting'
    );

    warnSpy.mockRestore();
  });

  it('resetFirstSpeechAtom変更時にuseTTSTextへfirstSpeech=trueが同期的に渡される', async () => {
    const { useTTSText } = jest.requireMock('./useTTSText') as {
      useTTSText: jest.Mock;
    };

    const store = createStore();
    store.set(speechState, defaultSpeechState);

    renderHook(() => useTTS(), { wrapper: createWrapper(store) });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    jest.runAllTimers();
    useTTSText.mockClear();

    // resetFirstSpeechAtomをインクリメントする
    act(() => {
      store.set(resetFirstSpeechAtom, 1);
    });

    await waitFor(() => {
      expect(useTTSText).toHaveBeenCalled();
    });

    // atom変更直後の再レンダーでfirstSpeech=trueが渡されること
    // （useEffectだと遅延してfalseが先に渡され通常TTSが再生されるデグレが起きる）
    const firstCallAfterReset = useTTSText.mock.calls[0];
    expect(firstCallAfterReset[0]).toBe(true);
  });

  it('アンマウント時にクリーンアップされる', async () => {
    const store = createStore();
    store.set(speechState, {
      ...defaultSpeechState,
      ttsEnabledLanguages: ['EN'],
    });

    const mockPlayer = createMockPlayer({ autoFinish: false });
    mockCreateAudioPlayer.mockReturnValue(mockPlayer);

    const { unmount } = renderHook(() => useTTS(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    jest.advanceTimersByTime(100);

    await waitFor(() => {
      expect(mockCreateAudioPlayer).toHaveBeenCalled();
    });

    unmount();

    expect(mockPlayer.pause).toHaveBeenCalled();
    expect(mockPlayer.remove).toHaveBeenCalled();
  });
});
