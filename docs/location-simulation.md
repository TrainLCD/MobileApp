# 位置情報シミュレーション (GPX)

測位まわりの変更を検証するための GPX を生成し、iOS シミュレータや Android 実機へ
流し込む手順。GPX は `assets/gpx/` に置く。Xcode・adb・Jest の 3 経路から参照するため、
プラットフォーム別ディレクトリ (`ios/`) ではなく静的資材へ集約している。アプリのコードから
`require()` しないので、Metro のバンドルには含まれない (`gpx` は `assetExts` に無い)。

## なぜオートモードでは検証できないか

アプリのオートモード (`src/hooks/useSimulationMode.ts`) は擬似的な現在地を作るが、
書き込み先は `store.set(locationAtom, ...)` で、**`setLocation` を経由しない**。

そのため `src/store/atoms/location.ts` の次の処理を一切通らない。

- ワープ対策の速度フィルタ (`MAX_PLAUSIBLE_SPEED`)
- EMA スムージング (`getSmoothingAlpha`。精度と**配信間隔**から α を決める)
- 基準座標の張り直し (`STALE_REFERENCE_MS` / `MAX_CONSECUTIVE_SPEED_REJECTIONS`)
- 精度フィルタ (`handleTrackingLocation` の `MAX_PERMIT_ACCURACY`)

これらを含めた測位パイプライン全体を検証するには、OS 側から測位を流し込む必要がある。

```text
Core Location → watchPositionAsync → handleTrackingLocation → setLocation → locationAtom
                                                              ↑ GPX ならここを通る

useSimulationMode ─────────────────────────────────────────────────────────→ locationAtom
                                                              ↑ オートモードはここを飛ばす
```

## GPX を生成する

`scripts/generate-location-gpx.mjs` が StationAPI の実際の駅座標から GPX を生成する。
速度プロファイルはアプリ本体の `generateTrainSpeedProfile` をそのまま使うため、
加減速の挙動はオートモードと同じモデルになる。

まず路線の駅 ID を調べる。

```bash
npm run gpx:generate -- --line 1004 --list
```

生成する。

```bash
npm run gpx:generate -- \
  --line 1004 --from 100418 --to 100411 --max-speed 320 \
  --skip 100417,100416,100415,100413,100412 \
  --out assets/gpx/SampleTohokuShinkansen.gpx
```

主なオプションは次のとおり。`--help` で全件を表示できる。

| オプション | 説明 |
| ---- | ---- |
| `--line` | 路線 ID。東北新幹線は `1004` |
| `--line-group` | 列車種別グループ ID。`--line` と排他 |
| `--from` / `--to` | 始点・終点の駅 ID。API の並び順に関わらず指定した向きで走る |
| `--max-speed` | 最高速度 (km/h)。既定は `320` |
| `--skip` | 通過駅の駅 ID (カンマ区切り)。停車しないだけで経路上は通過する |
| `--dwell` | 停車駅での停車時間 (秒)。既定は `60` |
| `--api` | StationAPI の URL。既定は `$GQL_API_URL` か本番エンドポイント |

出力は 1 秒間隔の `<wpt>` 列になる。iOS は `distanceInterval` 基準で概ね 1Hz 配信のため、
実機の更新間隔に近い。

## 列車種別グループから生成する

`--line` は路線の全駅を並べるだけなので、種別ごとの通過駅を `--skip` に手で書き出す
必要があり、直通で複数路線にまたがる経路は表現できない。`--line-group`
(`lineGroupId`) を使うと `lineGroupStations` が返す経路をそのまま走らせられる。

- 通過駅は各駅の `stopCondition` から自動判定する。規則はアプリ本体
  (`src/utils/isPass.ts`) と同じで、`Not` は通過、`Partial` / `PartialStop` は停車扱い。
- `Weekday` / `Holiday` は `--start` の日付 (JST) で判定する。既定の
  `2026-01-01T00:00:00Z` は元日なので休日扱いになる。
