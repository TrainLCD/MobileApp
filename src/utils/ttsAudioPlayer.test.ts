import {
  FINISH_END_EPSILON_SEC,
  MAX_RESUME_ATTEMPTS,
  playAudio,
  STALL_CHECK_INTERVAL_MS,
  STALL_TIMEOUT_MS,
  safeRemoveListener,
  safeRemovePlayer,
} from './ttsAudioPlayer';

const mockCreateAudioPlayer = jest.fn();

jest.mock('expo-audio', () => ({
  createAudioPlayer: (...args: unknown[]) => mockCreateAudioPlayer(...args),
}));

type EmittedStatus = {
  didJustFinish?: boolean;
  error?: string;
  currentTime?: number;
  duration?: number;
  playbackState?: string;
  reasonForWaitingToPlay?: string;
};

type StatusCallback = (status: EmittedStatus) => void;

const createMockPlayer = (opts?: { playing?: boolean; duration?: number }) => {
  let statusCallback: StatusCallback | null = null;
  const listenerRemove = jest.fn();
  const player = {
    playing: opts?.playing ?? false,
    currentTime: 0,
    duration: opts?.duration ?? 0,
    addListener: jest.fn((_event: string, callback: StatusCallback) => {
      statusCallback = callback;
      return { remove: listenerRemove };
    }),
    play: jest.fn(),
    pause: jest.fn(),
    remove: jest.fn(),
    replace: jest.fn(),
    seekTo: jest.fn().mockResolvedValue(undefined),
  };
  return {
    player,
    listenerRemove,
    emitStatus: (status: EmittedStatus) => {
      statusCallback?.(status);
    },
  };
};

