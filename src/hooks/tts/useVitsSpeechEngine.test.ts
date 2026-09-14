import { act, renderHook } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import { createElement, type ReactNode } from 'react';
import { TTS_SPEED_PREFERENCE } from '~/models/TTSSpeed';
import { ttsSpeedPreferenceAtom } from '~/store/atoms/speech';
import type {
  SpeechEngine,
  SpeechEngineCallbacks,
  SpeechEngineRequest,
} from './speechEngine';
import { useVitsSpeechEngine } from './useVitsSpeechEngine';

const mockSetup = jest.fn();
const mockSynthesize = jest.fn();
let mockModuleAvailable = true;
jest.mock('~/utils/native/ios/vitsTtsModule', () => ({
  getVitsTtsModule: () =>
    mockModuleAvailable
      ? {
          setup: (o: unknown) => mockSetup(o),
          synthesize: (o: unknown) => mockSynthesize(o),
        }
      : null,
}));

let mockEnabled = true;
const mockRemoteConfigListeners = new Set<() => void>();
jest.mock('~/lib/remoteConfig', () => ({
  isVitsTTSEnabled: () => mockEnabled,
  subscribeRemoteConfig: (listener: () => void) => {
    mockRemoteConfigListeners.add(listener);
    return () => {
      mockRemoteConfigListeners.delete(listener);
    };
  },
}));

