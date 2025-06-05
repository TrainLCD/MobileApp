import { type MutableRefObject, useEffect, useRef } from 'react';

export function useValueRef<T>(value: T): MutableRefObject<T> {
  const ref = useRef<T>(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}