- 直通先の路線も 1 本の経路として繋がる。
- `--from` / `--to` を省略すると経路の全区間を走る。
- `--skip` は自動判定に**追加**される。臨時の通過を足すときに使う。

`lineGroupId` は駅から辿る。`--list-train-types` にその駅の駅 ID を渡すと、
`groupId` と種別名の対応が出る。

```bash
# 京王線新宿 (2400101) を通る種別と lineGroupId を出す
npm run gpx:generate -- --list-train-types 2400101
# → 71  特急  Special Express  京王線

# 経路と stopCondition を確認する
npm run gpx:generate -- --line-group 71 --list

# 新宿→京王八王子を特急の停車パターンで生成する
npm run gpx:generate -- --line-group 71 --max-speed 110 --out assets/gpx/KeioSpecialExpress.gpx
```

生成時、標準エラーに同じ経路をアプリで開くためのディープリンクのクエリ部を出す。
`skips` は `sids` に対する 0 起点の通過駅 index なので、自動判定した通過駅を
手で数え直さずにそのまま再生手順へ渡せる。

```text
アプリを同じ経路で開くディープリンク: ?sids=2400101,2400104,...&skips=2,4,5,...
```

## 電波環境を GPX に書く

既定の GPX は「常に測位が届き、精度は再生側が決める」トラックになる。地下鉄のように
電波が入りづらい条件は `--signal-profile` で GPX 自身に埋め込む。

電波環境は 3 つの成分に分かれ、それぞれ GPX 上の表現が違う。

| 成分 | GPX 上の表現 |
| ---- | ---- |
| 測位が届かない (トンネル内) | 点を書かない。`<time>` に穴が開く |
| 精度の劣化 (基地局測位のみ) | 各点の `trainlcd:accuracy` |
| 位置そのもののずれ | 座標 (現状のプロファイルでは動かしていない) |

### trainlcd:accuracy 拡張

GPX 1.1 にはメートル単位の水平精度を書く標準要素が無い (`<hdop>` は無次元の DOP 値で
あって精度ではない)。そのため独自要素を `<extensions>` に置く。

```xml
<gpx version="1.1" creator="TrainLCD scripts/generate-location-gpx.mjs"
     xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:trainlcd="https://trainlcd.app/xmlns/gpx/v1">
<wpt lat="35.6908530" lon="139.7048280">
<time>2026-01-01T00:05:12.000Z</time>
<extensions><trainlcd:accuracy>412</trainlcd:accuracy></extensions>
</wpt>
</gpx>
```

- 値は**水平精度のメートル**で、正の数に限る。`coords.accuracy` にそのまま入る。
  0 以下は精度として扱わない (再生側はエラー、Jest 側は記録なしとして無視する)。
- `<extensions>` は GPX 1.1 が用意している拡張口で、中身は
  `<xsd:any namespace="##other" processContents="lax">` と定義されている。
  「GPX 以外の名前空間なら何でも置いてよく、スキーマを知らないバリデータは素通しする」
  という意味なので、**この書き方をしたファイルは妥当な GPX 1.1 のままである**。
  Garmin の `gpxtpx`(心拍・ケイデンス) なども同じ仕組みで相乗りしている。
- `##other` なので**名前空間の宣言が必須**。接頭辞を付けずに `<accuracy>` と書いたり、
  `<extensions>` の外へ置いたりすると不正な GPX になる。
- 名前空間 URI は識別子であって取得先ではないため、実在しなくてよい。
- 精度を 1 点も書かないときはこの宣言も出さない。従来の生成物に無意味な差分を
  出さないためで、既存の GPX は同じコマンドで再生成するとバイト単位で一致する。

### --signal-profile

| 値 | 内容 |
| ---- | ---- |
| `open` | 既定。従来どおり。精度も穴も書かない |
| `subway` | 経路のうち地下鉄 (`lineType` が `Subway`) の区間だけを劣化させる |

