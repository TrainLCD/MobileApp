# 変更履歴

依存パッケージの更新や Expo SDK の移行など、アプリ全体に影響する変更の記録。
CLAUDE.md「Security & Configuration Guardrails」に従い、依存更新後に実施した
`expo-doctor` / `npm run lint` / `npm test` / `npm run typecheck` の結果をここに残す。

新しいエントリを上に追加する。

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
