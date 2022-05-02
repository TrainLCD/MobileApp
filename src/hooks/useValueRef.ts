import { MutableRefObject, useEffect, useRef } from 'react';

function useValueRef<T>(value: T): MutableRefObject<T> {
  const ref = useRef<T>(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

export default useValueRef;
