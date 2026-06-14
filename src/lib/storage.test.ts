import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '~/constants/storage';
import { migrateFromAsyncStorage, storage } from './storage';

const MIGRATION_COMPLETED_KEY = '@TrainLCD:mmkvMigrationCompleted';

describe('migrateFromAsyncStorage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('AsyncStorageの既存値をMMKVへコピーし、完了フラグを立てて旧データを削除する', async () => {
    (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce(
      Object.values(STORAGE_KEYS).map((key) => [
        key,
        key === STORAGE_KEYS.THEME_PREFERENCE ? 'TOKYO_METRO' : null,
      ])
    );

    await migrateFromAsyncStorage();

    expect(storage.getString(STORAGE_KEYS.THEME_PREFERENCE)).toBe(
      'TOKYO_METRO'
    );
    // null だったキーは書き込まれない
    expect(storage.contains(STORAGE_KEYS.SPEECH_ENABLED)).toBe(false);
    expect(storage.getBoolean(MIGRATION_COMPLETED_KEY)).toBe(true);
    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(
      Object.values(STORAGE_KEYS)
    );
  });

  it('MMKV側に既に値がある場合は上書きしない', async () => {
    storage.set(STORAGE_KEYS.THEME_PREFERENCE, 'YAMANOTE');
    (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce(
      Object.values(STORAGE_KEYS).map((key) => [
        key,
        key === STORAGE_KEYS.THEME_PREFERENCE ? 'TOKYO_METRO' : null,
      ])
    );

    await migrateFromAsyncStorage();

    expect(storage.getString(STORAGE_KEYS.THEME_PREFERENCE)).toBe('YAMANOTE');
  });

  it('移行完了済みの場合は何もしない', async () => {
    storage.set(MIGRATION_COMPLETED_KEY, true);

    await migrateFromAsyncStorage();

    expect(AsyncStorage.multiGet).not.toHaveBeenCalled();
    expect(AsyncStorage.multiRemove).not.toHaveBeenCalled();
  });
});
