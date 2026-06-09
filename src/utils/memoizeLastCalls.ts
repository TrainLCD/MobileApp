// フックインスタンス間で派生計算の結果を共有するためのモジュールレベルメモ化。
//
// useCurrentStation / useNextStation などの派生フックは多数のコンポーネントから
// 呼ばれ、各インスタンスのuseMemoが同一入力に対して同じO(n)走査を重複実行していた。
// 計算を純関数へ抽出し、ここで提供するキャッシュで包むことで、同一レンダーパス内の
// 全インスタンスが1回分の計算結果(と同一の配列参照)を共有できる。
//
// derived atom化ではなくモジュールメモ化を採用した理由:
// 次駅計算はisLoopLine(useCurrentTrainTypeのuseState履歴に依存)を入力に取るため
// 純粋なatomグラフへ還元できず、フックのAPI・挙動を変えずに重複を排除できる本方式が
// 安全なため。入力は全てatom由来のイミュータブルな値である前提。

type AnyArgs = readonly unknown[];

const argsEqual = (a: AnyArgs, b: AnyArgs): boolean =>
  a.length === b.length && a.every((v, i) => Object.is(v, b[i]));

/**
 * 直近の呼び出し結果を引数タプル単位で最大maxEntries件キャッシュする。
 * 同一レンダーパス内で複数インスタンスが異なる引数で交互に呼ぶケース
 * (例: useNextStationのorigin違い)でもキャッシュが入れ替わり続けないよう、
 * 1スロットではなく小さな複数スロットを持つ。
 */
export const memoizeLastCalls = <Args extends AnyArgs, R>(
  fn: (...args: Args) => R,
  maxEntries = 8
): ((...args: Args) => R) => {
  const entries: { args: Args; result: R }[] = [];
  return (...args: Args): R => {
    for (const entry of entries) {
      if (argsEqual(entry.args, args)) {
        return entry.result;
      }
    }
    const result = fn(...args);
    entries.push({ args, result });
    // push直後にだけ一時的にmaxEntries+1件になるため、ここで最も古いエントリを
    // 捨てて保持数を常に最大maxEntries件に保つ(>=にすると上限がmaxEntries-1件になる)
    if (entries.length > maxEntries) {
      entries.shift();
    }
    return result;
  };
};

/**
 * オブジェクト(主に配列)1引数の純関数をWeakMapでメモ化する。
 * 入力オブジェクトがGCされればキャッシュも自然に解放される。
 */
export const memoizeWeak = <T extends object, R>(
  fn: (input: T) => R
): ((input: T) => R) => {
  const cache = new WeakMap<T, R>();
  return (input: T): R => {
    const cached = cache.get(input);
    if (cached !== undefined || cache.has(input)) {
      return cached as R;
    }
    const result = fn(input);
    cache.set(input, result);
    return result;
  };
};
