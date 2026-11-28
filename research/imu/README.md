# 磁気併用の停車候補を乗車中に比較する

開発版のDOで、既存の発車検出器と固定した停車モデルによる候補を比較します。端末で同時に動く二つの判定器は同じモーション入力を受け取ります。停車確率が0.65以上で1秒続くと基準方式が停車を確定します。磁気併用方式では、走行開始後の直近2秒の磁場強度の標準偏差が1.428158 µTを超え、角速度の90パーセンタイルが15度/秒以下なら、その窓の停車スコアを0にします。磁気の欠測時には元のスコアを使います。[乗車時の操作](../../docs/imu-shadow.md#乗車中に停車候補を比較する)

## 公開データによる検証

| 記録 | 駅間の誤停車（基準 → 磁気併用） | 到着前後5秒で切り替わり次発まで維持 |
| --- | ---: | ---: |
| 既存の評価54区間 | 9 → 3回 | 20 → 15／38駅 |
| 未使用の3乗車14区間 | 2 → 1回 | 5 → 4／10駅 |

右列の分母は次発を観測した途中駅です。オフラインの表示評価には暫定走行の終了による停車も含めました。DOでは通常の停車確定器を直接観測します。新しい14区間の基準方式で適時に切り替わった5駅は、いずれも暫定走行の終了によるものでした。停車候補を通常案内へ採用する判断は見送りました。[基準方式の判定時刻](imu-magnetic-stop-events.csv)・[駅ごとの対比較](imu-magnetic-stop-pairs.csv)

CSVの公開乗車分は Stefan Czybik、Pia Hanfeld、Konrad Rieck による TrainTrack Dataset のセンサー計測と発着注釈から算出した加工データです。匿名区間の識別子は原資料に従います。両CSVを原資料と同じライセンスで提供します。[TrainTrack Dataset](https://doi.org/10.5281/zenodo.22206115)・[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

## 再現方法

このディレクトリで実行します。引き継ぎデータには開発記録、各評価群の同期済み入力と固定モデルの予測、基準方式の発着イベントが含まれます。追加3乗車は同じデータディレクトリの `magnetic-stop-validation` にあります。使用した環境はPython 3.14、NumPy 2.5.5、scikit-learn 1.9.1です。

```sh
data="$HOME/Documents/TrainLCD-imu-data"
python="$data/handoff-2026-11-28/venv/bin/python"
out=$(mktemp -d)
"$python" -m unittest test_magnetic_stop
"$python" magnetic_stop.py --dataset "$data" \
  --extra-public "$data/magnetic-stop-validation" --check-domestic --output-dir "$out"
cmp imu-magnetic-stop-events.csv "$out/imu-magnetic-stop-events.csv"
cmp imu-magnetic-stop-pairs.csv "$out/imu-magnetic-stop-pairs.csv"
"$python" export_stop_model.py "$data/handoff-2026-11-28/public-eval/fixed-model.pkl" "$out/forest.json"
cmp ../../assets/imu/stop-forest.json "$out/forest.json"
```

モデルの変換時に学習済みファイルのSHA-256を照合します。アプリでは決定木の分岐と葉の確率を読み、端末上で停車確率を計算します。単体テストはリポジトリ直下から `npm test -- --runInBand imuStopTrial ImuShadowPanel` で実行できます。