`subway` の数値はアプリ側の判定境界から逆算している。

| 区間 | 精度 (m) | 狙い |
| ---- | ---- | ---- |
| 地上 | 8〜20 | 通常の GPS。`isAccuracyStable` が true になりスムージングが働く |
| 地下駅のホーム | 25〜60 | Wi-Fi / 基地局。`BAD_ACCURACY_THRESHOLD` (200m) 以内 |
| 坑口付近 (駅から 20 秒以内) | 260〜620 | 基地局のみ。200m を必ず超える |
| トンネル内 | (点を落とす) | 測位が届かない時間になる |

坑口帯が 200m を超えることが要点。`isAccuracyStable` は「直近 12 点の平均が
`BAD_ACCURACY_THRESHOLD` (200m) 未満」かつ「`stddev/mean` が 0.5 未満」で true を返すので、
平均が 200m を上回った時点で false になり、`setLocation` の地下鉄分岐 (`skipSmoothing`)
に入る。`MAX_PERMIT_ACCURACY` (1500m) は超えないので、精度フィルタでの棄却は起きない。

逆に言うと、**200m 未満の精度で一定のトラック**を地下鉄の路線で流しても `stddev/mean` が
0 で「安定」と判定されるため、地下鉄のコードパスには (履歴が 4 点そろった後は) 入らない。
再生側で `--accuracy 300` のように 200m 以上を一律に与えた場合は逆に全点が分岐へ入るので、
「精度を固定すれば地上と同じ経路を通る」わけではない。

### 直通運転

劣化させるのは地下を走る区間だけなので、`--line-group` で直通の経路を生成すると
地上 → 地下 → 地上が 1 本のトラックに入る。地下から地上へ戻ったところで精度が回復し、
長い欠測のあとなので基準が古い (`STALE_REFERENCE_MS`) と判断されて基準の張り直しが走る。
この経路は合成データでは作りにくい。

> **`--subway-lines` は GPX の書き出しを変えるだけで、アプリの地下鉄分岐には効かない。**
> `setLocation` の `skipSmoothing` は `stationState.station?.line?.lineType` で判定する。
> これは StationAPI が返す値なので、`--subway-lines` で地下へ寄せた路線 (みなとみらい線・
> 西武有楽町線) の区間は、坑口帯 260〜620m の精度が付いていても実機では地上と同じ経路
> (速度フィルタと低精度 α の EMA) を通る。**実機再生で地下鉄分岐に入るのは API 上
> `Subway` の区間だけ** で、`FLinerSeibu.gpx` では副都心線の区間にあたる。
> Jest 側 (`location.subwayGpx.test.ts`) は `lineType` を固定して流すため全区間で分岐を踏む。

地下と地上の別は原則 StationAPI の `lineType` に従うが、これは路線単位の属性なので
実態と食い違うことがある。全線地下でも `Normal` で登録されている路線があるため、
`--subway-lines` に路線 ID を渡して地下側へ寄せる。

| 路線 | ID | API の `lineType` | 実際 |
| ---- | ---- | ---- | ---- |
| みなとみらい線 | `99310` | `Normal` | 全線地下 |
| 西武有楽町線 | `22003` | `Normal` | 小竹向原〜練馬が地下 |

逆に**一部だけ地下化されている路線 (東急東横線の渋谷〜代官山) は路線単位では
表せない**ので、駅数の多い側に倒して地上のまま扱う。`--subway-lines` に経路上に無い
路線 ID を渡した場合はエラーにする (地下扱いにしたつもりの区間が黙って地上のまま
出るのを防ぐため)。同じ理由で `--signal-profile subway` を伴わない `--subway-lines` も
エラーにする。経路に地下の駅が 1 つも無いまま `--signal-profile subway` を指定した
場合は、欠測が発生しないことを標準エラーで知らせる。

