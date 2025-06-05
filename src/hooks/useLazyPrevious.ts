import { useEffect, useState } from 'react';

export function useLazyPrevious<T>(value: T, shouldUpdate: boolean): T {
  const [val, setVal] = useState<T>(value);
  useEffect(() => {
    if (shouldUpdate && val !== value) {
      setVal(value);
    }
  }, [shouldUpdate, val, value]);
  return val;
}
