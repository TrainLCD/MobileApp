# IMU replay PoC

MobileApp の `ImuShadowEstimator` に記録済みセンサー観測を渡し、1駅間の到着候補をオフラインで評価します。既存のアプリ本体、ネイティブモジュール、到着判定は変更しません。Node.js 24 を使用します。追加の依存パッケージはありません。

## 合成データで試す

リポジトリのルートに `utils/imu-replay/` を配置して実行します。

```bash
node --test utils/imu-replay/replay-check.mjs
node --experimental-transform-types utils/imu-replay/replay.mjs \
  utils/imu-replay/example/config.json utils/imu-replay/example
```

`example/` は合成データです。実測精度を示すものではありません。43秒のETAに対し、実走行時間を40秒と仮定しています。推定器へ実発車・実到着ラベルを渡しません。

## TrainTrack で試す

[TrainTrack](https://doi.org/10.5281/zenodo.22206115) の取得・展開は公式手順に従い、評価対象の駅間とその前後を含むCSVを用意します。全データをリポジトリに追加する必要はありません。PoCでは実ファイルの列名・単位が以下と一致するものだけを対象にします。

- `Accelerometer.csv`: 重力除去済み加速度（m/s²）
- `Gravity.csv`: 重力ベクトル（m/s²）
- `Gyroscope.csv`: 角速度（rad/s）
- 各ファイルの列は `seconds_elapsed,x,y,z` を含み、同じ記録開始時刻を基準とします。軸の規約が3ファイルで一致することを確認してください。

単位の根拠は [Sensor Logger の単位リファレンス](https://github.com/tszheichoi/awesome-sensor-logger/blob/main/UNITS.md) です。実データでの互換性はまだ検証していません。重力除去済み加速度のない端末データは対象外です。単一駅間向けに、CSVは必要な範囲へ切り出してください（時刻の原点は変えないでください）。

`example/config.json` をコピーし、実測ラベルと独立した駅間距離・ETAを指定します。すべての時刻は同じ記録開始時点からのミリ秒です。`startMs` は実発車前の停車中、`endMs` は実到着から10秒以上経過した時点で、次の発車より前とします。`fromId` と `toId` は区間識別用の仮IDでも構いませんが、`distanceM` は独立した根拠が必要です。ETAがなければ `etaSeconds: null` にします。ラベルや距離が不明な区間を、正解として評価しないでください。

加速度を約10Hzで選び、各加速度観測時点以前の重力・角速度を最大50msのずれまで許容します。欠落時は補間せず、変換できない区間としてエラーにします。加速度の時刻欠落は元の間隔を保持し、既存推定器に判定させます。

```bash
node --experimental-transform-types utils/imu-replay/replay.mjs \
  /path/to/config.json /path/to/segment
```

JSON出力には到着候補の実到着時刻からの誤差、±10秒を基準とした未検出・誤検出、ETAの時刻誤差、実到着時点の距離誤差、推定器の無効化理由が含まれます。時刻・距離の誤差は「推定値 − 実測値」です。推定無効時の距離誤差は `null` です。評価に実到着時刻を使用しますが、推定器には渡しません。

## 検証の範囲

- `replay-check.mjs` はCSV変換、同期、欠損、単位変換、評価をテストします。推定器はスタブを使っています。
- 本番の `ImuShadowEstimator` に対する実行は上記CLIを使用します。
- 実データの精度、バックグラウンド取得、消費電力、車両・端末間の一般化は対象外です。
