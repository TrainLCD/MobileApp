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

## データ経路

アプリのプロセスが落ちていてもウィジェットは描画されるため、
表示に必要な文字列はすべて解決済みの状態でネイティブへ渡し、端末ストレージへ永続化する。

```text
JS (解決済みの表示用文字列)
  ├─ iOS     → PresetsWidgetModule → App Group の UserDefaults → WidgetCenter.reloadTimelines
  └─ Android → WidgetModule        → SharedPreferences        → AppWidgetManager.updateAppWidget
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

### サイズ

既定サイズは乗車中ウィジェットと揃えている(iOS は `systemSmall`、Android は 2x2)。
一覧をまとめて見たい場合に備えて大きいサイズも選べるようにしてあり、
iOS は `systemSmall` / `systemMedium` / `systemLarge`、Android はリサイズで拡大できる。
`systemSmall` と `systemMedium` は高さが同じなので表示行数も同じ 2 行になる。

### 表示行数の決め方 (Android)

`PresetsWidgetProvider` はウィジェットの高さから表示行数を導出する。基準に使う値に注意:

- `OPTION_APPWIDGET_MIN_HEIGHT` は**横向き時の高さ**、つまり取り得る中で最小の値。
  これを基準にすると縦向きで収まるはずの行まで落としてしまうため使わない。
- Android 12 以降は `OPTION_APPWIDGET_SIZES` で向きごとの実寸が取れるので、
  サイズごとの `RemoteViews` を `RemoteViews(Map<SizeF, RemoteViews>)` でまとめて渡し、
  システムに出し分けさせる。
- それ以前は `OPTION_APPWIDGET_MAX_HEIGHT`(縦向き時の高さ)を使う。

`PADDING_HEIGHT_DP` / `HEADER_HEIGHT_DP` / `ROW_HEIGHT_DP` はレイアウトの実寸から見積もった
定数のため、`widget_presets.xml` / `widget_presets_row.xml` の余白・文字サイズ・
サークル径を変えたら合わせて更新する。

## 変更時に揃えるべき箇所

- ウィジェットの kind 文字列: iOS の `Widget.kind` と、リロードを呼ぶネイティブモジュール側の定数。
- ストレージのキー名: iOS の `PresetsEntry.storageKey` と `PresetsWidgetModule.presetsStorageKey`、
  Android の `PresetsWidgetStore` のフィールド名、JS の `PresetsWidgetItem`。
- 表示件数の上限: JS の `MAX_PRESETS_WIDGET_ITEMS` と Android の `MAX_ROW_COUNT`。
- 未設定時のフォールバック表示: iOS / Android の双方で同じ文言・同じ色になるようにする。
