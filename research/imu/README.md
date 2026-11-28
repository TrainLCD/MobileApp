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

## 国内の発着記録で端末用の判定器を再生する

都営新宿線5区間、東京メトロ南北線2区間、都営大江戸線1区間のセンサー記録を、DOと同じ判定器に入力しました。先頭から約10 Hzで抽出した3乗車では、到着タップの前後5秒で停車に切り替わり、次の発車まで維持できたのは0／5駅でした。残りの3駅では次の発車を観測していません。市ヶ谷では到着3.28秒後に停車候補を出しましたが、4.58秒後に走行へ戻りました。六本木一丁目では到着12.12秒前に停車候補を出しました。3乗車には磁気の記録がなく、DOの両方式で同じ結果になりました。

次のコマンドはリポジトリ直下で実行します。同じ乗車の抽出開始位置をずらした再生も含め、停車スコア16,424件とすべての状態遷移を保存済みの結果と照合します。スコアの絶対誤差の許容値は `1e-10` です。

```sh
data="$HOME/Documents/TrainLCD-imu-data"
out=$(mktemp -d)
./node_modules/.bin/tsc --ignoreConfig src/lib/imuStopTrial.ts --module node16 \
  --target es2022 --skipLibCheck --types node --resolveJsonModule \
  --esModuleInterop --rootDir . --outDir "$out"
node research/imu/check-domestic-stop-trial.mjs "$out/src/lib/imuStopTrial.js" "$data"
```
