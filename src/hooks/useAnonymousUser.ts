import { useEffect, useRef } from 'react';
import { getInstallId } from '../lib/installId';
import type { AppUser } from '../store/atoms/auth';

/**
 * Jotaiが使えない環境の時にもユーザーを持ちたい場合に使います。基本的に `useCachedAnonymousUser` を使ってください。
 */
export const useAnonymousUser = (): AppUser | null => {
  const userRef = useRef<AppUser | null>(null);
  useEffect(() => {
    let active = true;
    getInstallId()
      .then((uid) => {
        if (active) {
          userRef.current = { uid };
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  return userRef.current;
};