const installedAssets = {
  version: 'v1',
  modelPath: '/docs/vits/v1/vits-ljs.onnx',
  tokensPath: '/docs/vits/v1/tokens.txt',
  lexiconPath: '/docs/vits/v1/lexicon.txt',
  totalBytes: 118_000_000,
};
let mockInstalled: typeof installedAssets | null = installedAssets;
const mockEnsureAssets = jest.fn(async () => mockInstalled);
jest.mock('~/lib/vits/assets', () => ({
  getInstalledVitsAssets: () => mockInstalled,
  ensureVitsAssets: () => mockEnsureAssets(),
  fileUriToPath: (uri: string) => uri.replace(/^file:\/\//, ''),
}));

const mockFileDelete = jest.fn();
jest.mock('expo-file-system', () => ({
  Paths: { cache: 'file:///cache' },
  File: class {
    public uri: string;
    constructor(base: string, name: string) {
      this.uri = `${base}/${name}`;
    }
    delete() {
      mockFileDelete(this.uri);
    }
  },
}));

type PlayAudioOptions = {
  uri: string;
  onFinish: () => void;
  onError: (error: unknown) => void;
};
const playAudioCalls: PlayAudioOptions[] = [];
const mockPlayAudio = jest.fn((options: PlayAudioOptions) => {
  playAudioCalls.push(options);
  return { player: { uri: options.uri }, listener: { remove: jest.fn() } };
});
jest.mock('~/utils/ttsAudioPlayer', () => ({
  playAudio: (options: PlayAudioOptions) => mockPlayAudio(options),
  safeRemoveListener: jest.fn(),
  safeRemovePlayer: jest.fn(),
}));

const fallbackSpeak = jest.fn();
const fallbackStop = jest.fn();
const fallbackEngine: SpeechEngine = {
  speak: (request, callbacks) => fallbackSpeak(request, callbacks),
  stop: () => fallbackStop(),
};

// useTTS は英語だけを渡す契約なので speakJa は false
const defaultRequest: SpeechEngineRequest = {
  ssmlJa: '次は<sub alias="オオサキ">大崎</sub>、<break time="200ms"/>終点です',
  ssmlEn: 'The next station is Osaki,<break time="200ms"/> J Y 24.',
  speakJa: false,
  speakEn: true,
};

const flushAsync = async () => {
  await act(async () => {
    for (let i = 0; i < 6; i += 1) {
      await Promise.resolve();
    }
  });
};

const renderEngine = (speed: keyof typeof TTS_SPEED_PREFERENCE = 'NORMAL') => {
  const store = createStore();
  store.set(ttsSpeedPreferenceAtom, TTS_SPEED_PREFERENCE[speed]);
  return renderHook(() => useVitsSpeechEngine(fallbackEngine), {
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(Provider, { store }, children),
  });
};

const callbacks = (): SpeechEngineCallbacks & {
  onSpeechStarted: jest.Mock;
  onSettled: jest.Mock;
} => ({
  onSpeechStarted: jest.fn(),
  onSettled: jest.fn(),
});

describe('useVitsSpeechEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    playAudioCalls.length = 0;
    mockModuleAvailable = true;
    mockEnabled = true;
    mockInstalled = installedAssets;
    mockRemoteConfigListeners.clear();
    mockSetup.mockResolvedValue({ sampleRate: 22050, addBlank: true });
    mockSynthesize.mockImplementation(async (o: { outputPath: string }) => ({
      path: o.outputPath,
      bytes: 1234,
    }));
  });

  it('マウント時に資産の取得を始める', () => {
    renderEngine();
    expect(mockEnsureAssets).toHaveBeenCalledTimes(1);
  });

  it('Remote Config の更新でも資産の取得を試みる', () => {
    mockEnabled = false;
    renderEngine();
    expect(mockEnsureAssets).not.toHaveBeenCalled();

    mockEnabled = true;
    act(() => {
      for (const listener of mockRemoteConfigListeners) {
        listener();
      }
    });
    expect(mockEnsureAssets).toHaveBeenCalledTimes(1);
  });

  it('英語を端末内で合成して再生する', async () => {
    const { result } = renderEngine();
    const cb = callbacks();
    act(() => {
      result.current.speak(defaultRequest, cb);
    });
    await flushAsync();

    // SSML はプレーンテキストへ均してから渡す
    expect(mockSynthesize).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'The next station is Osaki, J Y 24.',
        speed: 1.0,
      })
    );
    expect(playAudioCalls).toHaveLength(1);
    expect(cb.onSpeechStarted).toHaveBeenCalledTimes(1);
    expect(cb.onSettled).not.toHaveBeenCalled();

    act(() => {
      playAudioCalls[0].onFinish();
    });
    expect(cb.onSettled).toHaveBeenCalledTimes(1);
    expect(fallbackSpeak).not.toHaveBeenCalled();
  });

  it('アナウンス速度設定を合成の速さへ渡す', async () => {
    const { result } = renderEngine('FAST');
    act(() => {
      result.current.speak(defaultRequest, callbacks());
    });
    await flushAsync();

    expect(mockSynthesize).toHaveBeenCalledWith(
      expect.objectContaining({ speed: 1.15 })
    );
  });

  it('英語を読まない回は何もせず終える', () => {
    const { result } = renderEngine();
    const cb = callbacks();
    act(() => {
      result.current.speak({ ...defaultRequest, speakEn: false }, cb);
    });

    expect(mockSynthesize).not.toHaveBeenCalled();
    expect(fallbackSpeak).not.toHaveBeenCalled();
    expect(cb.onSettled).toHaveBeenCalledTimes(1);
  });

  it('日本語が残っている回は委譲先へ丸ごと渡す', () => {
    const { result } = renderEngine();
    const cb = callbacks();
    const request = { ...defaultRequest, speakJa: true };
    act(() => {
      result.current.speak(request, cb);
    });

    // 読み落としを防ぐため、このエンジンでは合成しない
    expect(mockSynthesize).not.toHaveBeenCalled();
    expect(fallbackSpeak).toHaveBeenCalledWith(request, cb);
  });

  it.each([
    [
      'ネイティブモジュールが無い',
      () => {
        mockModuleAvailable = false;
      },
    ],
    [
      'Remote Config で無効',
      () => {
        mockEnabled = false;
      },
    ],
    [
      '資産が未取得',
      () => {
        mockInstalled = null;
      },
    ],
  ])('%s ときは端末内蔵 TTS が英語を読む', (_label, arrange) => {
    arrange();
    const { result } = renderEngine();
    const cb = callbacks();
    act(() => {
      result.current.speak(defaultRequest, cb);
    });

    expect(mockSynthesize).not.toHaveBeenCalled();
    expect(fallbackSpeak).toHaveBeenCalledWith(defaultRequest, cb);
    expect(result.current.isAvailable()).toBe(false);
  });

  it('合成に失敗した回は端末内蔵 TTS が英語を読む', async () => {
    mockSynthesize.mockRejectedValue(new Error('synthesis failed'));
    const { result } = renderEngine();
    const cb = callbacks();
    act(() => {
      result.current.speak(defaultRequest, cb);
    });
    await flushAsync();

    expect(fallbackSpeak).toHaveBeenCalledWith(defaultRequest, cb);
    expect(cb.onSettled).not.toHaveBeenCalled();
  });

  it('資産が揃っていれば isAvailable が true になる', () => {
    const { result } = renderEngine();
    expect(result.current.isAvailable()).toBe(true);
  });

  it('停止すると委譲先も止める', () => {
    const { result } = renderEngine();
    act(() => {
      result.current.stop();
    });
    expect(fallbackStop).toHaveBeenCalled();
  });

  it('停止後に届いた合成結果は再生しない', async () => {
    const { result } = renderEngine();
    const cb = callbacks();
    act(() => {
      result.current.speak(defaultRequest, cb);
      result.current.stop();
    });
    await flushAsync();

    expect(playAudioCalls).toHaveLength(0);
    expect(cb.onSettled).not.toHaveBeenCalled();
  });
});