生成時、どの路線を地下として扱ったかを標準エラーに出す。生成物からは読み取れない
情報なので、意図どおりに分かれたかはここで確認する。

```text
区間の扱い: みなとみらい線(地下) / 東急東横線(地上) / 東京メトロ副都心線(地下) / 西武有楽町線(地下) / 西武池袋線(地上)
```

```bash
# Fライナー相当 (元町・中華街→飯能)
npm run gpx:generate -- \
  --line-group 152 --max-speed 80 --signal-profile subway \
  --subway-lines 99310,22003 --out assets/gpx/FLinerSeibu.gpx
```

## 同梱している GPX

| ファイル | 内容 |
| ---- | ---- |
| `assets/gpx/SampleJY.gpx` | 山手線。外部ツールで記録した実走行ログ |
| `assets/gpx/SampleTohokuShinkansen.gpx` | 東北新幹線 盛岡→仙台。最高 320km/h、一ノ関に停車、通過駅 5 駅を経由 |
| `assets/gpx/KeioSpecialExpress.gpx` | 京王線 特急 新宿→京王八王子。最高 110km/h |
| `assets/gpx/KatamachiRapid.gpx` | 片町線 快速 京田辺→木津。駅間 2.3km・最高 95km/h |
| `assets/gpx/SobuRapid.gpx` | 総武快速線 錦糸町→津田沼。駅間 3.4〜7.5km・最高 120km/h |
| `assets/gpx/FLinerSeibu.gpx` | Fライナー相当 元町・中華街→飯能。地下鉄の電波環境付き |

`SampleTohokuShinkansen.gpx` は盛岡以南の 320km/h 区間を再現するためのもの。
経路上の 8 駅すべてに `ARRIVED_MAX_THRESHOLD` (200m) 以内まで接近するので、
各駅の到着判定・通過判定をそのまま観測できる。

`KeioSpecialExpress.gpx` は在来線側のサンプルで、種別グループの停車パターン
(経路 32 駅 / うち停車 12 駅) をそのまま走る。同じコマンドを再実行すれば
バイト単位で同じ内容が得られる。

`FLinerSeibu.gpx` は地下鉄の電波環境を持つ唯一のサンプル。いわゆる F ライナーだが、
StationAPI に「F ライナー」という種別は無く、みなとみらい線・東急東横線が特急、
副都心線が急行、西武有楽町線・西武池袋線が快速急行という組み合わせ (`lineGroupId`
152) がそれにあたる。

地下 (みなとみらい線) → 地上 (東急東横線) → 地下 (副都心線 → 西武有楽町線) → 地上
(西武池袋線) と 5 路線 4 社を跨ぎ、地下 ↔ 地上が 3 回切り替わる (うち地下から地上への
復帰が 2 回)。副都心線から西武有楽町線は地下から地下なので切り替わりに数えない。
欠測は 7 件・最長 195 秒で、ETA 棄却の保険 (`ETA_BOUND_MAX_HOLD_MS` = 90 秒) を超える
区間を 4 箇所含む。

地下鉄分岐と、地上へ復帰したときの基準の張り直しを 1 本で繰り返し踏める
(ただし実機では上記のとおり副都心線の区間だけ。Jest 側は全区間)。84 分・4433 点と
他のサンプルより大きいが、この経路は他に代えがない。

`--max-speed` は路線ごとに変えられないので、全区間を副都心線の 80km/h で走らせて
いる。地上側は本来もっと速い (東横線特急 110km/h、西武池袋線快速急行 105km/h) が、
このサンプルの被検体はトンネル内の欠測長であり、速度を上げるとそこが縮む。110km/h で
生成すると `ETA_BOUND_MAX_HOLD_MS` (90 秒) を超える欠測が 4 箇所から 1 箇所へ減る。
地上区間の速度はこの検証に効かないため、地下側を実速度に合わせている。

