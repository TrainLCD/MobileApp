import { useCallback, useState } from 'react';
import { useInterval } from './useInterval';

const useClock = (): [string, string] => {
  const [hours, setHours] = useState('00');
  const [minutes, setMinutes] = useState('00');

  const updateTime = useCallback((): void => {
    const date = new Date();
    const h =
      date.getHours() < 10 ? `0${date.getHours()}` : date.getHours().toString();
    const m =
      date.getMinutes() < 10
        ? `0${date.getMinutes()}`
        : date.getMinutes().toString();
    setHours(h);
    setMinutes(m);
  }, []);

  useInterval(updateTime, 1000);

  return [hours, minutes];
};

export default useClock;
