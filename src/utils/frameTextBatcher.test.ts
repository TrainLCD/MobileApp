import { createFrameTextBatcher } from './frameTextBatcher';

describe('createFrameTextBatcher', () => {
  let callbacks: Map<number, FrameRequestCallback>;
  beforeEach(() => {
    callbacks = new Map();
    let id = 0;
    jest
      .spyOn(global, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        callbacks.set(++id, callback);
        return id;
      });
    jest.spyOn(global, 'cancelAnimationFrame').mockImplementation((id) => {
      if (id != null) callbacks.delete(id);
    });
  });
  afterEach(() => jest.restoreAllMocks());

  it('同じフレームの断片を順番どおり一度に反映する', () => {
    const onText = jest.fn();
    const batch = createFrameTextBatcher(onText);
    batch.append('東');
    batch.append('京');
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(onText).not.toHaveBeenCalled();
    callbacks.values().next().value?.(0);
    expect(onText).toHaveBeenCalledTimes(1);
    expect(onText).toHaveBeenCalledWith('東京');
    batch.append('駅');
    batch.flush();
    expect(onText).toHaveBeenLastCalledWith('駅');
  });
  it('確定応答より前に未反映の断片を反映し、後から重複させない', () => {
    const onText = jest.fn();
    const batch = createFrameTextBatcher(onText);
    batch.append('本文');
    batch.flush();
    batch.flush();
    expect(onText).toHaveBeenCalledTimes(1);
    expect(callbacks.size).toBe(0);
  });
  it('リセット・アンマウント後は保留中も後着の断片も破棄する', () => {
    const onText = jest.fn();
    const batch = createFrameTextBatcher(onText);
    batch.append('古い応答');
    const staleFrame = callbacks.values().next().value;
    batch.cancel();
    batch.append('遅延応答');
    batch.flush();
    staleFrame?.(0);
    expect(onText).not.toHaveBeenCalled();
    expect(callbacks.size).toBe(0);
  });
});
