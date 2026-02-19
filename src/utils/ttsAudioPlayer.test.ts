import {
  playAudio,
  safeRemoveListener,
  safeRemovePlayer,
} from './ttsAudioPlayer';

const mockCreateAudioPlayer = jest.fn();

jest.mock('expo-audio', () => ({
  createAudioPlayer: (...args: unknown[]) => mockCreateAudioPlayer(...args),
}));

type StatusCallback = (status: {
  didJustFinish?: boolean;
  error?: string;
}) => void;

const createMockPlayer = () => {
  let statusCallback: StatusCallback | null = null;
  const listenerRemove = jest.fn();
  return {
    player: {
      addListener: jest.fn((_event: string, callback: StatusCallback) => {
        statusCallback = callback;
        return { remove: listenerRemove };
      }),
      play: jest.fn(),
      pause: jest.fn(),
      remove: jest.fn(),
    },
    listenerRemove,
    emitStatus: (status: { didJustFinish?: boolean; error?: string }) => {
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
    expect((player as { pause: jest.Mock }).pause).toHaveBeenCalledTimes(1);
    expect((player as { remove: jest.Mock }).remove).toHaveBeenCalledTimes(1);
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
});
