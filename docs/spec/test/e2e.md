# E2E テスト仕様(WIP)

[Maestro](https://maestro.mobile.dev/)を使った E2E テストについて仕様まとめ

## testID 命名規則

### ループ外

`src/test/e2e.ts`を参照して**ハードコードはしない**

### ループ内

- `Station`
  - **駅単体:** `station_{駅ID}`
  - **駅グループ:** `station_group_{駅GID}`
- `Line`
  - **路線:** `line_{路線ID}`
- `TrainType`
  - **種別:** `train_type_{種別ID}`
- `Route`
  - **経路:** `route_{経路ID}`
