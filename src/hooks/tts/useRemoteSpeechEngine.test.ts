import { act, renderHook } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import { createElement, type ReactNode } from 'react';
import {
  REMOTE_TTS_SPEED_RATES,
  REMOTE_TTS_VOICE_EN,
  REMOTE_TTS_VOICE_JA,
} from '~/constants';
import { TTS_SPEED_PREFERENCE } from '~/models/TTSSpeed';
import { ttsSpeedPreferenceAtom } from '~/store/atoms/speech';
import type { SpeechEngineRequest } from './speechEngine';
import { useRemoteSpeechEngine } from './useRemoteSpeechEngine';

const mockGetSessionToken = jest.fn();
jest.mock('~/lib/session', () => ({
  getSessionToken: () => mockGetSessionToken(),
}));

jest.mock('~/lib/workerApi', () => ({
  workerUrl: (path: string) => `https://worker.example.com${path}`,
}));

const mockFetchSpeechAudio = jest.fn();
jest.mock('~/utils/ttsSpeechFetcher', () => ({
  fetchSpeechAudio: (...args: unknown[]) => mockFetchSpeechAudio(...args),
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

const defaultRequest: SpeechEngineRequest = {
  ssmlJa: '次は<sub alias="オオサキ">大崎</sub>です',
  ssmlEn: 'The next station is Osaki,<break time="200ms"/> J Y 24.',
  speakJa: true,
  speakEn: true,
};

// 発話開始は getSessionToken と fetchSpeechAudio の解決を待つため非同期。
// マイクロタスクを数回進めて再生開始まで到達させる。
const flushAsync = async () => {
  await act(async () => {
    for (let i = 0; i < 5; i += 1) {
      await Promise.resolve();
    }
  });
};

const renderEngine = () => renderHook(() => useRemoteSpeechEngine());

// アナウンス速度の設定は起動時に MMKV から復元されるため、テストでは
// 明示的に値を入れたストアで包む。
const renderEngineWithSpeed = (
  preference: keyof typeof TTS_SPEED_PREFERENCE
) => {
  const store = createStore();
  store.set(ttsSpeedPreferenceAtom, TTS_SPEED_PREFERENCE[preference]);
  return renderHook(() => useRemoteSpeechEngine(), {
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(Provider, { store }, children),
  });
};

describe('useRemoteSpeechEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    playAudioCalls.length = 0;
    mockGetSessionToken.mockResolvedValue('test-token');
    mockFetchSpeechAudio.mockResolvedValue({
      id: 'tts-1',
      pathJa: '/cache/tts-1_ja.mp3',
      pathEn: '/cache/tts-1_en.mp3',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('SSML をプレーンテキストへ変換し、日英それぞれの女性声を添えて要求する', async () => {
    const { result } = renderEngine();

    result.current.speak(defaultRequest, { onSettled: jest.fn() });
    await flushAsync();

    expect(mockFetchSpeechAudio).toHaveBeenCalledWith(
      expect.objectContaining({
        // SSML タグは読み上げられてしまうため、変換後のテキストを送る
        textJa: '次はオオサキです',
        textEn: 'The next station is Osaki, J Y 24.',
        apiUrl: 'https://worker.example.com/tts',
        idToken: 'test-token',
        // Cloud TTS のボイス名はロケールを含むため日英で別々に指定する
        jaVoiceName: REMOTE_TTS_VOICE_JA,
        enVoiceName: REMOTE_TTS_VOICE_EN,
        // 設定していなければ「普通」（等速）で要求する
        speed: REMOTE_TTS_SPEED_RATES.NORMAL,
      })
    );
  });

  it('アナウンス速度の設定を読み上げ速度として要求する', async () => {
    const { result } = renderEngineWithSpeed('SLOW');

    result.current.speak(defaultRequest, { onSettled: jest.fn() });
    await flushAsync();

    expect(mockFetchSpeechAudio).toHaveBeenCalledWith(
      expect.objectContaining({ speed: REMOTE_TTS_SPEED_RATES.SLOW })
    );
  });

  it('日本語を再生し終えてから英語を再生し、両方の完了で onSettled を呼ぶ', async () => {
    const onSettled = jest.fn();
    const onSpeechStarted = jest.fn();
    const { result } = renderEngine();

    result.current.speak(defaultRequest, { onSettled, onSpeechStarted });
    await flushAsync();

    expect(onSpeechStarted).toHaveBeenCalledTimes(1);
    expect(playAudioCalls).toHaveLength(1);
    expect(playAudioCalls[0].uri).toBe('/cache/tts-1_ja.mp3');
    expect(onSettled).not.toHaveBeenCalled();

    // 日本語の再生完了で英語へ進む
    act(() => {
      playAudioCalls[0].onFinish();
    });
    expect(playAudioCalls).toHaveLength(2);
    expect(playAudioCalls[1].uri).toBe('/cache/tts-1_en.mp3');
    expect(onSettled).not.toHaveBeenCalled();

    act(() => {
      playAudioCalls[1].onFinish();
    });
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it('日本語の再生に失敗しても英語へ進み、最後に onSettled を呼ぶ', async () => {
    const onSettled = jest.fn();
    const { result } = renderEngine();

    result.current.speak(defaultRequest, { onSettled });
    await flushAsync();

    act(() => {
      playAudioCalls[0].onError(new Error('playback failed'));
    });
    expect(playAudioCalls[1].uri).toBe('/cache/tts-1_en.mp3');

    act(() => {
      playAudioCalls[1].onError(new Error('playback failed'));
    });
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it('日本語のみ有効な場合は英語テキストを要求せず日本語だけ再生する', async () => {
    // 合成は文字数課金のため、無効な言語は要求しない
    mockFetchSpeechAudio.mockResolvedValue({
      id: 'tts-2',
      pathJa: '/cache/tts-2_ja.mp3',
      pathEn: null,
    });
    const onSettled = jest.fn();
    const { result } = renderEngine();

    result.current.speak({ ...defaultRequest, speakEn: false }, { onSettled });
    await flushAsync();

    expect(mockFetchSpeechAudio).toHaveBeenCalledWith(
      expect.objectContaining({ textEn: '' })
    );
    expect(playAudioCalls).toHaveLength(1);
    expect(playAudioCalls[0].uri).toBe('/cache/tts-2_ja.mp3');

    act(() => {
      playAudioCalls[0].onFinish();
    });
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it('英語のみ有効な場合は英語だけ再生する', async () => {
    mockFetchSpeechAudio.mockResolvedValue({
      id: 'tts-3',
      pathJa: null,
      pathEn: '/cache/tts-3_en.mp3',
    });
    const onSettled = jest.fn();
    const { result } = renderEngine();

    result.current.speak({ ...defaultRequest, speakJa: false }, { onSettled });
    await flushAsync();

    expect(mockFetchSpeechAudio).toHaveBeenCalledWith(
      expect.objectContaining({ textJa: '' })
    );
    expect(playAudioCalls).toHaveLength(1);
    expect(playAudioCalls[0].uri).toBe('/cache/tts-3_en.mp3');

    act(() => {
      playAudioCalls[0].onFinish();
    });
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it('両方の言語が無効な場合は要求せず onSettled で終える', async () => {
    const onSettled = jest.fn();
    const onUnavailable = jest.fn();
    const { result } = renderEngine();

    result.current.speak(
      { ...defaultRequest, speakJa: false, speakEn: false },
      { onSettled, onUnavailable }
    );
    await flushAsync();

    expect(mockFetchSpeechAudio).not.toHaveBeenCalled();
    // 読み上げるものが無いだけなのでフォールバックは不要
    expect(onUnavailable).not.toHaveBeenCalled();
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it('セッショントークンが取れない場合は onUnavailable を呼ぶ', async () => {
    mockGetSessionToken.mockResolvedValue(null);
    const onSettled = jest.fn();
    const onUnavailable = jest.fn();
    const { result } = renderEngine();

    result.current.speak(defaultRequest, { onSettled, onUnavailable });
    await flushAsync();

    expect(mockFetchSpeechAudio).not.toHaveBeenCalled();
    expect(onUnavailable).toHaveBeenCalledTimes(1);
    expect(onSettled).not.toHaveBeenCalled();
  });

  it('音声の取得に失敗した場合は onUnavailable を呼ぶ', async () => {
    // 圏外・トンネル・API 障害。呼び出し側が端末内蔵 TTS へフォールバックする
    mockFetchSpeechAudio.mockResolvedValue(null);
    const onSettled = jest.fn();
    const onUnavailable = jest.fn();
    const { result } = renderEngine();

    result.current.speak(defaultRequest, { onSettled, onUnavailable });
    await flushAsync();

    expect(onUnavailable).toHaveBeenCalledTimes(1);
    expect(onSettled).not.toHaveBeenCalled();
    expect(playAudioCalls).toHaveLength(0);
  });

  it('取得中に例外が出た場合も onUnavailable を呼ぶ', async () => {
    mockFetchSpeechAudio.mockRejectedValue(new Error('boom'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    const onSettled = jest.fn();
    const onUnavailable = jest.fn();
    const { result } = renderEngine();

    result.current.speak(defaultRequest, { onSettled, onUnavailable });
    await flushAsync();

    expect(onUnavailable).toHaveBeenCalledTimes(1);
    expect(onSettled).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('onUnavailable 未指定の場合は onSettled で代替する', async () => {
    mockFetchSpeechAudio.mockResolvedValue(null);
    const onSettled = jest.fn();
    const { result } = renderEngine();

    result.current.speak(defaultRequest, { onSettled });
    await flushAsync();

    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it('stop 後は取得が完了してもコールバックを呼ばず再生もしない', async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    mockFetchSpeechAudio.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );
    const onSettled = jest.fn();
    const onUnavailable = jest.fn();
    const { result } = renderEngine();

    result.current.speak(defaultRequest, { onSettled, onUnavailable });
    act(() => {
      result.current.stop();
    });

    await act(async () => {
      resolveFetch({
        id: 'tts-4',
        pathJa: '/cache/tts-4_ja.mp3',
        pathEn: '/cache/tts-4_en.mp3',
      });
      await Promise.resolve();
    });
    await flushAsync();

    expect(playAudioCalls).toHaveLength(0);
    expect(onSettled).not.toHaveBeenCalled();
    expect(onUnavailable).not.toHaveBeenCalled();
  });

  it('再生中に stop されたら残りのコールバックを無視する', async () => {
    const onSettled = jest.fn();
    const { result } = renderEngine();

    result.current.speak(defaultRequest, { onSettled });
    await flushAsync();

    act(() => {
      result.current.stop();
    });
    // 停止済みのプレイヤーから遅れて完了通知が届いても発話は進めない
    act(() => {
      playAudioCalls[0].onFinish();
    });

    expect(playAudioCalls).toHaveLength(1);
    expect(onSettled).not.toHaveBeenCalled();
  });
});
