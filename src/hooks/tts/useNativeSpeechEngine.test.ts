import { act, renderHook } from '@testing-library/react-native';
import type { SpeechEngineRequest } from './speechEngine';
import { useNativeSpeechEngine } from './useNativeSpeechEngine';

type SpeakOptions = {
  language?: string;
  voice?: string;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (error: unknown) => void;
};

const speakCalls: SpeakOptions[] = [];
const mockSpeak = jest.fn((_text: string, options: SpeakOptions) => {
  speakCalls.push(options);
});
const mockStop = jest.fn();
const mockGetAvailableVoicesAsync = jest.fn();

jest.mock('expo-speech', () => ({
  speak: (text: string, options: SpeakOptions) => mockSpeak(text, options),
  stop: () => mockStop(),
  getAvailableVoicesAsync: () => mockGetAvailableVoicesAsync(),
  maxSpeechInputLength: 4000,
  VoiceQuality: { Default: 'Default', Enhanced: 'Enhanced' },
}));

// 音声選択そのものは nativeTtsVoice のテストで担保する。ここでは
// Android でも音声が見つかった状態にして、発話がスキップされないようにする。
jest.mock('~/utils/nativeTtsVoice', () => ({
  selectBestVoiceIdentifier: () => 'test-voice',
}));

const mockAcquireSpeechAudioFocus = jest.fn();
const mockReleaseSpeechAudioFocus = jest.fn();
jest.mock('~/utils/speechAudioFocus', () => ({
  acquireSpeechAudioFocus: () => mockAcquireSpeechAudioFocus(),
  releaseSpeechAudioFocus: () => mockReleaseSpeechAudioFocus(),
}));

const defaultRequest: SpeechEngineRequest = {
  ssmlJa: '次は<sub alias="オオサキ">大崎</sub>です',
  ssmlEn: 'The next station is Osaki,<break time="200ms"/> J Y 24.',
  speakJa: true,
  speakEn: true,
};

// 発話は音声一覧の取得完了を待つため非同期。マイクロタスクを進めて
// Speech.speak の呼び出しまで到達させる。
const flushAsync = async () => {
  await act(async () => {
    for (let i = 0; i < 5; i += 1) {
      await Promise.resolve();
    }
  });
};

const renderEngine = () => renderHook(() => useNativeSpeechEngine());

describe('useNativeSpeechEngine', () => {
  beforeEach(() => {
    // 音声一覧取得の上限待ち（VOICES_READY_TIMEOUT_MS）が実タイマーのまま
    // テスト終了後も残らないよう、この suite では偽タイマーを使う。
    jest.useFakeTimers();
    jest.clearAllMocks();
    speakCalls.length = 0;
    mockGetAvailableVoicesAsync.mockResolvedValue([
      { identifier: 'test-voice', name: 'test-voice', language: 'ja-JP' },
    ]);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('発話の直前にオーディオフォーカスを取得し、全発話の完了で返却する', async () => {
    const onSettled = jest.fn();
    const { result } = renderEngine();

    result.current.speak(defaultRequest, { onSettled });
    await flushAsync();

    expect(mockAcquireSpeechAudioFocus).toHaveBeenCalledTimes(1);
    expect(speakCalls).toHaveLength(2);
    expect(mockReleaseSpeechAudioFocus).not.toHaveBeenCalled();

    // 日本語だけ完了した時点ではまだ英語が残るため返却しない
    act(() => {
      speakCalls[0]?.onDone?.();
    });
    expect(mockReleaseSpeechAudioFocus).not.toHaveBeenCalled();
    expect(onSettled).not.toHaveBeenCalled();

    act(() => {
      speakCalls[1]?.onDone?.();
    });
    expect(mockReleaseSpeechAudioFocus).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it('読み上げ途中で stop された場合もオーディオフォーカスを返却する', async () => {
    const onSettled = jest.fn();
    const { result } = renderEngine();

    result.current.speak(defaultRequest, { onSettled });
    await flushAsync();
    expect(mockAcquireSpeechAudioFocus).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.stop();
    });

    expect(mockStop).toHaveBeenCalledTimes(1);
    expect(mockReleaseSpeechAudioFocus).toHaveBeenCalledTimes(1);

    // 停止で無効化された発話のコールバックが後から届いても onSettled は呼ばない
    act(() => {
      speakCalls[0]?.onStopped?.();
      speakCalls[1]?.onStopped?.();
    });
    expect(onSettled).not.toHaveBeenCalled();
  });

  it('読み上げ対象が無い場合はオーディオフォーカスを取得しない', async () => {
    const onSettled = jest.fn();
    const { result } = renderEngine();

    result.current.speak(
      { ...defaultRequest, speakJa: false, speakEn: false },
      { onSettled }
    );
    await flushAsync();

    expect(mockSpeak).not.toHaveBeenCalled();
    expect(mockAcquireSpeechAudioFocus).not.toHaveBeenCalled();
    expect(onSettled).toHaveBeenCalledTimes(1);
  });
});
