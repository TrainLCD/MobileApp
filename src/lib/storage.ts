import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMMKV } from 'react-native-mmkv';
import { STORAGE_KEYS } from '~/constants/storage';

/**
 * アプリ全体で共有する MMKV インスタンス。
 *
 * AsyncStorage と異なり同期 API のため、初回レンダー前に値を確定でき、
 * effect 内の非同期読み取りに起因するローディング状態やレースを排除できる。
 * 値はすべて AsyncStorage 時代と同じ文字列表現で保存する（boolean は 'true'）。
 * Jest 環境では createMMKV が自動的にインメモリ実装を返す。
 */
export const storage = createMMKV();

const MIGRATION_COMPLETED_KEY = '@TrainLCD:mmkvMigrationCompleted';

/**
 * AsyncStorage に保存された既存ユーザーの設定値を MMKV へ一度だけ移行する。
 *
 * 完了フラグは MMKV 側に持つため再実行は no-op。コピー後に AsyncStorage 側の
 * キーは削除する（旧バージョンへのロールバック時は初期値に戻る点に注意）。
 * 移行が終わるまで storage の読み取りは旧値を返せないので、呼び出し側は
 * この Promise の解決を待ってから画面を描画すること。
 */
export const migrateFromAsyncStorage = async (): Promise<void> => {
  if (storage.getBoolean(MIGRATION_COMPLETED_KEY)) {
    return;
  }

  const keys = Object.values(STORAGE_KEYS);
  const entries = await AsyncStorage.multiGet(keys);
  for (const [key, value] of entries) {
    if (value !== null && !storage.contains(key)) {
      storage.set(key, value);
    }
  }

  storage.set(MIGRATION_COMPLETED_KEY, true);
  await AsyncStorage.multiRemove(keys);
};
