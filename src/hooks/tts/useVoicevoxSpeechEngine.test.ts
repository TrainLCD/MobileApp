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
import { useVoicevoxSpeechEngine } from './useVoicevoxSpeechEngine';

const mockSetup = jest.fn();
const mockSynthesize = jest.fn();
let mockModuleAvailable = true;
jest.mock('~/utils/native/ios/voicevoxTtsModule', () => ({
  getVoicevoxTtsModule: () =>
    mockModuleAvailable
      ? {
          setup: (o: unknown) => mockSetup(o),
          synthesize: (o: unknown) => mockSynthesize(o),
        }
      : null,
}));

let mockEnabled = true;
let mockStyleId = 30;
// 既定は 1 にして、速度設定の倍率がそのまま speedScale になる前提で検証する
let mockSpeedScale = 1;
const mockRemoteConfigListeners = new Set<() => void>();
jest.mock('~/lib/remoteConfig', () => ({
  isVoicevoxTTSEnabled: () => mockEnabled,
  getVoicevoxTTSStyleId: () => mockStyleId,
  getVoicevoxTTSSpeedScale: () => mockSpeedScale,
  subscribeRemoteConfig: (listener: () => void) => {
    mockRemoteConfigListeners.add(listener);
    return () => {
      mockRemoteConfigListeners.delete(listener);
    };
  },
}));

