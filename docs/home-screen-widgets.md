# ホーム画面ウィジェット

TrainLCD は iOS / Android の双方でホーム画面ウィジェットを提供している。
本ドキュメントは各ウィジェットのデータ経路と、追加・変更時に揃えるべき箇所をまとめる。

## ウィジェット一覧

| ウィジェット | 表示内容 | iOS | Android |
| --- | --- | --- | --- |
| 乗車中 | 乗車中の路線・方面 | `HomeScreenWidget` | `RideWidgetProvider` |
| プリセット | 登録済みプリセット一覧 | `PresetsWidget` | `PresetsWidgetProvider` |

iOS の kind 文字列は型名と同じ(`HomeScreenWidget` / `PresetsWidget`)。

いずれも iOS 側はロック画面ウィジェット・ロック画面コントロールと同じ
`RideSessionActivity` Extension の `WidgetBundle` から配信している。

## デザイン

ホーム画面ウィジェットは背景を自前で持てるため、watchOS 向けライブアクティビティ
(`SmartStackLiveActivityContentView`)と同じ「路線色のベタ塗り + グラデーション」を面全体に敷く。
ロック画面・watchOS のアクセサリ系はシステムが着色するため路線色を面で出せないが、
ホーム画面では文字を読む前に色で路線を判別できる。

| 要素 | iOS | Android |
| --- | --- | --- |
| 背景 | `LineColorBackground` | `widget_background` + `widget_background_shade` |
| ナンバリングバッジ | `LineNumberingBadge` | `widget_numbering_badge` |
| 見出しのカプセル | `LineColorChip` | `widget_chip_background` |
| 前景色の判定 | `lineForegroundColor` | `WidgetTheme.onLineColor` |

- グラデーションはライブアクティビティと同じ「始点側を沈める乗算 + 対角側のハイライト」。
  面積が広いぶん上下方向では単調になるため、斜め(iOS は `topLeading` → `bottomTrailing`、
  Android は `angle="315"`)に流している。
- 路線色は紺色から黄色まで幅があり、文字色を白で固定すると読めない路線が出る。
  知覚輝度(`(0.299R + 0.587G + 0.114B) / 255`。`R` / `G` / `B` は 0〜255 のチャンネル値で、
  実装は 255 で割って 0.0〜1.0 に正規化してから比較する)が閾値 `0.7` を超えたら黒、
  それ以外は白へ倒す。
  **式と閾値は iOS / Android で必ず揃えること。** 片方だけ変えると同じ路線で文字色が食い違う。
- ただしこの閾値は、ライブアクティビティ譲りの白文字を基本に保ったまま極端に明るい路線色
  (総武線 `#FFD400` など)だけを救うためのヒューリスティックであり、
  **全路線色で WCAG のコントラスト比を満たすことは保証しない**
  (例: `#80C241` は白を選ぶが、白とのコントラスト比は 2.16 で AA の 4.5 に届かない)。
  基準を満たす必要が出たら、相対輝度から白黒のコントラスト比が高い方を選ぶ実装へ差し替える。
  その場合は中間色の路線が黒文字へ倒れるため、見た目は現行から大きく変わる点に注意。
- ナンバリングバッジは面が路線色である以上、路線色で縁取った円では埋もれる。
  前景色で塗り潰して記号側を路線色へ反転させ、駅ナンバリングの標識と同じ見え方にしつつ
  視認性を上げる。
- 路線色は面が担うようになったため、旧デザインの左端の路線色バーは iOS / Android とも置かない。
- Android は文字・アイコンの色が路線色で変わるため、レイアウト XML の `textColor` / `tint` は
  ウィジェットギャラリーのプレビュー用の既定値でしかない。実際の色は `RideWidgetProvider` が
  `setTextColor` / `setColorFilter` で実行時に上書きする。既定値はブランドカラー
  (`@color/widget_brand`、未乗車時の色)に揃えてある。
- 背景が常に路線色になったので、端末のダークテーマで色を変える必要はない
  (`values-night` の widget 用カラーは廃止済み)。

プリセットウィジェットはプリセットごとに路線が違うため、一覧では面の色をブランドカラーに固定し、
路線色は行のバッジで見せる。1 件しか表示しない iOS の `systemSmall` だけは、その 1 件の路線色を
そのまま面に使う。

