# Firebase Test Lab の Robo テスト

端末を接続せずに、複数機種での起動時クラッシュと初期導線の到達可否を確認するための
GitHub Actions ワークフロー。

- ワークフロー: `.github/workflows/test_lab_robo.yml`
- トリガー: **手動 (`workflow_dispatch`) のみ**

Robo はクローラなので、テストコードも `testID` の配線も要らない。Build Android Canary
が artifact として上げた AAB をそのまま投げるだけで動く。

## 何を見るもので、何を見ないものか

見るのは「端末を誰も持っていない状態でアプリが起動して最初の画面を生き延びるか」だけ。
機種ごとのクラッシュ、スクリーンショット、動画、logcat が得られる。

機能テストではない。測位パイプライン (速度フィルタ・EMA スムージング・精度フィルタ) の
検証には実機が要る。そちらは [位置情報シミュレーション (GPX)](./location-simulation.md)
を参照。

## ビルドはしない

このワークフローはビルドを行わない。Build Android Canary が既に生成した
`app-devRelease` アーティファクトを run ID 指定で取得するだけで、
`.github/workflows/build_android_canary.yml` には一切触れない。

ビルドの重複が無く、ビルドワークフローは最後までビルド専用のままになる。

## 前提

- Test Lab を有効にした Firebase プロジェクト。無料枠を超える分は Blaze プラン。
- そのプロジェクトで **Firebase Test Lab Admin** と **Firebase Analytics Viewer** を
  持つサービスアカウント。JSON をシークレット `TEST_LAB_SERVICE_ACCOUNT_JSON` に設定する。

プロジェクト ID はその JSON の `project_id` から読む。シークレットを増やさない分、
両者が食い違う余地が無い。サービスアカウントはテストを走らせたいプロジェクトに
属している必要がある。

`gcloud` は GitHub ホストランナーに同梱されているため、サードパーティアクションを
使わず `gcloud auth activate-service-account` を直接呼んでいる。

## 実行手順

1. **Actions** → **Build Android Canary** から、対象コミットのビルドを確認する。
   `app-devRelease` アーティファクトがあるものなら push・手動実行のどちらでもよい。
2. その run の URL 末尾の数値が run ID。
   (`https://github.com/TrainLCD/MobileApp/actions/runs/<run ID>`)
3. **Actions** → **Firebase Test Lab (Robo)** → **Run workflow**。
4. `build_run_id` に 2 の値を入れる。`devices` は既定のままでよい。
5. Robo マトリクスが全端末で `Finished` になることを確認する。
6. ジョブログ先頭の results URL を開き、クロールが起動画面より先へ進んでいるかを見る。

## 端末の指定

`devices` 入力に `--device` をそのまま並べる。既定値は Arm 仮想端末 2 構成で、
API レベルを 2 つ跨ぐ最も安い組み合わせ。

```text
--device model=MediumPhone.arm,version=34 --device model=MediumPhone.arm,version=30
```

OEM 固有の挙動を見たいときは同じ書式で物理端末を足す
(`--device model=shiba,version=34`)。手動実行の入力なので、1 回限りの確認で
ファイルを書き換える必要はない。

型番はカタログから退役する。`model ... is not a valid model id` で落ちたときは
現行のカタログを確認して指定し直す。既定値ごと変えるならワークフローの
`inputs.devices.default` を更新する。

```bash
gcloud firebase test android models list
```

## 既知の制限と次にやること

- **成果物は Test Lab コンソールに残る。** スクリーンショット・動画・logcat を
  GitHub Actions の artifact へ持ち込んではいない。やるなら `--results-bucket` の
  明示とダウンロードステップが要る。
- **クロールの経路は不定。** Robo が自分で進路を選ぶため、どこまで到達するかは
  実行ごとに揺れる。経路を固定するには
  [Robo script](https://firebase.google.com/docs/test-lab/android/robo-scripts-reference)
  を Android Studio で 1 回記録する必要がある。
- **要素の指定が未配線。** `src/test/e2e.ts` に `TestIds` はあるが、値を受け取って
  いるコンポーネントが無い (`src/components/Button.tsx`、`src/components/Chip.tsx` が
  `ButtonTestId` 型だけを import している)。Robo script は `resource-id` で要素を
  特定し、React Native ではこれが `testID` から作られるので、経路を固定した実行を
  やるなら配線が前提になる。
