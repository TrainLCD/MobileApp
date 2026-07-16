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

### 高頻度更新フィールドを含むオブジェクト atom は narrow な派生 atom で購読する

`pictureInPictureAtom` の `activityState` は位置更新のたび (走行中は毎秒)
新オブジェクトへ差し替わる。`enabled` / `active` だけが必要な購読者が
atom を丸ごと購読すると毎ティック再レンダーされるため、boolean の派生 atom
(`pictureInPictureEnabledAtom` / `pictureInPictureActiveAtom`) を購読する。
派生 atom は算出値が `Object.is` で同一な限り購読者へ通知しない。

```typescript
// ❌ activityState の毎秒更新に巻き込まれる
const { active } = useAtomValue(pictureInPictureAtom);

// ✅ active の実際の変化時のみ再レンダー
const active = useAtomValue(pictureInPictureActiveAtom);
```

### 高頻度 atom を購読する副作用フックは renderless ホストに隔離する

`locationAtom` (走行中は毎秒更新) などを購読する返り値なしの副作用フックを
画面コンポーネント本体で呼ぶと、位置更新のたびに画面全体の render 関数が
再実行される。こうしたフックは `null` を返すだけの renderless コンポーネント
に隔離し、画面はそれをマウントするだけにする。

- 実例: `src/screens/Main.tsx` の `MainScreenEffects` (`Fx*` コンポーネント群)、
  `src/components/Permitted.tsx` の `PermittedLayoutEffects`
- 1 フック = 1 コンポーネント (`FxRefreshStation` など) に分割してあるのは、
  プロファイル時に React DevTools 上でフック単位の再レンダー回数・コストを
  計測可能にするため。新しい常駐フックを足すときも同じ形式で追加する
- 設定・プラットフォームで不要になるフックは条件付きマウントで丸ごと止める。
  実例: `FxTTS` (ユーザー設定と Remote Config キルスイッチの両方が有効なときのみ。
  単体テストできるよう本体は `src/components/FxTTS.tsx` に定義)、
  `FxUpdateLiveActivities` (iOS のみ)、
  `Permitted.tsx` のウェアラブル連携 (OS 別)。フックを条件分岐で呼ぶことは
  できないが、ホストコンポーネントのマウント自体を条件にすれば安全に止められる

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
