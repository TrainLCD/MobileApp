import { useAtom } from 'jotai';
import { useEffect } from 'react';
import { getInstallId } from '../lib/installId';
import authState, { type AppUser } from '../store/atoms/auth';

export const useCachedInitAnonymousUser = (): AppUser | null => {
  const [{ user }, setUser] = useAtom(authState);

  useEffect(() => {
    // アプリ実行中に匿名ユーザーが変わることはないので、キャッシュしている値を使用し追加で取得しない
    if (user) {
      return () => undefined;
    }

    let active = true;
    getInstallId()
      .then((uid) => {
        if (active) {
          setUser((prev) => ({ ...prev, user: { uid } }));
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [setUser, user]);

  return user;
};