### 乗車中ウィジェットの構成

Android の 4 レイアウトのうち、正方形(`widget_ride_small`)が iOS の `systemSmall` に、
横長(`widget_ride_rectangular`)が `systemMedium` に対応する。
残る `widget_ride_inline` / `widget_ride_circular` は iOS のアクセサリ系に相当する Android 固有の
サイズで、iOS のホーム画面ウィジェットには対応物が無い。

対応するレイアウト同士は寸法・文字サイズを揃える。**片方だけ変えると同じ端末サイズで
見え方が食い違う。**

| 要素 | iOS(`systemSmall` / `systemMedium`) | Android(正方形 / 横長) |
| --- | --- | --- |
| ナンバリングバッジの直径 | 48 / 60 pt | 48 / 60 dp |
| 路線記号 | 直径 × 0.4(19.2 / 24 pt) | 19 / 24 sp |
| 路線名 | `.headline` / `.title3`(17 / 20 pt) | 17 / 20 sp |
| 方面 | `.caption` / `.subheadline`(12 / 15 pt) | 12 / 15 sp |
| ブランド行 | アイコンのみ / `.caption2`(11 pt) | アイコンのみ / 11 sp |

- 正方形はバッジ行と文字ブロックの間に伸縮する余白を挟み、路線名と方面を下端へ寄せる。
  詰めて上端に寄せると 2 セルより大きく置かれたときに下半分が空く。
  iOS は `Spacer(minLength: 8)`、Android は `layout_weight` を持たせた空の `FrameLayout` で作る
  (`Space` はウィジェットで使えるビューに含まれない)。高さが足りないときはこの余白から縮むため、
  バッジと文字は最後まで欠けない。
- 方面には乗車中のみ矢印(iOS は SF Symbol の `arrow.forward`、Android は
  `ic_widget_arrow_forward`)を添えて行き先であることを示す。未乗車時は「方面が未設定です」という
  案内文なので矢印は出さない。Android は `RideWidgetProvider.applyBoundForArrow` が
  `WidgetState.loaded` で表示を切り替える。
- iOS の `minimumScaleFactor` に相当する縮小は Android の `RemoteViews` では持てないため、
  はみ出す文字は `ellipsize` で省略する。

## データ経路

アプリのプロセスが落ちていてもウィジェットは描画されるため、
表示に必要な文字列はすべて解決済みの状態でネイティブへ渡し、端末ストレージへ永続化する。

```text
JS (解決済みの表示用文字列)
  ├─ iOS     → PresetsWidgetModule → App Group の UserDefaults → WidgetCenter.reloadTimelines
  └─ Android → WidgetModule        → SharedPreferences        → notifyAppWidgetViewDataChanged
```

- iOS の App Group ID は `Info.plist` の `APP_GROUP_ID`(既定値 `group.me.tinykitten.trainlcd`)。
- Android の SharedPreferences 名は `me.tinykitten.trainlcd.widget`。
- 表示内容に差分が無い更新は書き込まない。iOS は WidgetKit のリロードバジェット、
  Android は再描画ブロードキャストを無駄に消費しないため。

## プリセットウィジェット

### 同期

`usePresetCarouselData` が取得済みのプリセット(駅情報込み)を `usePresetsWidgetSync` が
表示用の文字列へ変換してネイティブへ渡す。始発駅・終着駅の解決はアプリ内のプリセットカードと
共通の `getPresetRouteEndpoints` を使う。

同期される項目は `PresetsWidgetItem`(`src/utils/native/presetsWidget.ts`)で、
`lineColor` と `lineSymbol` は解決できない場合に空文字を渡し、
ネイティブ側でブランドカラー・路線名の先頭 1 文字へフォールバックさせる。

### ディープリンク

行をタップすると以下の URL でアプリが起動する。

```text
trainlcd://?preset=<SavedRoute.id>          # 本番
trainlcd-canary://?preset=<SavedRoute.id>   # Canary
```

`useDeepLink` は `preset` を他の経路パラメータ(`id` / `sids` / `sgid`)より優先して処理し、
クイックアクションと同じ `pendingQuickActionRouteId` を立てて路線選択画面へ戻す。
`SelectLineScreen` がそれを検知して当該プリセットの行き先選択を開く。

