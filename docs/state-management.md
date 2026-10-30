# 状態管理ガイドライン (Jotai)

画面や走行中の状態管理には Jotai を使用します。
駅検索モーダルの近くの駅一覧には TanStack DB を使用します。
atom の定義は `src/store/atoms/` 配下にある。

## プリセットの保存と表示

プリセットの一覧は `presetRoutesAtom` で管理し、MMKV に保存します。
`useSavedRoutes` は保存に成功してから atom を更新します。
ホーム画面、クイックアクション、ウィジェットはこの一覧を参照します。
通常の読み書きでは SQLite を開きません。

旧版の `savedRoutes.db` は MMKV にデータがない場合に一度だけ読み込みます。
ID、作成日、通知駅、乗換区間を引き継ぎ、移行元のテーブルは変更しません。
空の一覧も移行済みとして保存するため、全件削除後に旧データが復活することはありません。
移行や保存に失敗した場合は完了扱いにせず、既存のデータを上書きしません。

カード表示用の駅データは保存済み経路とは分けて取得します。
路線と系統の問い合わせは並行し、取得済みの ID は再利用します。
取得中の一覧変更や古い応答への対策は維持しています。

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
  `FxLocationHeartbeat` (測位の配信を変位ゲートだけが決める iOS のみ)、
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

## TanStack DB の導入範囲

`useNearbyStations` は駅検索モーダルの近くの駅一覧を Query Collection に取り込み、
`useLiveQuery` で購読します。初回導入はこの読み取り経路に限定しています。

- 通信とエラー状態は TanStack Query が管理します。既存の GraphQL キーと応答形式を共有します。
- DB 側では自動取得を無効にし、モーダルが表示されていて座標があるときだけ Query から取得します。
- 応答内の順位をキーにして距離順を保持します。同じ駅 ID の行も取り込みます。表示側の重複排除は従来どおりです。
- DB の購読終了後はコレクションを解放します。Query のキャッシュ寿命は変更しません。
- コレクション ID を明示し、Web Crypto のない環境でも読み取り時に UUID の生成を要求しません。

Jotai の走行状態、SQLite のプリセット保存、駅名検索、ほかの GraphQL クエリは従来の構成を使います。
端末内の永続化やオフライン同期は、この導入には含みません。
