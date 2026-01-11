import { renderHook, waitFor } from '@testing-library/react-native';
import { Provider } from 'jotai';
import type React from 'react';
import { AppState } from 'react-native';
import { store } from '~/store';
import { useTTS } from './useTTS';

// モック設定
jest.mock('react-native-track-player', () => ({
  __esModule: true,
  default: {
    setupPlayer: jest.fn().mockResolvedValue(undefined),
    updateOptions: jest.fn().mockResolvedValue(undefined),
    reset: jest.fn().mockResolvedValue(undefined),
    add: jest.fn().mockResolvedValue(undefined),
    play: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn().mockResolvedValue(undefined),
    getPlaybackState: jest.fn().mockResolvedValue({ state: 'none' }),
  },
  useTrackPlayerEvents: jest.fn(),
  Event: {
    PlaybackQueueEnded: 'playback-queue-ended',
    RemotePause: 'remote-pause',
    PlaybackState: 'playback-state',
  },
  State: {
    None: 'none',
    Playing: 'playing',
    Paused: 'paused',
    Stopped: 'stopped',
    Error: 'error',
  },
  IOSCategory: {
    Playback: 'playback',
    Ambient: 'ambient',
  },
  IOSCategoryMode: {
    SpokenAudio: 'spokenAudio',
  },
  IOSCategoryOptions: {
    DuckOthers: 'duckOthers',
  },
  AppKilledPlaybackBehavior: {
    ContinuePlayback: 'continue-playback',
  },
}));

// TrackPlayerをインポート（モック後）
import TrackPlayer from 'react-native-track-player';

jest.mock('@react-native-firebase/auth', () => ({
  getIdToken: jest.fn().mockResolvedValue('mock-token'),
}));

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation((dir, name) => ({
    uri: `${dir}/${name}`,
    write: jest.fn(),
  })),
  Paths: {
    cache: '/mock/cache',
  },
}));

jest.mock('react-native-dotenv', () => ({
  DEV_TTS_API_URL: 'https://dev-tts-api.example.com',
  PRODUCTION_TTS_API_URL: 'https://tts-api.example.com',
}));

jest.mock('~/utils/isDevApp', () => ({
  isDevApp: false,
}));

jest.mock('~/utils/line', () => ({
  isBusLine: jest.fn().mockReturnValue(false),
}));

jest.mock('./useTTSText', () => ({
  useTTSText: jest.fn().mockReturnValue(['テスト日本語', 'Test English']),
}));

jest.mock('./useBusTTSText', () => ({
  useBusTTSText: jest.fn().mockReturnValue(['バステスト', 'Bus Test']),
}));

jest.mock('./useCurrentLine', () => ({
  useCurrentLine: jest.fn().mockReturnValue(null),
}));

jest.mock('./usePrevious', () => ({
  usePrevious: jest.fn().mockReturnValue([null, null]),
}));

jest.mock('./useCachedAnonymousUser', () => ({
  useCachedInitAnonymousUser: jest.fn().mockReturnValue({ uid: 'mock-user' }),
}));

jest.mock('./useTTSCache', () => ({
  useTTSCache: jest.fn().mockReturnValue({
    store: jest.fn(),
    getByText: jest.fn().mockReturnValue(null),
  }),
}));

// AppState モック
const mockAppStateListeners: Array<(state: string) => void> = [];
jest.spyOn(AppState, 'addEventListener').mockImplementation((_, handler) => {
  mockAppStateListeners.push(handler as (state: string) => void);
  return { remove: jest.fn() };
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>{children}</Provider>
);

describe('useTTS', () => {
  const mockFetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockAppStateListeners.length = 0;
    global.fetch = mockFetch;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          result: {
            id: 'test-id',
            jaAudioContent: 'SGVsbG8=', // "Hello" in base64
            enAudioContent: 'V29ybGQ=', // "World" in base64
          },
        }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('セットアップ', () => {
    it('マウント時にTrackPlayer.setupPlayerが呼ばれる', async () => {
      renderHook(() => useTTS(), { wrapper });

      await waitFor(() => {
        expect(TrackPlayer.setupPlayer).toHaveBeenCalledWith(
          expect.objectContaining({
            autoHandleInterruptions: true,
          })
        );
      });
    });

    it('setupPlayer成功後にupdateOptionsが呼ばれる', async () => {
      renderHook(() => useTTS(), { wrapper });

      await waitFor(() => {
        expect(TrackPlayer.updateOptions).toHaveBeenCalledWith(
          expect.objectContaining({
            capabilities: [],
            compactCapabilities: [],
            notificationCapabilities: [],
          })
        );
      });
    });

    it('setupPlayerが"already been initialized"エラーを返しても成功として扱う', async () => {
      (TrackPlayer.setupPlayer as jest.Mock).mockRejectedValueOnce(
        new Error('The player has already been initialized via setupPlayer')
      );

      renderHook(() => useTTS(), { wrapper });

      await waitFor(() => {
        expect(TrackPlayer.updateOptions).toHaveBeenCalled();
      });
    });

    it('setupPlayerが他のエラーを返した場合は失敗として扱う', async () => {
      const consoleWarn = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      (TrackPlayer.setupPlayer as jest.Mock).mockRejectedValueOnce(
        new Error('Unknown error')
      );

      renderHook(() => useTTS(), { wrapper });

      await waitFor(() => {
        expect(consoleWarn).toHaveBeenCalledWith(
          '[useTTS] setupPlayer failed:',
          expect.any(Error)
        );
      });

      consoleWarn.mockRestore();
    });
  });

  describe('バックグラウンド動作', () => {
    it('AppState.addEventListenerが呼ばれる', () => {
      renderHook(() => useTTS(), { wrapper });

      expect(AppState.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      );
    });
  });

  describe('クリーンアップ', () => {
    it('アンマウント時にTrackPlayer.resetが呼ばれる', async () => {
      const { unmount } = renderHook(() => useTTS(), { wrapper });

      unmount();

      await waitFor(() => {
        expect(TrackPlayer.reset).toHaveBeenCalled();
      });
    });
  });
});
