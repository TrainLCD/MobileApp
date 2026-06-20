import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

// 端末ごとに安定した匿名 ID。Firebase 匿名認証の uid を置き換える。
// SecureStore に永続化し、再インストールで失われる挙動は匿名認証と同等。
const INSTALL_ID_KEY = 'trainlcd_install_id';

let cachedInstallId: string | null = null;

export const getInstallId = async (): Promise<string> => {
  if (cachedInstallId) {
    return cachedInstallId;
  }

  const stored = await SecureStore.getItemAsync(INSTALL_ID_KEY);
  if (stored) {
    cachedInstallId = stored;
    return stored;
  }

  const generated = Crypto.randomUUID();
  await SecureStore.setItemAsync(INSTALL_ID_KEY, generated);
  cachedInstallId = generated;
  return generated;
};
