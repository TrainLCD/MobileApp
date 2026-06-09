import { memoizeLastCalls, memoizeWeak } from './memoizeLastCalls';

describe('memoizeLastCalls', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('同一引数の呼び出しでは計算せず同一結果を返す', () => {
    const fn = jest.fn((arr: number[], flag: boolean) => ({
      sum: arr.reduce((a, b) => a + b, 0),
      flag,
    }));
    const memoized = memoizeLastCalls(fn);
    const arr = [1, 2, 3];

    const first = memoized(arr, true);
    const second = memoized(arr, true);

    expect(second).toBe(first);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('異なる引数の組み合わせを同時にキャッシュできる', () => {
    const fn = jest.fn(
      (arr: number[], flag: boolean) => arr.length + (flag ? 1 : 0)
    );
    const memoized = memoizeLastCalls(fn);
    const arr = [1, 2, 3];

    // 異なる引数で交互に呼んでもキャッシュが入れ替わり続けない
    memoized(arr, true);
    memoized(arr, false);
    memoized(arr, true);
    memoized(arr, false);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('引数の参照が変われば再計算する', () => {
    const fn = jest.fn((arr: number[]) => arr.length);
    const memoized = memoizeLastCalls(fn);

    memoized([1]);
    memoized([1]);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('上限を超えたら古いエントリから破棄する', () => {
    const fn = jest.fn((n: number[]) => n.length);
    const memoized = memoizeLastCalls(fn, 2);
    const a = [1];
    const b = [1, 2];
    const c = [1, 2, 3];

    memoized(a);
    memoized(b);
    memoized(c); // aが追い出される
    memoized(a); // 再計算

    expect(fn).toHaveBeenCalledTimes(4);
    memoized(c); // cはまだキャッシュ内
    expect(fn).toHaveBeenCalledTimes(4);
  });
});

describe('memoizeWeak', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('同一オブジェクトの呼び出しでは計算せず同一結果を返す', () => {
    const fn = jest.fn((arr: number[]) => arr.slice().reverse());
    const memoized = memoizeWeak(fn);
    const arr = [1, 2, 3];

    const first = memoized(arr);
    const second = memoized(arr);

    expect(second).toBe(first);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('undefinedを返す関数もキャッシュできる', () => {
    const fn = jest.fn((_arr: number[]): undefined => undefined);
    const memoized = memoizeWeak(fn);
    const arr = [1];

    memoized(arr);
    memoized(arr);

    expect(fn).toHaveBeenCalledTimes(1);
  });
});