describe('safeRemoveListener', () => {
  it('null を渡しても例外にならない', () => {
    expect(() => safeRemoveListener(null)).not.toThrow();
  });

  it('listener の remove を呼ぶ', () => {
    const remove = jest.fn();
    safeRemoveListener({ remove });
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('remove が例外を投げても安全', () => {
    const remove = jest.fn(() => {
      throw new Error('already removed');
    });
    expect(() => safeRemoveListener({ remove })).not.toThrow();
  });
});

describe('safeRemovePlayer', () => {
  it('null を渡しても例外にならない', () => {
    expect(() => safeRemovePlayer(null)).not.toThrow();
  });

  it('player の pause と remove を呼ぶ', () => {
    const player = {
      pause: jest.fn(),
      remove: jest.fn(),
    } as unknown as Parameters<typeof safeRemovePlayer>[0];
    safeRemovePlayer(player);
    expect(
      (player as unknown as { pause: jest.Mock }).pause
    ).toHaveBeenCalledTimes(1);
    expect(
      (player as unknown as { remove: jest.Mock }).remove
    ).toHaveBeenCalledTimes(1);
  });

  it('pause/remove が例外を投げても安全', () => {
    const player = {
      pause: jest.fn(() => {
        throw new Error('fail');
      }),
      remove: jest.fn(),
    } as unknown as Parameters<typeof safeRemovePlayer>[0];
    expect(() => safeRemovePlayer(player)).not.toThrow();
  });
});

describe('playAudio', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('再生完了時に onFinish を呼ぶ', () => {
    const mock = createMockPlayer();
    mockCreateAudioPlayer.mockReturnValue(mock.player);

    const onFinish = jest.fn();
    const onError = jest.fn();
    playAudio({ uri: 'test.mp3', onFinish, onError });

    expect(mock.player.play).toHaveBeenCalledTimes(1);

    mock.emitStatus({ didJustFinish: true });

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
    expect(mock.listenerRemove).toHaveBeenCalledTimes(1);
  });

  it('再生エラー時に onError を呼ぶ', () => {
    const mock = createMockPlayer();
    mockCreateAudioPlayer.mockReturnValue(mock.player);

    const onFinish = jest.fn();
    const onError = jest.fn();
    playAudio({ uri: 'test.mp3', onFinish, onError });

    mock.emitStatus({ error: 'decode error' });

    expect(onError).toHaveBeenCalledWith('decode error');
    expect(onFinish).not.toHaveBeenCalled();
    expect(mock.listenerRemove).toHaveBeenCalledTimes(1);
  });

  it('play() が例外を投げた場合に onError を呼ぶ', () => {
    const mock = createMockPlayer();
    const playError = new Error('play failed');
    mock.player.play.mockImplementation(() => {
      throw playError;
    });
    mockCreateAudioPlayer.mockReturnValue(mock.player);

    const onFinish = jest.fn();
    const onError = jest.fn();
    playAudio({ uri: 'test.mp3', onFinish, onError });

    expect(onError).toHaveBeenCalledWith(playError);
    expect(onFinish).not.toHaveBeenCalled();
    expect(mock.listenerRemove).toHaveBeenCalledTimes(1);
  });

  it('PlayAudioHandle の player と listener を返す', () => {
    const mock = createMockPlayer();
    mockCreateAudioPlayer.mockReturnValue(mock.player);

    const handle = playAudio({
      uri: 'test.mp3',
      onFinish: jest.fn(),
      onError: jest.fn(),
    });

    expect(handle.player).toBe(mock.player);
    expect(handle.listener).toEqual({ remove: expect.any(Function) });
  });

  it('指定した uri でプレイヤーを作成する', () => {
    const mock = createMockPlayer();
    mockCreateAudioPlayer.mockReturnValue(mock.player);

    playAudio({
      uri: '/path/to/audio.mp3',
      onFinish: jest.fn(),
      onError: jest.fn(),
    });

    expect(mockCreateAudioPlayer).toHaveBeenCalledWith({
      uri: '/path/to/audio.mp3',
    });
  });

  it('既存プレイヤーを渡すと再生成せず replace で音源を差し替える', () => {
    const mock = createMockPlayer();

    const handle = playAudio({
      uri: '/path/to/next.mp3',
      player: mock.player as unknown as Parameters<
        typeof playAudio
      >[0]['player'],
      onFinish: jest.fn(),
      onError: jest.fn(),
    });

    // createAudioPlayer は呼ばれず、既存インスタンスが使い回される
    expect(mockCreateAudioPlayer).not.toHaveBeenCalled();
    expect(handle.player).toBe(mock.player);
    // 前回再生をリセットしてから replace し、再生を開始する
    expect(mock.player.pause).toHaveBeenCalled();
    expect(mock.player.replace).toHaveBeenCalledWith({
      uri: '/path/to/next.mp3',
    });
    expect(mock.player.play).toHaveBeenCalledTimes(1);
  });

  it('再生位置が進まないままの場合はストールとして onError を呼ぶ', () => {
    // Androidではネイティブエラーや音声フォーカス喪失でプレイヤーが
    // 停止してもイベントが届かないため、ウォッチドッグで検知する
    const mock = createMockPlayer({ playing: false });
    mockCreateAudioPlayer.mockReturnValue(mock.player);

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const onFinish = jest.fn();
    const onError = jest.fn();
    playAudio({ uri: 'stalled.mp3', onFinish, onError });

    jest.advanceTimersByTime(STALL_TIMEOUT_MS + STALL_CHECK_INTERVAL_MS);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(onFinish).not.toHaveBeenCalled();
    expect(mock.listenerRemove).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      '[ttsAudioPlayer] playback stalled, aborting:',
      'stalled.mp3'
    );

    warnSpy.mockRestore();
  });

  it('playing=true の間はストール扱いしない', () => {
    const mock = createMockPlayer({ playing: true });
    mockCreateAudioPlayer.mockReturnValue(mock.player);

    const onFinish = jest.fn();
    const onError = jest.fn();
    playAudio({ uri: 'long.mp3', onFinish, onError });

    jest.advanceTimersByTime(STALL_TIMEOUT_MS * 3);

    expect(onError).not.toHaveBeenCalled();
    expect(onFinish).not.toHaveBeenCalled();
  });

  it('currentTime が進んでいる間はストール扱いしない', () => {
    const mock = createMockPlayer({ playing: false });
    mockCreateAudioPlayer.mockReturnValue(mock.player);

    const onFinish = jest.fn();
    const onError = jest.fn();
    playAudio({ uri: 'progressing.mp3', onFinish, onError });

    // ポーリングごとに再生位置を進める
    for (let i = 0; i < (STALL_TIMEOUT_MS / STALL_CHECK_INTERVAL_MS) * 3; i++) {
      mock.player.currentTime += 1;
      jest.advanceTimersByTime(STALL_CHECK_INTERVAL_MS);
    }

    expect(onError).not.toHaveBeenCalled();
    expect(onFinish).not.toHaveBeenCalled();
  });

  it('再生完了後はウォッチドッグが停止する', () => {
    const mock = createMockPlayer({ playing: false });
    mockCreateAudioPlayer.mockReturnValue(mock.player);

    const onFinish = jest.fn();
    const onError = jest.fn();
    playAudio({ uri: 'finished.mp3', onFinish, onError });

    mock.emitStatus({ didJustFinish: true });
    jest.advanceTimersByTime(STALL_TIMEOUT_MS * 3);

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('終端付近の didJustFinish は正常完了として扱う', () => {
    const mock = createMockPlayer({ playing: true, duration: 30 });
    mockCreateAudioPlayer.mockReturnValue(mock.player);

    const onFinish = jest.fn();
    const onError = jest.fn();
    playAudio({ uri: 'complete.mp3', onFinish, onError });

    // 終端(30s)付近で完了 → そのまま完了扱い
    mock.emitStatus({ didJustFinish: true, currentTime: 29.9, duration: 30 });

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(mock.player.seekTo).not.toHaveBeenCalled();
  });

  it('完了通知が位置を終端で上書きしても直前の実位置から再開する', async () => {
    const mock = createMockPlayer({ playing: true, duration: 30 });
    mockCreateAudioPlayer.mockReturnValue(mock.player);
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const onFinish = jest.fn();
    const onError = jest.fn();
    playAudio({ uri: 'ios-early-finish.mp3', onFinish, onError });

    // iOS は早期終了前の実位置を通常更新で通知した後、完了イベントだけ
    // currentTime=duration に上書きする。この終端値を信用すると英語へ進んでしまう。
    mock.emitStatus({ currentTime: 10, duration: 30 });
    mock.player.currentTime = 10;
    mock.emitStatus({ didJustFinish: true, currentTime: 30, duration: 30 });

    expect(onFinish).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(mock.player.seekTo).toHaveBeenCalledWith(10);

    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
    }
    expect(mock.player.play).toHaveBeenCalledTimes(2);

    warnSpy.mockRestore();
  });

  it('プレイヤー位置が0にリセットされた場合は直前の状態位置から再開する', () => {
    const mock = createMockPlayer({ playing: true, duration: 30 });
    mockCreateAudioPlayer.mockReturnValue(mock.player);
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const onFinish = jest.fn();
    const onError = jest.fn();
    const handle = playAudio({
      uri: 'ios-reset-early-finish.mp3',
      onFinish,
      onError,
    });

    mock.emitStatus({ currentTime: 10, duration: 30 });
    mock.player.currentTime = 0;
    mock.emitStatus({ didJustFinish: true, currentTime: 30, duration: 30 });

    expect(mock.player.seekTo).toHaveBeenCalledWith(10);
    expect(onFinish).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();

    handle.listener.remove();
    warnSpy.mockRestore();
  });

  it('直前の実位置が終端付近なら上書きされた完了通知を受理する', () => {
    const mock = createMockPlayer({ playing: true, duration: 30 });
    mockCreateAudioPlayer.mockReturnValue(mock.player);

    const onFinish = jest.fn();
    const onError = jest.fn();
    playAudio({ uri: 'ios-complete.mp3', onFinish, onError });

    mock.emitStatus({ currentTime: 29.9, duration: 30 });
    mock.player.currentTime = 30;
    mock.emitStatus({ didJustFinish: true, currentTime: 30, duration: 30 });

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
    expect(mock.player.seekTo).not.toHaveBeenCalled();
  });

  it('終端手前の didJustFinish は早期完了とみなしその位置から再開する', async () => {
    const mock = createMockPlayer({ playing: true, duration: 30 });
    mockCreateAudioPlayer.mockReturnValue(mock.player);
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const onFinish = jest.fn();
    const onError = jest.fn();
    playAudio({ uri: 'long.mp3', onFinish, onError });

    // 本来30sあるのに10sで完了報告（iOSの早期 didJustFinish 誤報を再現）
    mock.emitStatus({ didJustFinish: true, currentTime: 10, duration: 30 });

    // 完了扱いせず、10sの位置へ seek してから再生を継続する
    expect(onFinish).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(mock.player.seekTo).toHaveBeenCalledWith(10);

    // seekTo の Promise チェーン（.catch → .finally → play）を消化する
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
    }

    // seek 完了後に再開の play() が呼ばれる（初回 play と合わせて 2 回）
    expect(mock.player.play).toHaveBeenCalledTimes(2);

    warnSpy.mockRestore();
  });

  it('位置が0の早期 didJustFinish は再開せず完了として扱う', () => {
    const mock = createMockPlayer({ playing: true, duration: 30 });
    mockCreateAudioPlayer.mockReturnValue(mock.player);
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const onFinish = jest.fn();
    const onError = jest.fn();
    playAudio({ uri: 'reset.mp3', onFinish, onError });

    // 位置が0にリセットされて報告された場合は頭から再生し直しを避け、完了として進む
    mock.emitStatus({ didJustFinish: true, currentTime: 0, duration: 30 });

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(mock.player.seekTo).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('早期 didJustFinish が続いても最大回数で完了として打ち切る', () => {
    const mock = createMockPlayer({ playing: true, duration: 30 });
    mockCreateAudioPlayer.mockReturnValue(mock.player);
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const onFinish = jest.fn();
    const onError = jest.fn();
    playAudio({ uri: 'stuck.mp3', onFinish, onError });

    // 上限回数までは再開を試み、それを超えたら完了として進む（無限ループ防止）
    for (let i = 0; i < MAX_RESUME_ATTEMPTS; i++) {
      mock.emitStatus({ didJustFinish: true, currentTime: 10, duration: 30 });
    }
    expect(onFinish).not.toHaveBeenCalled();
    expect(mock.player.seekTo).toHaveBeenCalledTimes(MAX_RESUME_ATTEMPTS);

    // 上限超過の早期完了は通常完了として扱う
    mock.emitStatus({ didJustFinish: true, currentTime: 10, duration: 30 });
    expect(onFinish).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });

  it('FINISH_END_EPSILON_SEC は正の有限値', () => {
    expect(Number.isFinite(FINISH_END_EPSILON_SEC)).toBe(true);
    expect(FINISH_END_EPSILON_SEC).toBeGreaterThan(0);
  });

  it('listener.remove() 後はウォッチドッグが停止する', () => {
    const mock = createMockPlayer({ playing: false });
    mockCreateAudioPlayer.mockReturnValue(mock.player);

    const onFinish = jest.fn();
    const onError = jest.fn();
    const handle = playAudio({ uri: 'removed.mp3', onFinish, onError });

    handle.listener.remove();
    jest.advanceTimersByTime(STALL_TIMEOUT_MS * 3);

    expect(onError).not.toHaveBeenCalled();
    expect(onFinish).not.toHaveBeenCalled();
    expect(mock.listenerRemove).toHaveBeenCalledTimes(1);
  });

  it('プレイヤーのプロパティ参照が例外を投げた場合は onError で復帰する', () => {
    const mock = createMockPlayer();
    Object.defineProperty(mock.player, 'playing', {
      get: () => {
        throw new Error('player released');
      },
    });
    mockCreateAudioPlayer.mockReturnValue(mock.player);

    const onFinish = jest.fn();
    const onError = jest.fn();
    playAudio({ uri: 'released.mp3', onFinish, onError });

    jest.advanceTimersByTime(STALL_CHECK_INTERVAL_MS);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onFinish).not.toHaveBeenCalled();
  });
});
