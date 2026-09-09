# 位置情報シミュレーション (GPX)

測位まわりの変更を検証するための GPX を生成し、iOS シミュレータへ流し込む手順。

## なぜオートモードでは検証できないか

アプリのオートモード (`src/hooks/useSimulationMode.ts`) は擬似的な現在地を作るが、
書き込み先は `store.set(locationAtom, ...)` で、**`setLocation` を経由しない**。

そのため `src/store/atoms/location.ts` の次の処理を一切通らない。

- ワープ対策の速度フィルタ (`MAX_PLAUSIBLE_SPEED`)
- EMA スムージング (`getSmoothingAlpha`)
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
| `--from` / `--to` | 始点・終点の駅 ID。API の並び順に関わらず指定した向きで走る |
| `--max-speed` | 最高速度 (km/h)。既定は `320` |
| `--skip` | 通過駅の駅 ID (カンマ区切り)。停車しないだけで経路上は通過する |
| `--dwell` | 停車駅での停車時間 (秒)。既定は `60` |
| `--api` | StationAPI の URL。既定は `$GQL_API_URL` か本番エンドポイント |

出力は 1 秒間隔の `<wpt>` 列になる。iOS は `distanceInterval` 基準で概ね 1Hz 配信のため、
実機の更新間隔に近い。

## 同梱している GPX

| ファイル | 内容 |
| ---- | ---- |
| `ios/SampleJY.gpx` | 山手線。外部ツールで記録した実走行ログ |
| `ios/SampleTohokuShinkansen.gpx` | 東北新幹線 盛岡→仙台。最高 320km/h、一ノ関に停車、通過駅 5 駅を経由 |

`SampleTohokuShinkansen.gpx` は盛岡以南の 320km/h 区間を再現するためのもの。
経路上の 8 駅すべてに `ARRIVED_MAX_THRESHOLD` (200m) 以内まで接近するので、
各駅の到着判定・通過判定をそのまま観測できる。

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

## 検証できること・できないこと

| 条件 | GPX (iOS シミュレータ) | GPX (Android) | 実乗車 |
| ---- | ---- | ---- | ---- |
| 320km/h・精度良好 (α=0.8、実効しきい値 288km/h) | ✅ | ✅ | ✅ |
| 精度 100m / 300m (α=0.6 / 0.3) | ❌ 常に良好な精度を返す | ✅ `--accuracy` で指定 | ✅ |
| トンネルでの測位途絶からの復帰 | ❌ | ❌ | ✅ |
| 車体による GPS 減衰 | ❌ | ❌ | ✅ |
| `coords.speed` を使う表示 | ✅ | ❌ 常に 0 | ✅ |

測位途絶や車体による減衰は GPX では再現できない。
これらは `src/store/atoms/location.test.ts` のユニットテストで代替するか、
dev ビルドの `DevOverlay` (精度履歴・生座標を表示) を出したまま実際に乗車して確認する。