`KatamachiRapid.gpx` と `SobuRapid.gpx` は、EMA の追従遅れが到着判定へ効く条件を
狙ったサンプル。到着圏は駅間 800m 以上でどれも 200m にクランプされるので、
遅れ (速度に比例) が到着圏を食い潰しやすい**高速・全駅停車**の区間を選んでいる。
`SobuRapid.gpx` は 120km/h と最も条件が厳しく、東京から乗るだけで実機確認できる
区間でもある (地上区間は錦糸町以東)。

## iOS シミュレータで再生する

1. Xcode でワークスペースを開く。
1. メニューの Debug > Simulate Location > Add GPX File to Workspace… で GPX を選ぶ。
1. アプリを起動した状態で Debug > Simulate Location から追加した GPX を選ぶ。

Xcode は `<time>` の間隔どおりに測位を配信するので、GPX 側で速度を制御できる。

## Android 実機・エミュレータで再生する

`scripts/replay-location-gpx.mjs` が GPX を Android のテストプロバイダへ流し込む。
`adb shell cmd location providers` を使うので、実機でも仮の現在地アプリを別途
入れる必要はない。手順の全体は `.claude/skills/replay-gpx/SKILL.md` にある。

```bash
npm run gpx:replay -- --gpx assets/gpx/SampleTohokuShinkansen.gpx --serial <serial>
```

主なオプションは次のとおり。`--help` で全件を表示できる。

| オプション | 説明 |
| ---- | ---- |
| `--gpx` | 再生する GPX (必須) |
| `--serial` | adb シリアル。接続が 1 台だけなら省略可 |
| `--speed` | 再生倍率。既定 `1` |
| `--accuracy` | 水平精度 (m)。カンマ区切りで点ごとに巡回。既定の扱いは下記 |
| `--start` | GPX 先頭からのスキップ秒数 |
| `--provider` | テストプロバイダ名。既定 `gps,network,fused` |

Xcode と違い精度を指定できるので、`--accuracy 100,300` のように渡せば
`getSmoothingAlpha` の低精度分岐も実機で観測できる。一方で `coords.speed` を
渡す手段が無いため、DEV OVERLAY の `CURRENT SPEED` は常に 0km/h を表示する。

精度の優先順位は次のとおり。

1. `--accuracy` を明示したときはその値。GPX に記録された精度より優先する。
1. 指定が無ければ GPX の `trainlcd:accuracy`。
1. どちらも無い点は `8`。

欠測 (`<time>` の穴) はそのまま待ち時間になる。GPX に 195 秒の穴があれば端末へも
195 秒のあいだ何も流さないので、`STALE_REFERENCE_MS` の基準張り直しまで含めて観測できる。

テストプロバイダへ打つのを止めるだけなので「Play 開発者サービスの Fused が最後の測位を
保持して配り続けるのでは」という懸念があるが、実測ではそうならなかった (後述の
「検証できること・できないこと」を参照)。ただし確かめたのは 1 機種なので、初めて使う
端末では下の手順で一度確認する。

```bash
adb shell dumpsys location | grep -A3 "fused provider" | grep "last location="
```

欠測のあいだ `last location` の `et=` (測位時刻) が止まっていれば途絶になっている。
値が進み続けるなら Fused が配り直しているので、`--provider gps,network` で `fused` を
外して試す。

`MAX_PLAUSIBLE_SPEED` は 100m/s (360km/h) なので、320km/h の GPX を `--speed 2`
以上で流すと速度フィルタが全点を棄却して現在地が凍る。倍速で見たいときは
`--max-speed` を下げた GPX を作り直す。

## EMA スムージングと配信間隔

