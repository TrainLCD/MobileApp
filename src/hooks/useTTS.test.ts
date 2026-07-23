import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import React from 'react';
import { Platform } from 'react-native';
import speechState, { resetFirstSpeechAtom } from '~/store/atoms/speech';
import { useTTS } from './useTTS';

jest.mock('~/utils/isDevApp', () => ({
  isDevApp: false,
}));

const mockSpeak = jest.fn();
const mockSpeechStop = jest.fn();
const mockGetAvailableVoicesAsync = jest.fn(async (): Promise<unknown[]> => []);

jest.mock('expo-speech', () => ({
  speak: (...args: unknown[]) => mockSpeak(...args),
  stop: (...args: unknown[]) => mockSpeechStop(...args),
  getAvailableVoicesAsync: () => mockGetAvailableVoicesAsync(),
  maxSpeechInputLength: 4000,
  VoiceQuality: { Default: 'Default', Enhanced: 'Enhanced' },
}));

const mockSetAudioModeAsync = jest.fn();

jest.mock('expo-audio', () => ({
  setAudioModeAsync: (...args: unknown[]) => mockSetAudioModeAsync(...args),
}));

jest.mock('./useCurrentLine', () => ({
  useCurrentLine: jest.fn(() => undefined),
}));

jest.mock('./useTTSText', () => ({
  useTTSText: jest.fn(() => ({
    text: ['ja text', 'en text'],
  })),
}));

jest.mock('./usePrevious', () => ({
  usePrevious: jest.fn(() => ['', '']),
}));

jest.mock('./useStoppingState', () => ({
  useStoppingState: jest.fn(() => 'CURRENT'),
}));

