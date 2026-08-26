# 変更履歴

依存パッケージの更新や Expo SDK の移行など、アプリ全体に影響する変更の記録。
CLAUDE.md「Security & Configuration Guardrails」に従い、依存更新後に実施した
`expo-doctor` / `npm run lint` / `npm test` / `npm run typecheck` の結果をここに残す。

新しいエントリを上に追加する。

## 2026-08-26 — Expo SDK 57 系の依存を推奨バージョンへ更新

対象バージョン: v10.13.1 / PR [#6720](https://github.com/TrainLCD/MobileApp/pull/6720)

### 内容

- `npx expo install --fix` により Expo SDK 57 系 16 パッケージを推奨バージョンへ更新
  （`expo` 57.0.12 → 57.0.16、`expo-location` 57.0.9 → 57.0.13、
  `expo-notifications` 57.0.10 → 57.0.14 ほか）。
- `expo-task-manager` が 57.0.9 → 57.0.13 に上がり `patch-package` のパッチが競合したため、
  57.0.13 上でパッチを再生成（`patches/expo-task-manager+57.0.13.patch`）。
  **パッチ適用後の `createJobInfo` は 3 分岐すべて `setMinimumLatency(0)` +
  `setOverrideDeadline(DEFAULT_OVERRIDE_DEADLINE)` となり、57.0.9 にパッチを当てていた
  従来の出荷状態とバイト単位で同一。** この更新でアプリの実挙動は変わっていない。
  なおパッチファイルの差分行が変化しているのは、上流 57.0.13 側のベースラインが
  変わったためであり、パッチ適用後の結果が変わったわけではない。
- 上流 57.0.13 は API 28–30 分岐に `setOverrideDeadline` を追加済みだが、API 31+ の
  `setExpedited(true)` 単独による `JobInfo.Builder.build()` の `IllegalArgumentException`
  （Android 14+ でのクラッシュ要因）は未修正のため、パッチは引き続き必要。
- パッチが上流素の状態に対して持つトレードオフ（従来からの継続であり、この更新で
  新たに生じたものではない）: API 31+ で expedited job を使わないため、Android 12/13 での
  実行優先度は上流素の状態より低い。これは前面のフォアグラウンド位置情報サービスが
  プロセスを維持することと、JS 側の `watchPositionAsync` 経路で補われる。

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

- `expo-task-manager` のパッチは Android ネイティブコードのため、実機／エミュレータでの
  バックグラウンド位置情報動作は未確認。
- `expo install --fix` は最後に `expo-build-properties` を `app.config.ts` の
  `plugins` へ自動追記できず非ゼロ終了する。`app.config.ts` が dynamic config かつ
  元から当該 plugin を登録していない既存の状態に起因するため、この更新では対応していない。
