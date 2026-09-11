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

## 同梱している GPX

| ファイル | 内容 |
| ---- | ---- |
| `assets/gpx/SampleJY.gpx` | 山手線。外部ツールで記録した実走行ログ |
| `assets/gpx/SampleTohokuShinkansen.gpx` | 東北新幹線 盛岡→仙台。最高 320km/h、一ノ関に停車、通過駅 5 駅を経由 |
| `assets/gpx/KeioSpecialExpress.gpx` | 京王線 特急 新宿→京王八王子。最高 110km/h |
| `assets/gpx/KatamachiRapid.gpx` | 片町線 快速 京田辺→木津。駅間 2.3km・最高 95km/h |
| `assets/gpx/SobuRapid.gpx` | 総武快速線 錦糸町→津田沼。駅間 3.4〜7.5km・最高 120km/h |

`SampleTohokuShinkansen.gpx` は盛岡以南の 320km/h 区間を再現するためのもの。
経路上の 8 駅すべてに `ARRIVED_MAX_THRESHOLD` (200m) 以内まで接近するので、
各駅の到着判定・通過判定をそのまま観測できる。

`KeioSpecialExpress.gpx` は在来線側のサンプルで、種別グループの停車パターン
(経路 32 駅 / うち停車 12 駅) をそのまま走る。同じコマンドを再実行すれば
バイト単位で同じ内容が得られる。

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
| `--accuracy` | 水平精度 (m)。既定 `8`。カンマ区切りで区間ごとに巡回 |
| `--start` | GPX 先頭からのスキップ秒数 |
| `--provider` | テストプロバイダ名。既定 `gps,network,fused` |

Xcode と違い精度を指定できるので、`--accuracy 100,300` のように渡せば
`getSmoothingAlpha` の低精度分岐も実機で観測できる。一方で `coords.speed` を
渡す手段が無いため、DEV OVERLAY の `CURRENT SPEED` は常に 0km/h を表示する。

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
| `location.gpxEtaAssist.test.ts` | ETA 補助を有効にしても走行結果が変わらないこと | 全 GPX |

ETA 補助 (`eta_assist_enabled`) がパイプラインへ介入する経路は 2 つある。

- ETA が許す進行量を超えた測位の棄却 (`store/atoms/location.ts`)
- 精度劣化時に ETA が同じ駅の停車を示すときだけ到着圏を緩和する R1 (`hooks/useRefreshStation.ts`)

どちらもサーバー配信のフラグ 1 つで全ユーザーへ有効化されるため、有効化の前提は
「正常な走行では何も変えない」ことになる。`location.gpxEtaAssist.test.ts` は各 GPX を
フラグ ON / OFF で 2 回流し、平滑後の軌跡・位置を据え置いた回数・到着検知位置が
一致することを確かめる。ETA の停車時刻は GPX 自身の時刻表から作るので、ETA どおりに
走る列車のモデルになる。棄却が実際に働く側の挙動は合成データで
`src/store/atoms/location.etaBound.test.ts` が受け持つ。

GPX の解析・停車駅の検出・真の位置の補間は `src/utils/test/gpxTrack.ts` にまとめてある。
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
| 精度 100m / 300m | ❌ 常に良好な精度を返す | ✅ `--accuracy` で指定 | ✅ |
| 配信間隔ごとの追従遅れ | ❌ 間隔は OS 任せ | ❌ 同上 | ✅ |
| トンネルでの測位途絶からの復帰 | ❌ | ❌ | ✅ |
| 車体による GPS 減衰 | ❌ | ❌ | ✅ |
| `coords.speed` を使う表示 | ✅ | ❌ 常に 0 | ✅ |

測位途絶や車体による減衰は GPX では再現できない。
これらは `src/store/atoms/location.test.ts` のユニットテストで代替するか、
dev ビルドの `DevOverlay` (精度履歴・生座標を表示) を出したまま実際に乗車して確認する。
