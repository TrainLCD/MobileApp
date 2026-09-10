# 位置情報シミュレーション (GPX)

測位まわりの変更を検証するための GPX を生成し、iOS シミュレータへ流し込む手順。

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
  --out ios/SampleTohokuShinkansen.gpx
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
npm run gpx:generate -- --line-group 71 --max-speed 110 --out ios/KeioSpecialExpress.gpx
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
| `ios/SampleJY.gpx` | 山手線。外部ツールで記録した実走行ログ |
| `ios/SampleTohokuShinkansen.gpx` | 東北新幹線 盛岡→仙台。最高 320km/h、一ノ関に停車、通過駅 5 駅を経由 |
| `ios/KeioSpecialExpress.gpx` | 京王線 特急 新宿→京王八王子。最高 110km/h |

`SampleTohokuShinkansen.gpx` は盛岡以南の 320km/h 区間を再現するためのもの。
経路上の 8 駅すべてに `ARRIVED_MAX_THRESHOLD` (200m) 以内まで接近するので、
各駅の到着判定・通過判定をそのまま観測できる。

`KeioSpecialExpress.gpx` は在来線側のサンプルで、種別グループの停車パターン
(経路 32 駅 / うち停車 12 駅) をそのまま走る。同じコマンドを再実行すれば
バイト単位で同じ内容が得られる。

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
npm run gpx:replay -- --gpx ios/SampleTohokuShinkansen.gpx --serial <serial>
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

EMA の追従遅れは定速時 `((1-α)/α)·v·Δt` で、測位の配信間隔 Δt に比例する。
α を精度だけで決めると Δt が変わるたびに遅れも変わるため、`getSmoothingAlpha` は
精度が `BAD_ACCURACY_THRESHOLD` (200m) 未満の帯で `α = Δt / (Δt + T)` を使い、
遅れを常に T 秒ぶんに収める。T は旧実装の固定 α が 1 秒間隔で持っていた遅れ時間
なので、Δt が 1 秒のとき α は旧実装と完全に一致する。

精度 200m 以上の帯だけは固定 α (0.3) を維持している。この帯は測位ノイズ
(σ ≒ accuracy) が到着圏に対して大きく、スムージングが到着判定の安定性そのものを
担っているため。正規化して α を上げると遅れは詰まるが、平滑後の座標が到着圏を
出入りして到着表示がばたつく。追従遅れと安定性の積は配信間隔で決まるので、
10 秒間隔・σ=250m では許容遅れをどこに置いても両立しない。

この挙動は `src/store/atoms/location.gpxLag.test.ts` が GPX を実パイプラインへ
流して検証している (`ios/KatamachiRapid.gpx` は駅間 2.3km・95km/h と、到着圏が
最小クランプに張り付く最も不利な条件)。

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
