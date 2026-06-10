# 状態管理ガイドライン (Jotai)

このアプリの状態管理は Jotai に統一されている。
atom の定義は `src/store/atoms/` 配下にある。

## フィールド単位 atom と互換ファサード

かつて `stationState` / `navigationState` / `lineState` は複数フィールドを
1 つのオブジェクトで持つモノリシックな atom だった。この構造では、どれか
1 フィールドが変わるだけで atom 全体を購読しているコンポーネントすべてが
再レンダーされる(特に `navigationState.headerState` は数秒間隔で
ローテーションするため影響が大きい)。

現在は次の 2 層構造になっている。

- **フィールド単位のプリミティブ atom (named export)** — 状態の実体。
  例: `arrivedAtom`, `stationsAtom`, `headerStateAtom`, `selectedLineAtom`
- **互換ファサード atom (default export)** — `stationState` /
  `navigationState` / `lineState` という従来名の読み書き可能な派生 atom。
  書き込み時は変更があったフィールドの atom にだけ値を分配する

```typescript
// src/store/atoms/station.ts (抜粋)
export const arrivedAtom = atom(true);
export const stationsAtom = atom<Station[]>([]);

// 互換ファサード (default export)
const stationState = atom(readStationState, (get, set, update) => {
  // 変更があったフィールドの atom にだけ set する
});
export default stationState;
```

## ルール

### 読み取りは必ずフィールド atom を購読する

ファサードを読み取りで購読すると全フィールドの変更で再レンダーされるため、
新規コードでは使わない。

```typescript
// ❌ ファサード全体の購読 (どのフィールドが変わっても再レンダー)
const { arrived, stations } = useAtomValue(stationState);

// ✅ フィールド atom の購読 (該当フィールドの変更時のみ再レンダー)
const arrived = useAtomValue(arrivedAtom);
const stations = useAtomValue(stationsAtom);
```

派生 atom (`themeAtom`, `isEnAtom` など) の `get` も同様に、フィールド atom
を参照する。

### 書き込みはファサード経由でもフィールド atom 直接でもよい

複数フィールドをまとめて更新する既存の書き込みパターンはファサードで動く。
ファサードへの書き込みは 1 回の `set` として処理されるため、複数フィールド
の更新でも購読者への通知は一括で行われる。

```typescript
// ファサード経由 (従来どおり)
setStationState((prev) => ({ ...prev, arrived: true, approaching: false }));

// 単一フィールドならフィールド atom への直接書き込みでもよい
setArrived(true);
```

React 外部 (TaskManager のコールバック等) からの
`store.get(stationState)` / `store.set(stationState, ...)` も
ファサードでそのまま動く。

### フィールドを追加するとき

1. `src/store/atoms/*.ts` にプリミティブ atom を named export で追加する
2. 同ファイルの state インターフェース・`readXxxState`・ファサードの
   write 関数 (フィールド単位の `Object.is` 比較と `set`) に同じフィールド
   を追加する

## テストでのモック

`useAtomValue` をモックする場合、フックやコンポーネントはフィールド atom
単位で読むため、「どの atom が渡されたか」で返す値を出し分ける。

```typescript
import { arrivedAtom, stationsAtom } from '~/store/atoms/station';

useAtomValue.mockImplementation((a: unknown) => {
  if (a === arrivedAtom) return true;
  if (a === stationsAtom) return mockStations;
  return undefined;
});
```

`jest.mock('jotai', ...)` で `atom` 自体をモックすると、初期値が同じ
フィールド atom 同士が識別不能になる。`...jest.requireActual('jotai')` で
`atom` は本物を使い、`useAtomValue` だけをモックすること。

`createStore()` を使う実 store でのテストは、ファサード
(`store.set(stationState, ...)`) とフィールド atom のどちらで状態を
準備しても同じ結果になる。
