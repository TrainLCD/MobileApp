import { useCallback, useRef } from "react";

type TTSCacheData = { text: string; path: string };

type TTSCache = {
	id: string;
	en: TTSCacheData;
	ja: TTSCacheData;
};

export const useTTSCache = () => {
	const cacheArray = useRef<TTSCache[]>([]);

	const store = useCallback(
		(id: string, ja: TTSCacheData, en: TTSCacheData) => {
			cacheArray.current = [
				...cacheArray.current,
				{
					id,
					en,
					ja,
				},
			];

			if (process.env.NODE_ENV === "development") {
				console.log("Stored into storage: ", id);
			}
		},
		[],
	);

	const getByText = useCallback((text: string): TTSCache | null => {
		const cache: TTSCache | null =
			cacheArray.current.find((item) => item.ja.text === text) ?? null;

		if (process.env.NODE_ENV === "development") {
			if (cache) {
				console.log("Found in cache: ", cache.id);
			} else {
				console.log("Not found in cache: ", text);
			}
		}

		return cache;
	}, []);

	const clearCache = useCallback(async () => {
		cacheArray.current = [];
	}, []);

	return { store, getByText, clearCache };
};