固定 α の EMA の追従遅れは、定速・一定間隔のとき `((1-α)/α)·v·Δt` で、配信間隔 Δt に
比例する。α を精度だけで決めると Δt が変わるたびに遅れも変わるため、
`getSmoothingAlpha` は精度が `BAD_ACCURACY_THRESHOLD` (200m) 未満の帯で
`α = Δt / (Δt + T)` を使う。**このとき追従遅れは `v·T` になり Δt に依存しない**。
T は旧実装の固定 α が 1 秒間隔で持っていた遅れ時間なので、Δt が 1 秒のとき α は
旧実装と完全に一致する。

精度 200m 以上の帯だけは固定 α (0.3) を維持している。この帯は測位ノイズ
(σ ≒ accuracy) が到着圏に対して大きく、スムージングが到着判定の安定性そのものを
担っているため。正規化して α を上げると遅れは詰まるが、平滑後の座標が到着圏を
出入りして到着表示がばたつく。追従遅れと安定性の積は配信間隔で決まるので、
10 秒間隔・σ=250m では許容遅れをどこに置いても両立しない。

この挙動は `src/store/atoms/location.gpxLag.test.ts` が GPX を実パイプラインへ
流して検証している (`assets/gpx/KatamachiRapid.gpx` は駅間 2.3km・95km/h と、到着圏が
最小クランプに張り付く最も不利な条件)。

## Jest から GPX を流すテスト

GPX は Xcode / adb だけでなく Jest からも参照する。`src/store/atoms/location.ts` の
`setLocation` へ直接流し込めるので、速度フィルタ・EMA・基準の張り直しまで含んだ
測位パイプライン全体を CI で回帰させられる。

| テスト (`src/store/atoms/`) | 対象 | 使う GPX |
| ---- | ---- | ---- |
| `location.gpxLag.test.ts` | EMA の追従遅れが表示の切り替わり位置をどれだけ後ろへずらすか | 4 本 (新幹線を除く) |
| `location.gpxEtaAssist.test.ts` | ETA 補助を有効にしても走行結果が変わらないこと | 精度を持たない全 GPX |
| `location.subwayGpx.test.ts` | 地下鉄の電波環境で地下鉄分岐へ入ること | F ライナー |

ETA 補助 (`eta_assist_enabled`) がパイプラインへ介入する経路は、ETA が許す進行量を
超えた測位の棄却 (`store/atoms/location.ts`) だけである。精度劣化時に到着圏を緩和する
R1 (`hooks/useRefreshStation.ts`) も持っていたが、有効化して実走させたところ到着判定が
悪化したため廃止した。

`location.gpxEtaAssist.test.ts` は点ごとの精度を持つ GPX を対象から外す。あのスイープは
「GPX は真の軌跡だけを供給し、精度と配信間隔はテストが振る」前提で組まれており、
`truthAt` で等間隔に再サンプルするため GPX が持つ欠測は補間で消え、記録された精度も
使われない。電波環境そのものが被検体になるトラックは `location.subwayGpx.test.ts` が
記録されたまま流す。

サーバー配信のフラグ 1 つで全ユーザーへ有効化されるため、有効化の前提は
「正常な走行では何も変えない」ことになる。`location.gpxEtaAssist.test.ts` は各 GPX を
フラグ ON / OFF で 2 回流し、平滑後の軌跡・位置を据え置いた回数・到着検知位置が
一致することを確かめる。ETA の停車時刻は GPX 自身の時刻表から作るので、ETA どおりに
走る列車のモデルになる。棄却が実際に働く側の挙動は合成データで
`src/store/atoms/location.etaBound.test.ts` が受け持つ。

