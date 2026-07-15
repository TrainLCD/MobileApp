# Apollo Client → TanStack Query 移行メモ

このアプリの GraphQL 通信レイヤーは、かつて Apollo Client を使っていたが、
現在は **TanStack Query (React Query) + graphql-request** に置き換えられている
(移行 PR: #6210)。この文書は、移行時に何を「移行しなかった」のか、そして
なぜ体感で大きく高速化したのかを記録として残すものである。

## TL;DR

- キャッシュ戦略は 1:1 で移植したのではなく、React Query のモデルに合わせて
  **再設計した**。
- Apollo 時代の「キャッシュ逃れ」チューニング(`typePolicies` の
  `keyFields: false`)は**移植していない**。React Query はエンティティ正規化を
  行わないため、その回避策が解決していた問題は構造的に起きず、設定ごと不要に
  なった。
- 体感の高速化は「軽微」ではなく大きかった。理由は、TrainLCD のレスポンスが
  **深くネストした巨大なオブジェクトグラフ**であり、Apollo の正規化・差分検知が
  そのグラフを毎回何周も走査する同期 JS 処理を、React Native の**単一 JS
  スレッド**(ジェスチャー・遷移と同じスレッド)上で行っていたため。React Query
  ではこの走査コストが丸ごと消えた。

## 移行前後のキャッシュ構成

### Apollo 時代 (`src/lib/gql.ts`, 移行前)

```typescript
export const gqlClient = new ApolloClient({
  link: new HttpLink({ uri }),
  cache: new InMemoryCache({
    typePolicies: {
      LineNested: { keyFields: false },
      StationNested: { keyFields: false },
      TrainTypeNested: { keyFields: false },
      TrainType: { keyFields: false },
      Station: { keyFields: false },
    },
  }),
});
```

`keyFields: false` は「これらの型を**正規化(normalization)の対象から外す**」
指定である。Apollo は既定では `id`/`__typename` で全エンティティを正規化し、
クエリをまたいでマージ・重複排除する。しかし TrainLCD の駅・路線データは
「同じ ID でも文脈によって中身が異なる」ケースがあり、正規化されると別物が
誤ってマージされて壊れる。それを避けるために正規化を切っていた。

副作用として、正規化を切るとクエリ横断のキャッシュ再利用(重複排除)が効かなく
なるため、「同じエンティティを含む別クエリはそれぞれ通信が走る = API 通信が
増える」挙動になっていた。これが当時の「キャッシュ逃れでパフォーマンスを
犠牲にして通信を増やすチューニング」の実体である。

### React Query 移行後 (`src/lib/gql.ts`, 現行)

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Number.POSITIVE_INFINITY,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});
```

- クエリキーは `[オペレーション名, variables]`(`graphqlQueryKey`)。
- React Query は**エンティティ正規化を一切行わない**。クエリ結果まるごとを
  `(operationName, variables)` 単位でキャッシュするだけなので、当時
  `keyFields: false` で潰していた「同一 ID の別エンティティが誤マージされる」
  問題は発生し得ない。
- 既定方針は `staleTime: Infinity` の cache-first。Apollo の既定
  (cache-first) と通信挙動は等価になる。

### 強制再取得したい箇所

Apollo 時代に「キャッシュを使わず最新を取りたい」箇所は、移行後は**明示的に
キーを破棄してから取り直す**方式に置き換えた。

- `src/screens/RouteSearchScreen.tsx` — `queryClient.removeQueries({...})` で
  `GET_LINE_GROUP_STATIONS` のキーを破棄してから再フェッチ。
- `src/hooks/useInitialNearbyStation.ts` — `refetch` は常に新鮮な位置情報で
  取り直す。

### 互換フック

呼び出し側の書き換えを最小化するため、Apollo の API 互換フックを用意した。

- `useGraphQLQuery`(`src/hooks/useGraphQLQuery.ts`) — `useQuery` 互換の宣言的
  フェッチ。
- `useLazyGraphQLQuery`(`src/hooks/useLazyGraphQLQuery.ts`) — `useLazyQuery`
  互換の命令的フェッチ。エラー時も reject せず `{ data, error }` で解決する。
- `gqlClient.query`(`src/lib/gql.ts`) — `client.query` 互換のファサード。

## なぜ体感が飛躍的に速くなったのか

### 前提: レスポンスが「異常に大きい入れ子グラフ」

`src/lib/graphql/queries.ts` の `StationFields` を見ると、1 駅オブジェクトが
深くネストしている。

- `Station` → `line` / `lines[]`(各 `LineInStation`: company・lineSymbols・
  station・stationNumbers・nameTtsSegments …)
- さらに `Station.trainType` → `TrainTypeNested` → その中に `line` と `lines[]`
  があり、それぞれがフル `LineNestedFields`(さらにその中に `trainType` …)

`GetLineGroupStations` / `GetLineStations` / `GetStationsByName` は、これを
**配列で N 件**返す。路線によっては数十〜百駅。実体は巨大なオブジェクトグラフ
である。

### Apollo だと重かった処理

Apollo の `InMemoryCache` は、1 回のクエリ結果ごとに**グラフ全体を何度も走査
する同期 JS 処理**を行う。`keyFields: false` で消えるのは「正規化キーの付与」
だけで、走査コスト自体は残る。

1. **書き込み時の全走査 (writeQuery)** — ネスト全要素をキャッシュへ書くため、
   グラフを再帰的に 1 周。
2. **`__typename` の自動注入** — 全選択セットに `__typename` を足すため、通信
   ペイロードもネスト分だけ膨らみ、`JSON.parse` するバイト数も増える。
3. **dev 時の再帰的 `Object.freeze`** — 返す結果を深く凍結。巨大グラフを丸ごと
   freeze する分でもう 1 周。
4. **broadcastQueries(差分検知)** — 書き込みのたびに、アクティブな全
   `useQuery` を `cache.diff` で再評価して通知要否を判定。観測者の数 × グラフ
   サイズでさらに走査。
5. **読み出し時の再構築** — キャッシュから返すときも結果オブジェクトを組み立て
   直すため、もう 1 周。

合計すると「巨大グラフを数周ぶん走査 + freeze + 差分検知」が、1 レスポンスごとに
同期的に走る。React Native ではこれらがすべて**単一 JS スレッド**上で動き、その
スレッドはタッチ・ジェスチャー・画面遷移・JS 側アニメーションと同じである。駅
一覧を取るたびに JS スレッドが占有され、その間タップや遷移が引っかかる。これが
「操作のレスポンスが悪い」の正体だった。

### React Query に変えて消えたコスト

現行の経路は実質これだけである。

```text
fetch() → response.json()（1回の parse）→ 参照を queryKey で保存 → そのまま component へ
```

- **正規化なし**: キャッシュ書き込みは参照を 1 個置くだけ = O(1)。グラフ走査が
  消滅。
- **freeze なし / 差分 broadcast なし**: observer 数に依存した再走査が消滅。
- **`__typename` 注入なし**: ペイロードが小さくなり `JSON.parse` も軽い。
- **読み出しは参照を返すだけ**: 再構築の 1 周も消滅。

1 操作あたりの JS 処理が「グラフを数周」から「parse 1 回 + 参照保存」に落ちた。
このコスト差は**ペイロードが大きいほど開く**ため、いちばん重い駅一覧・検索結果
でいちばん効く = ユーザーが詰まりを感じていたまさにその場所が解消された。

### 「軽微」と見積もった原因(反省)

移行時は「データ取得ライブラリの差し替え、cache-first は cache-first のまま、
振る舞いは等価」というインフラ等価交換の枠で評価していた。見落としたのは次の
3 点の掛け算である。

- Apollo の正規化コストは**ペイロード形状に比例**して効く。
- TrainLCD のペイロードは例外的に大きい深いネストグラフである。
- それが**単一 JS スレッドの React Native でジェスチャーと同じ土俵**に乗って
  いる。

計算量(big-O)は変わらないので「軽微」と表現したが、実際は**定数項が桁違い**で、
しかもそれが体感の支配項だった。典型的な「定数項を軽視した見積もりミス」である。

### 補足(副次的な寄与・主因ではない)

- `@apollo/client` と関連依存の除去で JS バンドルが縮み、起動時 parse は軽く
  なる。ただしこれは**起動時**の話で、操作レスポンスの主因ではない。
- Apollo のリアクティブ層(observable / reactive vars)の常時オーバーヘッドも
  消えているが、本体は上記の走査コストである。

## まとめ

| 項目 | Apollo 時代 | React Query 移行後 |
| --- | --- | --- |
| キャッシュ単位 | エンティティ正規化キャッシュ | クエリ結果単位 `(op 名, variables)` |
| 「キャッシュ逃れ」設定 | `keyFields: false` で正規化を無効化 | 不要(正規化機構自体がない) |
| 既定方針 | cache-first | `staleTime: Infinity` の cache-first(等価) |
| 強制再取得 | fetchPolicy 等 | `queryClient.removeQueries` で明示破棄 |
| 1 操作あたりの JS コスト | グラフを数周走査 + freeze + 差分検知 | parse 1 回 + 参照保存 |

TrainLCD は元々(`keyFields: false` で)Apollo の正規化の恩恵をほぼ受けておらず、
**走査コストだけ全額払っている**状態だった。React Query への移行は、その払い損
だったコストを丸ごと外したことになる。これが体感高速化の本質である。
</content>
</invoke>
