# 変更履歴

依存パッケージの更新や Expo SDK の移行など、アプリ全体に影響する変更の記録。
CLAUDE.md「Security & Configuration Guardrails」に従い、依存更新後に実施した
`expo-doctor` / `npm run lint` / `npm test` / `npm run typecheck` の結果をここに残す。

新しいエントリを上に追加する。

## 2026-08-28 — devDebug で JS が APK に焼き込まれ Fast Refresh とデバッガが使えない不具合を修正

対象バージョン: v10.13.1 / Issue [#6741](https://github.com/TrainLCD/MobileApp/issues/6741)

### 内容

- `npm run android`（`APP_VARIANT=dev expo run:android -- --variant devDebug`）で入れた
  ビルドが Metro に接続されず、Fast Refresh も CDP デバッガも使えなかった。JS だけの修正でも
  毎回フルビルドが必要になっていた。
- 原因は `android/app/build.gradle` の `react { }` ブロックで `debuggableVariants` が
  コメントアウトのままだったこと。RN の Gradle プラグインは `debuggableVariants` に
  **バリアント名が完全一致**（大文字小文字は無視）したときだけ
  `createBundle<Variant>JsAndAssets` の登録をスキップする
  （`@react-native/gradle-plugin` の `TaskConfiguration.kt` の `isDebuggableVariant`）。
  既定値は RN 0.86 時点で `["debug", "debugOptimized"]` だが、本プロジェクトは
  `flavorDimensions "environment"` を持つためバリアント名が `devDebug` / `prodDebug` になり
  既定リストに一致せず、debug ビルドでも JS が APK に同梱されていた。
- `debuggableVariants = ["devDebug", "prodDebug", "devDebugOptimized", "prodDebugOptimized"]`
  を明示した。`*DebugOptimized` は RN の Gradle プラグインが `maybeCreate` で自動生成する
  build type で、RN の既定値が `debugOptimized` を含むため同じ扱いに揃えている。
- 配布ビルドは EAS（`eas.json`）・CI（`build_android_canary.yml` /
  `build_android_production.yml`）とも `bundleDevRelease` / `bundleProdRelease` の
  **Release バリアント**を使うため、この変更の影響を受けない。
- **この変更以降、Android の debug ビルドは起動に Metro が必要**になる。

### 検証結果

Android 実機（Samsung SCG13 / Android 16・API 36）で確認した。

- `./gradlew :app:assembleDevDebug --dry-run` の差分は
  `:app:createBundleDevDebugJsAndAssets` の 1 タスク削除のみ（828 → 827 タスク）。
- `assembleDevRelease` / `assembleProdRelease` では
  `createBundle*ReleaseJsAndAssets` と Sentry のソースマップ関連タスクが従来どおり残る。
- `assembleProdDebug` と `assembleDevDebugOptimized` /
  `assembleProdDebugOptimized` はいずれもバンドルタスクが登録されない。
- ビルドした APK に `index.android.bundle` が含まれない（`unzip -l` で確認）。
- Metro がバンドルを配信する（`Android Bundled 53547ms index.js (3617 modules)`）。
- `curl -s http://localhost:8081/json/list` が CDP ターゲット
  （`React Native Bridgeless [C++ connection]`）を返す。
- CDP 経由の式評価で `__DEV__ === true`、Hermes、Metro のモジュールレジストリ
  （`__r` / `__d`）が揃っていることを確認。

## 2026-08-26 — Android の端末内蔵 TTS でダッキングが効かない不具合を修正

対象バージョン: v10.13.1 / Issue [TrainLCD/Issues#1263](https://github.com/TrainLCD/Issues/issues/1263)

### 内容

- 音楽再生中にアナウンスが流れても他アプリの音量が下がらない、という Android からの
  報告を修正した。Android のダッキングは `AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK` の
  要求でしか起きないが、`expo-speech` の Android 実装は `AudioManager` に一切触れず、
  `expo-audio` の `setAudioModeAsync` も値を保持するだけでフォーカスを要求しない
  （要求するのはプレイヤーの再生開始時のみ）。そのため端末内蔵 TTS 経路では
  `duckOthers` を指定してもダッキングが一度も発生していなかった。
- デグレは PR [#6453](https://github.com/TrainLCD/MobileApp/pull/6453)（v10.11.0）。
  それ以前は合成済み音声を `expo-audio` のプレイヤーで再生していたため、プレイヤーが
  フォーカスを要求し結果としてダッキングが効いていた。端末内蔵 TTS へ置き換えた際に
  プレイヤーが経路から外れ、ダッキングだけが落ちた。
- 発話中だけフォーカスを保持する Android 専用ローカル Expo モジュール
  `modules/audio-focus` を追加し、`useNativeSpeechEngine` が発話の直前・直後に
  取得・返却するようにした。iOS は従来どおり `AVAudioSession` のカテゴリオプションで
  完結するため、モジュールは autolink されず何もしない。
- **ネイティブモジュールの追加を含むため、反映にはネイティブビルドが必要**で
  OTA アップデートでは配信されない。

### 検証結果

- `npm run lint` — 成功
- `npm test` — 成功
- `npm run typecheck` — 成功

### 未検証

上記は JavaScript 側のチェックのみで、ネイティブ側は未検証。

- Android SDK を用いた Kotlin のコンパイル確認（作業環境に Android SDK が無いため未実施）。
  最初の検証は canary のネイティブビルドになる。
- Android 実機での動作確認（音楽再生中にアナウンスで他アプリの音量が下がり、
  読み上げ終了後に戻るか）。

## 2026-08-26 — Expo SDK 57 系の依存を推奨バージョンへ更新

対象バージョン: v10.13.1 / PR [#6720](https://github.com/TrainLCD/MobileApp/pull/6720)

### 内容

- `npx expo install --fix` により Expo SDK 57 系 16 パッケージを推奨バージョンへ更新
  （`expo` 57.0.12 → 57.0.16、`expo-location` 57.0.9 → 57.0.13、
  `expo-notifications` 57.0.10 → 57.0.14 ほか）。
- `expo-task-manager` が 57.0.9 → 57.0.13 に上がり `patch-package` のパッチが競合したため、
  57.0.13 上でパッチを再生成（`patches/expo-task-manager+57.0.13.patch`）。
  あわせてパッチの適用範囲を **API 31+ の 1 分岐のみ** に縮小した。
- **API 28–30 分岐は上流 57.0.13 の実装に戻した**（`setImportantWhileForeground(true)` +
  `setOverrideDeadline(DEFAULT_OVERRIDE_DEADLINE)`）。旧パッチがこの分岐を置き換えていたのは、
  57.0.9 では `setImportantWhileForeground(true)` が単独で置かれており、一部 OEM の
  `JobInfo.Builder` バリデータが制約なしと判定して `IllegalArgumentException` を投げたため。
  57.0.13 は上流が late constraint である `setOverrideDeadline` を追加したことでこの原因が
  解消しており、パッチを維持する理由がなくなった。上流に戻したことで、前面実行時の
  優先度ヒントと Doze 緩和の効果が復活する。
- **API 31+ 分岐のパッチは維持**（`setExpedited(true)` → `setMinimumLatency(0)` +
  `setOverrideDeadline(DEFAULT_OVERRIDE_DEADLINE)`）。上流は未修正で、Android 14+/16 での
  `JobInfo.Builder.build()` クラッシュ要因が残っているため。この分岐の挙動は従来の
  出荷状態と同一で、この更新による変更はない。
- API 31+ 分岐のトレードオフ（従来からの継続であり、この更新で新たに生じたものではない）:
  expedited job を使わないため実行優先度が上流素の状態より低い。JS 側の
  `watchPositionAsync` バイパスは `NEEDS_JOBSCHEDULER_BYPASS`（`src/constants/native.ts`）で
  API 36+ に限定されているため、**API 31–35 ではこのバイパスによる補償が効かない**。
  当該レンジではフォアグラウンド位置情報サービスによるプロセス維持のみが緩和策で、
  Doze 下で JS 配信が遅延する可能性がある。パッチ内コメントにも同旨を明記した。

### 検証結果

```text
npx expo-doctor    → 20/20 checks passed. No issues detected!
npx expo install --check → Dependencies are up to date
npm ci             → patches/ 配下 5 件すべて適用
npm run lint       → Checked 668 files, 指摘なし
npm run typecheck  → エラーなし
npm test           → Test Suites: 236 passed / Tests: 2540 passed
```

### 未検証・申し送り

- **TODO（担当: @TinyKitten）: API 28–30 の実機／エミュレータ回帰確認。**
  この更新で `createJobInfo` の API 28–30 分岐が上流実装
  （`setImportantWhileForeground(true)` と `setOverrideDeadline` の併用）に戻り、
  旧パッチの `setMinimumLatency(0)` と `setOverrideDeadline` の併用から
  実挙動が変わる。自動テストを追加していない理由は、対象が `node_modules` 配下の
  Java コードで `patch-package` 適用後にのみ存在し、Jest からは到達できないため
  （Android の instrumentation テスト基盤はこのリポジトリに未整備）。上流が
  late constraint を設定済みなので「制約なし」例外の条件は成立せず、旧パッチが
  対処していたクラッシュは再発しない見込みだが、Android 9–11 実機での
  バックグラウンド位置情報の配信を一度確認したい。
- API 31+ 分岐は挙動を変更していないため、この更新に起因する回帰確認は不要。
  ただし expedited job を使わない現行方針を API 36+ 限定に絞り込むかどうかは、
  本番 Sentry での Android 12–15 の `IllegalArgumentException` 発生実績を確認したうえで
  別途判断する（本更新のスコープ外）。
- `expo install --fix` は最後に `expo-build-properties` を `app.config.ts` の
  `plugins` へ自動追記できず非ゼロ終了する。`app.config.ts` が dynamic config かつ
  元から当該 plugin を登録していない既存の状態に起因するため、この更新では対応していない。
