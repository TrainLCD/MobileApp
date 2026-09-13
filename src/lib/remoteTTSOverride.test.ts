import { STORAGE_KEYS } from '~/constants/storage';
import { storage } from '~/lib/storage';
import {
  getRemoteTTSOverride,
  REMOTE_TTS_OVERRIDE,
  resetRemoteTTSOverrideForTests,
  setRemoteTTSOverride,
  subscribeRemoteTTSOverride,
} from './remoteTTSOverride';

// isDevApp はモジュール読み込み時に評価される定数なので、ゲートの検証では
// getter 経由で差し替えられるようモックしておく（既定は dev アプリ相当）。
let mockIsDevApp = true;
jest.mock('~/utils/isDevApp', () => ({
  get isDevApp() {
    return mockIsDevApp;
  },
}));

describe('remoteTTSOverride（リモートTTSの強制切替）', () => {
  beforeEach(() => {
    mockIsDevApp = true;
    resetRemoteTTSOverrideForTests();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    resetRemoteTTSOverrideForTests();
  });

  it('未設定なら上書きなし（auto）', () => {
    expect(getRemoteTTSOverride()).toBe(REMOTE_TTS_OVERRIDE.AUTO);
  });

  it('設定するとストレージへ保存され次回以降も維持される', () => {
    setRemoteTTSOverride(REMOTE_TTS_OVERRIDE.ON);

    expect(getRemoteTTSOverride()).toBe(REMOTE_TTS_OVERRIDE.ON);
    expect(storage.getString(STORAGE_KEYS.REMOTE_TTS_OVERRIDE)).toBe('on');

    // 再起動相当（キャッシュのみ破棄）でも永続値から復元される
    setRemoteTTSOverride(REMOTE_TTS_OVERRIDE.OFF);
    expect(storage.getString(STORAGE_KEYS.REMOTE_TTS_OVERRIDE)).toBe('off');
    expect(getRemoteTTSOverride()).toBe(REMOTE_TTS_OVERRIDE.OFF);
  });

  it('想定外の値が保存されていても auto へ倒す', () => {
    storage.set(STORAGE_KEYS.REMOTE_TTS_OVERRIDE, 'yes');

    expect(getRemoteTTSOverride()).toBe(REMOTE_TTS_OVERRIDE.AUTO);
  });

  it('本番ビルドでは保存済みの値があっても常に auto', () => {
    setRemoteTTSOverride(REMOTE_TTS_OVERRIDE.ON);
    resetRemoteTTSOverrideForTests();
    storage.set(STORAGE_KEYS.REMOTE_TTS_OVERRIDE, 'on');

    mockIsDevApp = false;
    expect(getRemoteTTSOverride()).toBe(REMOTE_TTS_OVERRIDE.AUTO);

    mockIsDevApp = true;
    expect(getRemoteTTSOverride()).toBe(REMOTE_TTS_OVERRIDE.ON);
  });

  it('読み取りに失敗しても auto を返して動作を継続する', () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    jest.spyOn(storage, 'getString').mockImplementationOnce(() => {
      throw new Error('storage failure');
    });

    expect(getRemoteTTSOverride()).toBe(REMOTE_TTS_OVERRIDE.AUTO);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to read remote TTS override',
      expect.any(Error)
    );

    // 失敗をキャッシュせず、次の呼び出しで読み直す
    storage.set(STORAGE_KEYS.REMOTE_TTS_OVERRIDE, 'off');
    expect(getRemoteTTSOverride()).toBe(REMOTE_TTS_OVERRIDE.OFF);
  });

  it('保存に失敗した場合は例外を送出しキャッシュを進めない', () => {
    jest.spyOn(storage, 'set').mockImplementationOnce(() => {
      throw new Error('storage failure');
    });

    expect(() => setRemoteTTSOverride(REMOTE_TTS_OVERRIDE.ON)).toThrow(
      'storage failure'
    );
    expect(getRemoteTTSOverride()).toBe(REMOTE_TTS_OVERRIDE.AUTO);
  });

  it('変更が購読者へ通知され、解除後は通知されない', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeRemoteTTSOverride(listener);

    setRemoteTTSOverride(REMOTE_TTS_OVERRIDE.OFF);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    setRemoteTTSOverride(REMOTE_TTS_OVERRIDE.ON);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