const installedAssets = {
  version: 'v1',
  openJtalkDicDir: '/docs/voicevox/v1/dic',
  voiceModelPaths: ['/docs/voicevox/v1/6.vvm'],
};
let mockInstalled: typeof installedAssets | null = installedAssets;
const mockEnsureAssets = jest.fn(async () => mockInstalled);
jest.mock('~/lib/voicevox/assets', () => ({
  getInstalledVoicevoxAssets: () => mockInstalled,
  ensureVoicevoxAssets: () => mockEnsureAssets(),
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
const mockSafeRemovePlayer = jest.fn();
jest.mock('~/utils/ttsAudioPlayer', () => ({
  playAudio: (options: PlayAudioOptions) => mockPlayAudio(options),
  safeRemoveListener: jest.fn(),
  safeRemovePlayer: (p: unknown) => mockSafeRemovePlayer(p),
}));

const englishSpeak = jest.fn();
const englishStop = jest.fn();
const englishEngine: SpeechEngine = {
  speak: (request, callbacks) => englishSpeak(request, callbacks),
  stop: () => englishStop(),
};

const defaultRequest: SpeechEngineRequest = {
  ssmlJa: '次は<sub alias="オオサキ">大崎</sub>、<break time="200ms"/>終点です',
  ssmlEn: 'The next station is Osaki,<break time="200ms"/> J Y 24.',
  speakJa: true,
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
  return renderHook(() => useVoicevoxSpeechEngine(englishEngine), {
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(Provider, { store }, children),
  });
};

const callbacks = (): SpeechEngineCallbacks & {
  onSpeechStarted: jest.Mock;
  onSettled: jest.Mock;
  onUnavailable: jest.Mock;
} => ({
  onSpeechStarted: jest.fn(),
  onSettled: jest.fn(),
  onUnavailable: jest.fn(),
});

describe('useVoicevoxSpeechEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    playAudioCalls.length = 0;
    mockModuleAvailable = true;
    mockEnabled = true;
    mockStyleId = 30;
    mockSpeedScale = 1;
    mockInstalled = installedAssets;
    mockRemoteConfigListeners.clear();
    mockSetup.mockResolvedValue({ coreVersion: '0.17.0', styleIds: [29, 30] });
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

  it('Remote Config の基準倍率を速度設定の倍率に掛けて 3 桁に丸めた speedScale で合成する', async () => {
    mockSpeedScale = 0.9;
    const { result } = renderEngine('FAST');

    result.current.speak(defaultRequest, callbacks());
    await flushAsync();

    // 1.15 × 0.9 = 1.0349999… をそのまま渡さず 1.035 にする
    expect(mockSynthesize).toHaveBeenCalledWith(
      expect.objectContaining({ speedScale: 1.035 })
    );
  });

  it('日本語を VOICEVOX で合成して再生し、英語は委譲する', async () => {
    const cb = callbacks();
    const { result } = renderEngine('FAST');

    result.current.speak(defaultRequest, cb);
    await flushAsync();

    expect(mockSetup).toHaveBeenCalledWith({
      openJtalkDicDir: '/docs/voicevox/v1/dic',
      voiceModelPaths: ['/docs/voicevox/v1/6.vvm'],
      cpuNumThreads: 0,
    });
    // SSML はプレーンテキストへ変換され、読み (alias) と「、」の区切りが残る
    expect(mockSynthesize).toHaveBeenCalledWith({
      text: '次はオオサキ、、終点です',
      styleId: 30,
      speedScale: 1.15,
      outputPath: expect.stringMatching(/^\/cache\/voicevox_\d+_1\.wav$/),
    });
    expect(cb.onSpeechStarted).toHaveBeenCalledTimes(1);
    expect(playAudioCalls).toHaveLength(1);
    expect(playAudioCalls[0]?.uri).toMatch(/^file:\/\/\/cache\/voicevox_/);
    expect(englishSpeak).not.toHaveBeenCalled();

    // 日本語の再生完了で英語へ (speakJa=false で委譲)
    act(() => {
      playAudioCalls[0]?.onFinish();
    });
    expect(mockFileDelete).toHaveBeenCalledTimes(1);
    expect(englishSpeak).toHaveBeenCalledWith(
      { ...defaultRequest, speakJa: false },
      expect.objectContaining({ onSettled: expect.any(Function) })
    );
    expect(cb.onSettled).not.toHaveBeenCalled();

    act(() => {
      (englishSpeak.mock.calls[0]?.[1] as SpeechEngineCallbacks).onSettled();
    });
    expect(cb.onSettled).toHaveBeenCalledTimes(1);
    expect(cb.onUnavailable).not.toHaveBeenCalled();
  });

  it('英語を読まない回は日本語の再生完了で終える', async () => {
    const cb = callbacks();
    const { result } = renderEngine();

    result.current.speak({ ...defaultRequest, speakEn: false }, cb);
    await flushAsync();
    act(() => {
      playAudioCalls[0]?.onFinish();
    });

    expect(englishSpeak).not.toHaveBeenCalled();
    expect(cb.onSettled).toHaveBeenCalledTimes(1);
  });

  it('日本語を読まない回は VOICEVOX を使わず英語エンジンへそのまま渡す', () => {
    const cb = callbacks();
    const { result } = renderEngine();

    result.current.speak({ ...defaultRequest, speakJa: false }, cb);

    expect(mockSynthesize).not.toHaveBeenCalled();
    expect(englishSpeak).toHaveBeenCalledWith(
      { ...defaultRequest, speakJa: false },
      cb
    );
  });

  it('英語エンジンが使えなくても、日本語を読んだ後なので onSettled で終える', async () => {
    englishSpeak.mockImplementation((_r: unknown, c: SpeechEngineCallbacks) =>
      c.onUnavailable?.()
    );
    const cb = callbacks();
    const { result } = renderEngine();

    result.current.speak(defaultRequest, cb);
    await flushAsync();
    act(() => {
      playAudioCalls[0]?.onFinish();
    });

    expect(cb.onSettled).toHaveBeenCalledTimes(1);
    expect(cb.onUnavailable).not.toHaveBeenCalled();
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
  ])('%s なら onUnavailable を返す', (_label, arrange) => {
    arrange();
    const cb = callbacks();
    const { result } = renderEngine();

    result.current.speak(defaultRequest, cb);

    expect(cb.onUnavailable).toHaveBeenCalledTimes(1);
    expect(cb.onSettled).not.toHaveBeenCalled();
    expect(mockSynthesize).not.toHaveBeenCalled();
  });

  it('資産が未取得の回は取得を促す', () => {
    mockInstalled = null;
    const { result } = renderEngine();
    mockEnsureAssets.mockClear();

    result.current.speak(defaultRequest, callbacks());

    expect(mockEnsureAssets).toHaveBeenCalledTimes(1);
  });

  it('合成に失敗した回は onUnavailable を返し、次回は setup をやり直す', async () => {
    mockSetup.mockRejectedValueOnce(new Error('boom'));
    const cb = callbacks();
    const { result } = renderEngine();

    result.current.speak(defaultRequest, cb);
    await flushAsync();
    expect(cb.onUnavailable).toHaveBeenCalledTimes(1);
    expect(cb.onSpeechStarted).not.toHaveBeenCalled();

    const cb2 = callbacks();
    result.current.speak(defaultRequest, cb2);
    await flushAsync();
    expect(mockSetup).toHaveBeenCalledTimes(2);
    expect(cb2.onSpeechStarted).toHaveBeenCalledTimes(1);
  });

  it('指定したスタイル ID が音声モデルに無ければ使わない', async () => {
    mockStyleId = 99;
    const cb = callbacks();
    const { result } = renderEngine();

    result.current.speak(defaultRequest, cb);
    await flushAsync();

    expect(cb.onUnavailable).toHaveBeenCalledTimes(1);
    expect(mockSynthesize).not.toHaveBeenCalled();
  });

  it('同じ資産バージョンなら setup は 1 回だけ', async () => {
    const { result } = renderEngine();

    result.current.speak(defaultRequest, callbacks());
    await flushAsync();
    act(() => {
      playAudioCalls[0]?.onFinish();
    });
    result.current.speak(defaultRequest, callbacks());
    await flushAsync();

    expect(mockSetup).toHaveBeenCalledTimes(1);
    expect(mockSynthesize).toHaveBeenCalledTimes(2);
  });

  it('stop で再生を解放し、古い発話のコールバックは無視する', async () => {
    const cb = callbacks();
    const { result } = renderEngine();

    result.current.speak(defaultRequest, cb);
    await flushAsync();

    act(() => {
      result.current.stop();
    });
    expect(mockSafeRemovePlayer).toHaveBeenCalled();
    expect(mockFileDelete).toHaveBeenCalledTimes(1);
    expect(englishStop).toHaveBeenCalledTimes(1);

    act(() => {
      playAudioCalls[0]?.onFinish();
    });
    expect(englishSpeak).not.toHaveBeenCalled();
    expect(cb.onSettled).not.toHaveBeenCalled();
  });

  it('合成中に stop されたら結果を再生せずファイルを消す', async () => {
    let resolveSynthesis: ((v: unknown) => void) | null = null;
    mockSynthesize.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSynthesis = resolve;
        })
    );
    const cb = callbacks();
    const { result } = renderEngine();

    result.current.speak(defaultRequest, cb);
    await flushAsync();
    act(() => {
      result.current.stop();
    });
    await act(async () => {
      resolveSynthesis?.({ path: '/cache/x.wav', bytes: 1 });
    });
    await flushAsync();

    expect(playAudioCalls).toHaveLength(0);
    expect(mockFileDelete).toHaveBeenCalled();
    expect(cb.onSpeechStarted).not.toHaveBeenCalled();
    expect(cb.onSettled).not.toHaveBeenCalled();
  });

  it('アンマウント時に停止する', async () => {
    const { result, unmount } = renderEngine();
    result.current.speak(defaultRequest, callbacks());
    await flushAsync();

    unmount();

    expect(mockSafeRemovePlayer).toHaveBeenCalled();
    expect(englishStop).toHaveBeenCalled();
  });
});