GPX の解析・停車駅の検出・真の位置の補間は `src/utils/test/gpxTrack.ts` にまとめてある。
`parseGpx` は 1 点ぶんのノードを切り出してからその内側だけを読む。XML 全体へ
「`lat`/`lon` のあと最初に現れる `<time>`」のようなパターンを当てると、時刻を持たない点が
あったときに次の点の `<time>` まで食い、座標と時刻が食い違った組を黙って作るため。
点ごとに有無が変わる `trainlcd:accuracy` を足すと必ず踏む形になる。
停車駅は速度がほぼ 0 の区間から検出するが、生成した GPX は始発駅の停車時間を書き出さず
(1 点目から発車する)、終着駅では減速しきった時点でトラックが終わるため、停車時間の
下限では始発駅・終着駅を拾えない。先頭・末尾で静止しているトラックはその点が
始発駅・終着駅なので、停車時間に関わらず停車として扱う。
`location.gpxLag.test.ts` は始発駅・終着駅を含めない検出を自前に持っており、区間長の
中央値がこの扱いで変わるため共通化していない。

## 検証できること・できないこと

| 条件 | GPX (iOS シミュレータ) | GPX (Android) | 実乗車 |
| ---- | ---- | ---- | ---- |
| 320km/h・精度良好 (精度 50m 未満) | ✅ | ✅ | ✅ |
| 精度 100m / 300m | ❌ 常に良好な精度を返す | ✅ `--accuracy` か GPX の精度 | ✅ |
| 配信間隔ごとの追従遅れ | ❌ 間隔は OS 任せ | ❌ 同上 | ✅ |
| トンネルでの測位途絶からの復帰 | ❓ Xcode が `<time>` の穴をどう扱うか未検証 | ✅ 実機 1 機種で確認済み (下記) | ✅ |
| 車体による GPS 減衰 | ❌ | ❌ | ✅ |
| `coords.speed` を使う表示 | ✅ | ❌ 常に 0 | ✅ |

測位途絶は `--signal-profile subway` で GPX に書ける。「テストプロバイダへ打つのを
止めるだけなので、Play 開発者サービスの Fused が最後の測位を保持して配り続けるのでは
ないか」という懸念を実機で確かめたが、**そうはならなかった**。

`FLinerSeibu.gpx` の 195 秒の欠測を Galaxy SCG13 (Android 16) へ流し、`dumpsys location`
を 3 秒間隔で採った結果、欠測のあいだ fused の `last location` は座標・`hAcc` だけでなく
**測位自体の時刻 (`et=`) も 1ms も進まなかった** (26 サンプル)。Fused は測位を合成も
再配信もせず、新しい測位が 1 つも生まれない。つまり GPX の穴はそのまま測位の途絶になる。

**確かめたのはこの 1 機種だけ**なので、他機種・他バージョンの Play 開発者サービスでも
同じとは限らない。初めて使う端末では「Android 実機・エミュレータで再生する」の手順で
`et=` が止まることを 1 度確認する。

```text
09:21:34  35.692672,139.705452 hAcc=618.0 et=+5d1h23m15s728ms   ← 欠測へ突入
  (26 サンプル、値が 1 つも変わらない)
09:22:54  35.729662,139.709335 hAcc=378.0 et=+5d1h26m31s710ms   ← 195 秒後、池袋の手前で復帰
09:23:09  35.731464,139.708291 hAcc= 45.0                       ← 池袋に到着、ホーム帯へ
09:24:14  35.731466,139.708280 hAcc=496.0                       ← 発車、坑口帯へ
```

`trainlcd:accuracy` が端末へそのまま届くこともこれで確認できている (618m → 45m → 496m
が GPX の坑口帯・ホーム帯・坑口帯に一致)。アプリ側は欠測のあいだ表示が凍り、復帰時に
次の停車駅 (池袋) へ飛ぶ。`etaProgressBound.ts` が想定する「発車を観測できないまま次の
停車駅で測位が復活する」経路そのものになる。

Jest からの再生 (`location.subwayGpx.test.ts`) は `setLocation` を直接呼ぶので、こちらも
完全な穴になる。

車体による減衰は GPX では再現できない。これは
`src/store/atoms/location.test.ts` のユニットテストで代替するか、dev ビルドの
`DevOverlay` (精度履歴・生座標を表示) を出したまま実際に乗車して確認する。
