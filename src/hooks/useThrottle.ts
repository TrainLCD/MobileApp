import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';

const useThrottle = <T>(
  initValue: T,
  ms = 1000
): [T, Dispatch<SetStateAction<T>>] => {
  const [currentValue, setCurrentValue] = useState(initValue);
  const [lastValue, setLastValue] = useState(initValue);
  const latestValue = useRef(initValue);
  const timeoutId = useRef<NodeJS.Timeout | null>();

  useEffect(() => {
    if (!timeoutId.current) {
      setLastValue(currentValue);
      timeoutId.current = setTimeout(() => {
        if (lastValue !== latestValue.current) {
          setLastValue(latestValue.current);
        }
        timeoutId.current = null;
      }, ms);
    } else {
      latestValue.current = currentValue;
    }
  }, [lastValue, currentValue, ms]);

  return [lastValue, setCurrentValue];
};

export default useThrottle;
