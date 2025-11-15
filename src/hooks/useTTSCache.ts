import { useCallback, useRef } from 'react';

type TTSCacheData = { text: string; path: string };

type TTSCache = {
  id: string;
  en: TTSCacheData;
  ja: TTSCacheData;
};

// キャッシュの最大数を制限してメモリリークを防ぐ
const MAX_CACHE_SIZE = 50;

export const useTTSCache = () => {
  const cacheArray = useRef<TTSCache[]>([]);

  const store = useCallback(
    (id: string, ja: TTSCacheData, en: TTSCacheData) => {
      // 新しいキャッシュエントリを追加
      cacheArray.current = [
        ...cacheArray.current,
        {
          id,
          en,
          ja,
        },
      ];

      // キャッシュサイズが上限を超えたら古いエントリを削除
      if (cacheArray.current.length > MAX_CACHE_SIZE) {
        const removed = cacheArray.current.slice(
          0,
          cacheArray.current.length - MAX_CACHE_SIZE
        );
        cacheArray.current = cacheArray.current.slice(-MAX_CACHE_SIZE);

        if (process.env.NODE_ENV === 'development') {
          console.log(
            `Cache size limit reached. Removed ${removed.length} old entries.`
          );
        }
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('Stored into storage: ', id);
      }
    },
    []
  );

  const getByText = useCallback((text: string): TTSCache | null => {
    const cache: TTSCache | null =
      cacheArray.current.find((item) => item.ja.text === text) ?? null;

    if (process.env.NODE_ENV === 'development') {
      if (cache) {
        console.log('Found in cache: ', cache.id);
      } else {
        console.log('Not found in cache: ', text);
      }
    }

    return cache;
  }, []);

  const clearCache = useCallback(async () => {
    cacheArray.current = [];
  }, []);

  return { store, getByText, clearCache };
};