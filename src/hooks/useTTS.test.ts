import { renderHook, waitFor } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import React from 'react';
import speechState from '~/store/atoms/speech';
import { useTTS } from './useTTS';

jest.mock('~/utils/isDevApp', () => ({
  isDevApp: false,
}));

const mockFetch = jest.fn();
const mockCreateAudioPlayer = jest.fn();
const mockSetAudioModeAsync = jest.fn();

jest.mock('expo/fetch', () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));

jest.mock('expo-audio', () => ({
  createAudioPlayer: (...args: unknown[]) => mockCreateAudioPlayer(...args),
  setAudioModeAsync: (...args: unknown[]) => mockSetAudioModeAsync(...args),
}));

jest.mock('expo-file-system', () => ({
  Paths: { cache: '/tmp' },
  File: class {
    public uri: string;

    constructor(basePath: string, name: string) {
      this.uri = `${basePath}/${name}`;
    }

    write() {}
  },
}));

jest.mock('./useCurrentLine', () => ({
  useCurrentLine: jest.fn(() => undefined),
}));

jest.mock('./useTTSText', () => ({
  useTTSText: jest.fn(() => ['ja text', 'en text']),
}));

jest.mock('./useBusTTSText', () => ({
  useBusTTSText: jest.fn(() => ['ja text', 'en text']),
}));

jest.mock('./usePrevious', () => ({
  usePrevious: jest.fn(() => ['', '']),
}));

jest.mock('./useCachedAnonymousUser', () => ({
  useCachedInitAnonymousUser: jest.fn(() => ({
    getIdToken: jest.fn(async () => 'token'),
  })),
}));

const createMockPlayer = () => {
  let playbackStatusListener:
    | ((status: { didJustFinish: boolean }) => void)
    | null = null;

  return {
    addListener: jest.fn(
      (
        _event: string,
        callback: (status: { didJustFinish: boolean }) => void
      ) => {
        playbackStatusListener = callback;
        return { remove: jest.fn() };
      }
    ),
    play: jest.fn(() => {
      setTimeout(() => {
        playbackStatusListener?.({ didJustFinish: true });
      }, 0);
    }),
    pause: jest.fn(),
    remove: jest.fn(),
  };
};

describe('useTTS', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          id: 'tts-id',
          jaAudioContent: 'QQ==',
          enAudioContent: 'QQ==',
        },
      }),
    });

    mockCreateAudioPlayer.mockImplementation((_source: { uri: string }) =>
      createMockPlayer()
    );
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('英語のみ有効時は英語音声のみ再生プレイヤーを生成する', async () => {
    const store = createStore();
    store.set(speechState, {
      enabled: true,
      backgroundEnabled: false,
      ttsEnabledLanguages: ['EN'],
      monetizedPlanEnabled: false,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(Provider, { store }, children);

    renderHook(() => useTTS(), { wrapper });

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
});
