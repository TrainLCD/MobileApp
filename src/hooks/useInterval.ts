import { useCallback, useEffect, useRef, useState } from 'react';

export const useInterval = (
  handler: () => void,
  timeout: number
): {
  isPausing: boolean;
  pause: () => void;
} => {
  const intervalId = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isPausing, setIsPausing] = useState(false);

  // handlerをrefに保持することで、呼び出し元のuseCallback依存変化による
  // setInterval / clearInterval の再生成を抑制する
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (isPausing) {
      return () => undefined;
    }

    const id = setInterval(() => {
      handlerRef.current();
    }, timeout);
    intervalId.current = id;

    return () => clearInterval(id);
  }, [isPausing, timeout]);

  const pause = useCallback(() => {
    setIsPausing(true);
    const id = setTimeout(() => {
      setIsPausing(false);
    }, timeout);

    return () => clearTimeout(id);
  }, [timeout]);

  return { isPausing, pause };
};