type SpeechOptions = {
  language: string;
  voice?: string;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (error: unknown) => void;
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

// 発話開始は音声選択（getAvailableVoicesAsync）の完了を待つため非同期。
// マイクロタスクを数回進めて最初の speak まで到達させる。
const flushAsync = async () => {
  await act(async () => {
    for (let i = 0; i < 5; i += 1) {
      await Promise.resolve();
    }
  });
};

// 全発話の完了で pending の発話が新たにキューへ積まれることがあるため、
// 未完了の発話が無くなるまで onDone を呼び続ける。
let settledSpeakCallCount = 0;
const finishAllUtterances = () => {
  while (settledSpeakCallCount < mockSpeak.mock.calls.length) {
    const call = mockSpeak.mock.calls[settledSpeakCallCount];
    settledSpeakCallCount += 1;
    (call[1] as SpeechOptions).onDone?.();
  }
};

// jest-expo の既定 Platform.OS は 'ios'。Android 固有挙動のテストでは明示的に
// 切り替え、afterEach で必ず元へ戻す。
const originalPlatformOS = Platform.OS;
const setPlatformOS = (os: typeof Platform.OS) => {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
};

describe('useTTS', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    settledSpeakCallCount = 0;
    mockGetAvailableVoicesAsync.mockResolvedValue([]);
    // テスト間で useTTSText の mock を復元
    const { useTTSText } = jest.requireMock('./useTTSText') as {
      useTTSText: jest.Mock;
    };
    useTTSText.mockReturnValue({
      text: ['ja text', 'en text'],
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
    setPlatformOS(originalPlatformOS);
  });

  it('英語のみ有効時は英語のみ読み上げる', async () => {
    const store = createStore();
    store.set(speechState, {
      ...defaultSpeechState,
      ttsEnabledLanguages: ['EN'],
    });

    renderHook(() => useTTS(), { wrapper: createWrapper(store) });
    await flushAsync();

    expect(mockSpeak).toHaveBeenCalledTimes(1);
    expect(mockSpeak).toHaveBeenCalledWith(
      'en text',
      expect.objectContaining({ language: 'en-US' })
    );
  });

  it('JA+EN有効時はJA→ENの順で一括キューへ積む', async () => {
    const store = createStore();
    store.set(speechState, defaultSpeechState);

    renderHook(() => useTTS(), { wrapper: createWrapper(store) });
    await flushAsync();

    // 一括で積むことでエンジンが JA 再生中に EN の合成を先行でき、
    // 発話間の無音（合成待ちのラグ）が最小化される
    expect(mockSpeak).toHaveBeenCalledTimes(2);
    expect(mockSpeak).toHaveBeenNthCalledWith(
      1,
      'ja text',
      expect.objectContaining({ language: 'ja-JP' })
    );
    expect(mockSpeak).toHaveBeenNthCalledWith(
      2,
      'en text',
      expect.objectContaining({ language: 'en-US' })
    );
  });

  it('JAのみ有効時は日本語のみ読み上げる', async () => {
    const store = createStore();
    store.set(speechState, {
      ...defaultSpeechState,
      ttsEnabledLanguages: ['JA'],
    });

    renderHook(() => useTTS(), { wrapper: createWrapper(store) });
    await flushAsync();

    expect(mockSpeak).toHaveBeenCalledTimes(1);
    expect(mockSpeak).toHaveBeenCalledWith(
      'ja text',
      expect.objectContaining({ language: 'ja-JP' })
    );
  });

  it('無効時は読み上げない', async () => {
    const store = createStore();
    store.set(speechState, {
      ...defaultSpeechState,
      enabled: false,
    });

    renderHook(() => useTTS(), { wrapper: createWrapper(store) });
    await flushAsync();

    expect(mockSpeak).not.toHaveBeenCalled();
  });

  it('SSML断片をプレーンテキストへ変換してから読み上げる', async () => {
    const { useTTSText } = jest.requireMock('./useTTSText') as {
      useTTSText: jest.Mock;
    };
    useTTSText.mockReturnValue({
      text: [
        '次は<break time="250ms"/><sub alias="オオサキ">大崎</sub>です',
        'The next station is <phoneme alphabet="ipa" ph="oːsaki">Osaki</phoneme>,<break time="200ms"/> J Y <say-as interpret-as="cardinal">24</say-as>.',
      ],
    });

    const store = createStore();
    store.set(speechState, defaultSpeechState);

    renderHook(() => useTTS(), { wrapper: createWrapper(store) });
    await flushAsync();

    expect(mockSpeak).toHaveBeenNthCalledWith(
      1,
      '次は、オオサキです',
      expect.objectContaining({ language: 'ja-JP' })
    );
    expect(mockSpeak).toHaveBeenNthCalledWith(
      2,
      'The next station is Osaki, J Y 24.',
      expect.objectContaining({ language: 'en-US' })
    );
  });

  it('英語文に日本語が混入している場合は除去してから読み上げる', async () => {
    const { useTTSText } = jest.requireMock('./useTTSText') as {
      useTTSText: jest.Mock;
    };
    // nameRoman 欠落データ等で wrapPhoneme のローマ字フォールバックが効かない
    // ケース。日本語が混じった英語文は TTS エンジンが言語を誤判定して全文を
    // 日本語音声で合成してしまうため、除去して英語音声を維持する
    useTTSText.mockReturnValue({
      text: ['つぎはあかさかです', 'Arriving at あかさか K 7.'],
    });

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const store = createStore();
    store.set(speechState, defaultSpeechState);

    renderHook(() => useTTS(), { wrapper: createWrapper(store) });
    await flushAsync();

    expect(mockSpeak).toHaveBeenNthCalledWith(
      2,
      'Arriving at K 7.',
      expect.objectContaining({ language: 'en-US' })
    );
    expect(warnSpy).toHaveBeenCalledWith(
      '[useTTS] English text contains Japanese characters, stripping:',
      'Arriving at あかさか K 7.'
    );

    warnSpy.mockRestore();
  });

  it('音声一覧の取得完了を待ってから初回発話を開始する', async () => {
    let resolveVoices: (voices: unknown[]) => void = () => {};
    mockGetAvailableVoicesAsync.mockReturnValue(
      new Promise<unknown[]>((resolve) => {
        resolveVoices = resolve;
      })
    );

    const store = createStore();
    store.set(speechState, defaultSpeechState);

    renderHook(() => useTTS(), { wrapper: createWrapper(store) });
    await flushAsync();

    // 音声一覧が未解決の間は発話を開始しない
    expect(mockSpeak).not.toHaveBeenCalled();

    await act(async () => {
      resolveVoices([
        {
          identifier: 'com.apple.voice.premium.ja-JP.Kyoko',
          name: 'Kyoko',
          quality: 'Default',
          language: 'ja-JP',
        },
      ]);
    });
    await flushAsync();

    // 取得完了後、初回発話から選択済みの音声が指定される
    expect(mockSpeak).toHaveBeenCalledWith(
      'ja text',
      expect.objectContaining({
        language: 'ja-JP',
        voice: 'com.apple.voice.premium.ja-JP.Kyoko',
      })
    );
  });

  it('再生中のテキスト変化はpendingに積み、全発話完了後に読み上げる', async () => {
    const { useTTSText } = jest.requireMock('./useTTSText') as {
      useTTSText: jest.Mock;
    };

    const store = createStore();
    store.set(speechState, defaultSpeechState);

    const { rerender } = renderHook(() => useTTS(), {
      wrapper: createWrapper(store),
    });
    await flushAsync();

    expect(mockSpeak).toHaveBeenCalledTimes(2);

    // 再生完了前に次の駅のテキストへ変化させる
    useTTSText.mockReturnValue({
      text: ['ja text 2', 'en text 2'],
    });
    rerender({});

    // 再生中はpendingに積まれるだけで新たな発話は始まらない
    expect(mockSpeak).toHaveBeenCalledTimes(2);

    // 現在の発話（JA→EN）を完了させるとpendingが読み上げられる
    act(() => {
      finishAllUtterances();
    });
    await flushAsync();

    await waitFor(() => {
      expect(mockSpeak).toHaveBeenCalledTimes(4);
    });
    expect(mockSpeak).toHaveBeenNthCalledWith(
      2,
      'en text',
      expect.objectContaining({ language: 'en-US' })
    );
    expect(mockSpeak).toHaveBeenNthCalledWith(
      3,
      'ja text 2',
      expect.objectContaining({ language: 'ja-JP' })
    );
    expect(mockSpeak).toHaveBeenNthCalledWith(
      4,
      'en text 2',
      expect.objectContaining({ language: 'en-US' })
    );
  });

  it('テキスト空時にpendingをクリアする', async () => {
    const { useTTSText } = jest.requireMock('./useTTSText') as {
      useTTSText: jest.Mock;
    };

    const store = createStore();
    store.set(speechState, defaultSpeechState);

    const { rerender } = renderHook(() => useTTS(), {
      wrapper: createWrapper(store),
    });
    await flushAsync();

    expect(mockSpeak).toHaveBeenCalledTimes(2);

    // テキストを空にして再描画
    useTTSText.mockReturnValue({ text: ['', ''] });
    rerender({});

    // 現在の発話（JA→EN）を完了させてもpendingが無いため追加の発話は起きない
    act(() => {
      finishAllUtterances();
    });
    await flushAsync();

    expect(mockSpeak).toHaveBeenCalledTimes(2);
  });

  it('完了コールバックが届かなくても安全タイムアウトで再生パイプラインが解放される', async () => {
    const { useTTSText } = jest.requireMock('./useTTSText') as {
      useTTSText: jest.Mock;
    };

    const store = createStore();
    store.set(speechState, defaultSpeechState);

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const { rerender } = renderHook(() => useTTS(), {
      wrapper: createWrapper(store),
    });
    await flushAsync();

    expect(mockSpeak).toHaveBeenCalledTimes(2);

    // 再生完了前に次のテキストをpendingへ積む
    useTTSText.mockReturnValue({
      text: ['ja text 2', 'en text 2'],
    });
    rerender({});
    expect(mockSpeak).toHaveBeenCalledTimes(2);

    // onDone/onError/onStoppedが一切届かないままタイムアウトさせる
    act(() => {
      jest.advanceTimersByTime(300_000);
    });

    expect(warnSpy).toHaveBeenCalledWith(
      '[useTTS] Playback safety timeout reached, force resetting'
    );
    // ハングした読み上げを停止し、pendingの発話が開始される
    expect(mockSpeechStop).toHaveBeenCalled();
    await flushAsync();
    await waitFor(() => {
      expect(mockSpeak).toHaveBeenCalledTimes(4);
    });
    expect(mockSpeak).toHaveBeenNthCalledWith(
      3,
      'ja text 2',
      expect.objectContaining({ language: 'ja-JP' })
    );
    expect(mockSpeak).toHaveBeenNthCalledWith(
      4,
      'en text 2',
      expect.objectContaining({ language: 'en-US' })
    );

    warnSpy.mockRestore();
  });

  it('発話エラーも完了として扱い、全発話が終わったらpendingへ進む', async () => {
    const { useTTSText } = jest.requireMock('./useTTSText') as {
      useTTSText: jest.Mock;
    };

    const store = createStore();
    store.set(speechState, defaultSpeechState);

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const { rerender } = renderHook(() => useTTS(), {
      wrapper: createWrapper(store),
    });
    await flushAsync();

    expect(mockSpeak).toHaveBeenCalledTimes(2);

    useTTSText.mockReturnValue({
      text: ['ja text 2', 'en text 2'],
    });
    rerender({});

    // JAがエラー、ENが正常完了してもpendingへ進む
    act(() => {
      (mockSpeak.mock.calls[0][1] as SpeechOptions).onError?.(
        new Error('speech failed')
      );
      (mockSpeak.mock.calls[1][1] as SpeechOptions).onDone?.();
    });
    await flushAsync();

    await waitFor(() => {
      expect(mockSpeak).toHaveBeenNthCalledWith(
        3,
        'ja text 2',
        expect.objectContaining({ language: 'ja-JP' })
      );
    });

    warnSpy.mockRestore();
  });

  it('resetFirstSpeechAtom変更時にuseTTSTextへfirstSpeech=trueが同期的に渡される', async () => {
    const { useTTSText } = jest.requireMock('./useTTSText') as {
      useTTSText: jest.Mock;
    };

    const store = createStore();
    store.set(speechState, defaultSpeechState);

    renderHook(() => useTTS(), { wrapper: createWrapper(store) });
    await flushAsync();

    expect(mockSpeak).toHaveBeenCalled();
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

  it('端末に高品質音声があれば初回発話から明示指定する', async () => {
    mockGetAvailableVoicesAsync.mockResolvedValue([
      {
        identifier: 'com.apple.voice.premium.ja-JP.Kyoko',
        name: 'Kyoko',
        quality: 'Default',
        language: 'ja-JP',
      },
      {
        identifier: 'com.apple.voice.enhanced.en-US.Ava',
        name: 'Ava',
        quality: 'Enhanced',
        language: 'en-US',
      },
    ]);

    const store = createStore();
    store.set(speechState, defaultSpeechState);

    renderHook(() => useTTS(), { wrapper: createWrapper(store) });
    await flushAsync();

    expect(mockSpeak).toHaveBeenCalledWith(
      'ja text',
      expect.objectContaining({
        language: 'ja-JP',
        voice: 'com.apple.voice.premium.ja-JP.Kyoko',
      })
    );

    act(() => {
      finishAllUtterances();
    });

    expect(mockSpeak).toHaveBeenCalledWith(
      'en text',
      expect.objectContaining({
        language: 'en-US',
        voice: 'com.apple.voice.enhanced.en-US.Ava',
      })
    );
  });

  it('[iOS] 高品質音声が無い場合はvoice未指定でシステム既定に任せる', async () => {
    const store = createStore();
    store.set(speechState, defaultSpeechState);

    renderHook(() => useTTS(), { wrapper: createWrapper(store) });
    await flushAsync();

    act(() => {
      finishAllUtterances();
    });

    expect(mockSpeak).toHaveBeenCalledTimes(2);
    for (const call of mockSpeak.mock.calls) {
      expect(call[1]).not.toHaveProperty('voice');
    }
  });

  it('[Android] 既定品質でもローカル音声を明示指定して読み上げる', async () => {
    setPlatformOS('android');

    // Android の音声は識別子に品質を含まず quality=Default が大半。
    // 言語フォールバック不備を避けるため既定品質でも明示指定する
    mockGetAvailableVoicesAsync.mockResolvedValue([
      {
        identifier: 'ja-jp-x-htm-local',
        name: 'ja-jp-x-htm-local',
        quality: 'Default',
        language: 'ja-JP',
      },
      {
        identifier: 'en-us-x-iob-local',
        name: 'en-us-x-iob-local',
        quality: 'Default',
        language: 'en-US',
      },
    ]);

    const store = createStore();
    store.set(speechState, defaultSpeechState);

    renderHook(() => useTTS(), { wrapper: createWrapper(store) });
    await flushAsync();

    expect(mockSpeak).toHaveBeenCalledWith(
      'ja text',
      expect.objectContaining({
        language: 'ja-JP',
        voice: 'ja-jp-x-htm-local',
      })
    );

    act(() => {
      finishAllUtterances();
    });

    expect(mockSpeak).toHaveBeenCalledWith(
      'en text',
      expect.objectContaining({
        language: 'en-US',
        voice: 'en-us-x-iob-local',
      })
    );
  });

  it('[Android] 対象言語の音声が端末に無い場合はその言語の発話をスキップする', async () => {
    setPlatformOS('android');

    // 日本語音声しか無い端末を再現。英語を voice 未指定で speak すると
    // 言語データ欠如時のフォールバックで日本語音声により合成されるため、
    // 英語の発話自体をスキップする
    mockGetAvailableVoicesAsync.mockResolvedValue([
      {
        identifier: 'ja-jp-x-htm-local',
        name: 'ja-jp-x-htm-local',
        quality: 'Default',
        language: 'ja-JP',
      },
    ]);

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const store = createStore();
    store.set(speechState, defaultSpeechState);

    renderHook(() => useTTS(), { wrapper: createWrapper(store) });
    await flushAsync();

    expect(mockSpeak).toHaveBeenCalledWith(
      'ja text',
      expect.objectContaining({ language: 'ja-JP', voice: 'ja-jp-x-htm-local' })
    );

    // 日本語の発話を完了させても英語の発話は始まらない
    act(() => {
      finishAllUtterances();
    });
    expect(mockSpeak.mock.calls.some(([text]) => text === 'en text')).toBe(
      false
    );

    warnSpy.mockRestore();
  });

  it('アンマウント時に読み上げを停止する', async () => {
    const store = createStore();
    store.set(speechState, defaultSpeechState);

    const { unmount } = renderHook(() => useTTS(), {
      wrapper: createWrapper(store),
    });
    await flushAsync();

    expect(mockSpeak).toHaveBeenCalled();

    unmount();

    expect(mockSpeechStop).toHaveBeenCalled();
  });

  it('発話開始直前にダッキングを有効化し、全発話完了後に解除する', async () => {
    const store = createStore();
    store.set(speechState, defaultSpeechState);

    renderHook(() => useTTS(), { wrapper: createWrapper(store) });
    await flushAsync();

    // マウント時点では非ダッキング（mixWithOthers）が既定
    expect(mockSetAudioModeAsync).toHaveBeenCalledWith(
      expect.objectContaining({ interruptionMode: 'mixWithOthers' })
    );

    // 発話開始直前にダッキングが有効化される
    expect(mockSetAudioModeAsync).toHaveBeenCalledWith(
      expect.objectContaining({ interruptionMode: 'duckOthers' })
    );

    // duckOthers の呼び出し有無だけでなく、Speech.speak より前に呼ばれる
    // ことも検証する（speak の後にダッキングする退行を検知するため）
    const duckCallOrder = mockSetAudioModeAsync.mock.calls
      .map((call, index) =>
        (call[0] as { interruptionMode: string }).interruptionMode ===
        'duckOthers'
          ? mockSetAudioModeAsync.mock.invocationCallOrder[index]
          : null
      )
      .filter((order): order is number => order !== null)[0];
    const firstSpeakCallOrder = mockSpeak.mock.invocationCallOrder[0];
    expect(duckCallOrder).toBeLessThan(firstSpeakCallOrder);

    mockSetAudioModeAsync.mockClear();

    // 保留中の発話が無い状態で全発話を完了させると、ダッキングが解除される
    act(() => {
      finishAllUtterances();
    });
    await flushAsync();

    expect(mockSetAudioModeAsync).toHaveBeenCalledWith(
      expect.objectContaining({ interruptionMode: 'mixWithOthers' })
    );
  });

  it('保留中の発話がある場合はダッキングを解除せず継続する', async () => {
    const { useTTSText } = jest.requireMock('./useTTSText') as {
      useTTSText: jest.Mock;
    };

    const store = createStore();
    store.set(speechState, defaultSpeechState);

    const { rerender } = renderHook(() => useTTS(), {
      wrapper: createWrapper(store),
    });
    await flushAsync();

    useTTSText.mockReturnValue({
      text: ['ja text 2', 'en text 2'],
    });
    rerender({});

    mockSetAudioModeAsync.mockClear();

    // 保留中の次の発話があるため、完了直後はダッキングを解除しない
    act(() => {
      finishAllUtterances();
    });
    await flushAsync();

    expect(mockSetAudioModeAsync).not.toHaveBeenCalledWith(
      expect.objectContaining({ interruptionMode: 'mixWithOthers' })
    );
    expect(mockSetAudioModeAsync).toHaveBeenCalledWith(
      expect.objectContaining({ interruptionMode: 'duckOthers' })
    );
  });

  it('発話中にbackgroundEnabledが変化してもダッキングを維持する', async () => {
    const store = createStore();
    store.set(speechState, defaultSpeechState);

    renderHook(() => useTTS(), { wrapper: createWrapper(store) });
    await flushAsync();

    // 発話開始直後（ダッキング有効中）に設定変更でbackgroundEnabledが変わる
    expect(mockSetAudioModeAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({ interruptionMode: 'duckOthers' })
    );

    mockSetAudioModeAsync.mockClear();
    act(() => {
      store.set(speechState, {
        ...defaultSpeechState,
        backgroundEnabled: true,
      });
    });
    await flushAsync();

    // backgroundEnabled変更の再設定でダッキングがmixWithOthersへ巻き戻らない
    expect(mockSetAudioModeAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        interruptionMode: 'duckOthers',
        shouldPlayInBackground: true,
      })
    );
    expect(mockSetAudioModeAsync).not.toHaveBeenCalledWith(
      expect.objectContaining({ interruptionMode: 'mixWithOthers' })
    );
  });

  it('発話中にアンマウントされた場合もダッキングを解除する', async () => {
    const store = createStore();
    store.set(speechState, defaultSpeechState);

    const { unmount } = renderHook(() => useTTS(), {
      wrapper: createWrapper(store),
    });
    await flushAsync();

    mockSetAudioModeAsync.mockClear();

    unmount();

    expect(mockSetAudioModeAsync).toHaveBeenCalledWith(
      expect.objectContaining({ interruptionMode: 'mixWithOthers' })
    );
  });
});