経路そのものは URL に含まれず端末内の DB から解決するため、
`preset` の値は UUID 書式に一致するもののみ受け付ける。

### サイズと表示件数

サイズは乗車中ウィジェットと揃えている(iOS は `systemSmall`、Android は 2x2)。

Android は `ListView` + `RemoteViewsService`(`PresetsWidgetService`)のコレクション
ウィジェットで、入るぶんだけ表示され残りは縦スクロールで辿れる。縦スクロールできる以上
リサイズしても見られる情報は増えないため、`resizeMode` は `none` で 2x2 に固定している。

行数をウィジェットの高さから dp で見積もる方式は採らない。端末・ランチャー・画面の向きで
実寸が変わるため必ずずれる(`OPTION_APPWIDGET_MIN_HEIGHT` は横向き時＝取り得る最小の
高さで、これを基準にすると縦向きで収まるはずの行まで落ちる)。アダプタに任せることで
高さ計算自体を持たない。

iOS は WidgetKit にスクロールが無いため、表示できる件数はウィジェットの高さで決まる。
ファミリーごとに件数を決め打ちすると端末サイズ差で余白が出たり見切れたりするため、
`GeometryReader` で実際の描画高を測り、`rowHeight` / `rowSpacing` から収まる行数を求める。

行数計算が予約する高さと実際の描画がずれると最終行が見切れるため、行とヘッダーは
`.frame(height:)` で `rowHeight` / `headerHeight` に固定し、Dynamic Type や長い
ローカライズ文字列で伸びないようにしている。見た目を変えたらこれらの定数も合わせること
(ヘッダーを `LineColorChip` に載せた際も、カプセルの上下パディングぶん `headerHeight` を広げている)。

Android の行は `AbsListView.LayoutParams` がマージンを持たないため、行間は行レイアウト外側の
`FrameLayout` のパディングで作り、カードの下敷き(`widget_preset_row_background`)は
その内側に敷いて余白まで塗らないようにしている。

| ファミリー | 表示 | タップ |
| --- | --- | --- |
| `systemSmall` | 1 件を縦に積んで表示 | `widgetURL` でウィジェット全体 |
| `systemMedium` | 収まるだけの行 | 行ごとの `Link` |
| `systemLarge` | 収まるだけの行 | 行ごとの `Link` |

`systemSmall` はウィジェット全体が単一のタップ領域で、行ごとの `Link` が個別のタップ先に
ならない。行を並べても 1 件しか開けず件数を増やす意味が無いため、1 件だけを出す
(`PresetsWidgetFeatured`)。その 1 件は「始発駅 → 終着駅」を横一列に置くと正方形の
横幅で先に頭打ちになり駅名がすぐ省略されるので、サークル → プリセット名 → 始発駅 →
下向き矢印 → 終着駅 の順に縦へ積み、1 駅あたりの幅をフルに使う。

## 変更時に揃えるべき箇所

- ウィジェットの kind 文字列: iOS の `Widget.kind` と、リロードを呼ぶネイティブモジュール側の定数。
- ストレージのキー名: iOS の `PresetsEntry.storageKey` と `PresetsWidgetModule.presetsStorageKey`、
  Android の `PresetsWidgetStore` のフィールド名、JS の `PresetsWidgetItem`。
- 同期する最大件数: JS の `MAX_PRESETS_WIDGET_ITEMS`(両 OS 共通)。
  描画側は iOS が実測、Android が `ListView` に任せており、どちらも件数の決め打ちを持たない。
- 未設定時のフォールバック表示: iOS / Android の双方で同じ文言・同じ色になるようにする
  (色は iOS の `LockScreenEntry.fallbackLineColor` / Android の
  `WidgetStateStore.PLACEHOLDER_LINE_COLOR` と `@color/widget_brand`)。
- 前景色の判定式と閾値: iOS の `lineForegroundColor` と Android の `WidgetTheme.onLineColor`。
- 乗車中ウィジェットの寸法・文字サイズ: iOS の `HomeScreenWidget.swift` と Android の
  `widget_ride_small.xml` / `widget_ride_rectangular.xml`(対応表は「乗車中ウィジェットの構成」)。
