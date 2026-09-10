---
name: replay-gpx
description: Replay a GPX track as mock locations on a connected Android device or emulator, so the app's real positioning pipeline (speed filter, EMA smoothing, accuracy filter) runs end to end. Use when the user asks to feed a GPX to a device, simulate riding a line, verify arrival/passing detection, or reproduce a positioning bug on Android.
---

# replay-gpx

`ios/*.gpx` を Android の**テストプロバイダ**経由で流し込み、実機・エミュレータの
測位パイプラインを実際に通す。オートモード (`useSimulationMode`) と違い
`locationAtom` へ直書きしないので、`src/store/atoms/location.ts` の速度フィルタ・
EMA スムージング・精度フィルタがすべて効いた状態を観測できる。

Argent の MCP ツールには位置情報を注入するものが無いため、投入は `adb` で行い、
画面の確認だけ Argent (`screenshot` / `describe`) を使う。

## 前提

- Android 実機またはエミュレータが `adb devices` に出ていること。iOS は対象外
  (Linux ホストでは iOS シミュレータを起動できない)。
- dev ビルド (`me.tinykitten.trainlcd.dev`) がインストール済みで、位置情報権限が
  許可済みであること。
- 端末の Android バージョンが 11 以降 (`cmd location providers` サブコマンドが必要)。

## 手順

### 1. 走らせる GPX を用意する

同梱のサンプルをそのまま使う場合はこの節を飛ばす。

| ファイル | 内容 |
| ---- | ---- |
| `gpx/SampleJY.gpx` | 山手線。実走行ログ |
| `gpx/SampleTohokuShinkansen.gpx` | 東北新幹線 盛岡→仙台。最高 320km/h |
| `gpx/KeioSpecialExpress.gpx` | 京王線 特急 新宿→京王八王子。種別グループから生成 |
| `gpx/KatamachiRapid.gpx` | 片町線 快速 京田辺→木津。駅間 2.3km・最高 95km/h |
| `gpx/SobuRapid.gpx` | 総武快速線 錦糸町→津田沼。最高 120km/h |

新しい経路は `npm run gpx:generate` で作る。詳細は `docs/location-simulation.md`。

```bash
npm run gpx:generate -- --line 1004 --list
npm run gpx:generate -- --line 1004 --from 100418 --to 100411 --max-speed 320 \
  --skip 100417,100416,100415,100413,100412 --out gpx/SampleTohokuShinkansen.gpx
```

列車種別の停車パターンをそのまま走らせたいときは `--line-group` を使う。通過駅は
`stopCondition` から自動判定されるので `--skip` を手で並べなくてよく、直通で複数
路線にまたがる経路もそのまま扱える。`lineGroupId` は駅から辿る。

```bash
npm run gpx:generate -- --list-train-types 2400101
npm run gpx:generate -- --line-group 71 --max-speed 110 --out gpx/KeioSpecialExpress.gpx
```

### 2. アプリを対象の路線に入れる

ディープリンクの `sids` 形式で経路を直接開く。**`auto=1` は付けない** —
オートモードは測位パイプラインを飛ばすため、この検証の目的を無効化する。

`sids` は駅 ID をカンマ区切りで並べた順序が進行方向、`skips` はその配列に対する
0 起点の通過駅インデックス。

```bash
adb -s <serial> shell "am start -a android.intent.action.VIEW -d \
  'trainlcd-canary://?sids=100418,100417,100416,100415,100414,100413,100412,100411&skips=1,2,3,5,6'"
```

上の例は盛岡→仙台で、一ノ関だけ停車・残り 5 駅は通過になる。

`--out` 付きで生成すると、この `sids` / `skips` が標準エラーにそのまま出力される。
`--line-group` では通過駅を自動判定するため、index を手で数え直さずこれを使う。

### 3. GPX を流す

```bash
npm run gpx:replay -- --gpx gpx/SampleTohokuShinkansen.gpx --serial <serial>
```

長時間になるのでバックグラウンドで走らせ、進捗はログで見る。

| オプション | 説明 |
| ---- | ---- |
| `--gpx <path>` | 再生する GPX (必須)。`<wpt>` と `<trkpt>` のどちらでも読む |
| `--serial <serial>` | adb シリアル。接続が 1 台だけなら省略可 |
| `--speed <n>` | 再生倍率。既定 1 |
| `--accuracy <m>` | 水平精度 (m)。既定 8。カンマ区切りで区間ごとに巡回 |
| `--start <sec>` | GPX 先頭からのスキップ秒数。`--loop` 時は初回の再生にだけ効く |
| `--provider <names>` | テストプロバイダ名。既定 `gps,network,fused` |
| `--loop` | 終端で先頭に戻る |
| `--keep` | 終了時にテストプロバイダを残す |

### 4. 画面を確認する

Argent で撮る。DEV OVERLAY の `LOCATION ACCURACY` が `--accuracy` の値になっていれば
モックが届いている。

```text
screenshot udid=<serial> scale=0.35
```

### 5. 後始末

`Ctrl+C` (または `SIGTERM`) でテストプロバイダと `mock_location` の appop を元に戻す。
1 回目のシグナルは停止を要求するだけで、進行中の投入が終わってから後始末が 1 回だけ走る。
**2 回目を送るか `kill -9` すると後始末を待たずに落ちる**ので、その場合は下を手動で実行する。

```bash
adb -s <serial> shell cmd location providers remove-test-provider gps
adb -s <serial> shell cmd location providers remove-test-provider network
adb -s <serial> shell cmd location providers remove-test-provider fused
adb -s <serial> shell appops set 2000 android:mock_location default
```

## 落とし穴

- **`--speed` は 1 のままにする。** `MAX_PLAUSIBLE_SPEED` は 100m/s (360km/h) なので、
  320km/h の GPX を 2 倍速以上で流すと速度フィルタが全点を棄却して現在地が凍る。
  倍速で流したいときは `--max-speed` を下げた GPX を作り直す。
- **`gps` だけでは足りない。** Play 開発者サービスの Fused は独自に融合するため、
  既定どおり `gps,network,fused` の 3 つへ同じ座標を流す。`fused` 単独だと
  実測位が優先されてモックが無視される。
- **テストプロバイダは走行中に OS 側から外れることがある。** Samsung の
  「擬似ロケーション」通知の OFF や location サービス再起動で消える。スクリプトは
  失敗を検知して自動で再登録し、ログに `再登録n回` として出す。
- **`--time` は渡さない。** ホストと端末の時計がずれていると Samsung の
  `PositionManager` が `ignore mock location for time validation` で捨て、
  `handleTrackingLocation` の重複破棄にも引っかかる。
- **`CURRENT SPEED` は常に 0km/h になる。** `cmd location providers` に速度を渡す
  引数が無く、`coords.speed` が埋まらないため。アプリ内の速度フィルタは座標差分から
  算出するので影響しないが、DEV OVERLAY の速度表示は当てにならない。
- **中断は 1 回で待つ。** 2 回目の `Ctrl+C` は後始末を飛ばすため、テストプロバイダと
  `mock_location` の appop が端末に残る。私物端末では特に、1 回で待って後始末を通す。
- **ユーザーの私物端末では MMKV を書き換えない。** テーマやウォークスルーの状態を
  変更する検証は避ける。

## 再現できないこと

| 条件 | この手順 |
| ---- | ---- |
| 精度を落とした測位 (α=0.6 / 0.3) | ✅ `--accuracy 100,300` などで指定できる |
| トンネルでの測位途絶 | ❌ 途絶を表現できない |
| 車体による GPS 減衰 | ❌ |
| `coords.speed` を使う表示の検証 | ❌ 常に 0 |
