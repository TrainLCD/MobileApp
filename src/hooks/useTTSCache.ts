import { useCallback, useRef } from "react";

type TtsCacheData = { text: string; path: string };

type TtsCache = {
	id: string;
	en: TtsCacheData;
	ja: TtsCacheData;
};

export const useTTSCache = () => {
	const cacheArray = useRef<TtsCache[]>([]);

	const store = useCallback(
		(id: string, ja: TtsCacheData, en: TtsCacheData) => {
			cacheArray.current = [
				...cacheArray.current,
				{
					id,
					en,
					ja,
				},
			];

			if (process.env.NODE_ENV === "development") {
			}
		},
		[],
	);

	const getByText = useCallback((text: string): TtsCache | null => {
		const cache: TtsCache | null =
			cacheArray.current.find((item) => item.ja.text === text) ?? null;

		if (process.env.NODE_ENV === "development") {
			if (cache) {
			} else {
			}
		}

		return cache;
	}, []);

	const clearCache = useCallback(async () => {
		cacheArray.current = [];
	}, []);

	return { store, getByText, clearCache };
};
