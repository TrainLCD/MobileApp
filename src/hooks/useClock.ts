import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

const formatTwoDigits = (n: number): string =>
  n < 10 ? `0${n}` : n.toString();

export const useClock = (): [string, string] => {
  const [hours, setHours] = useState('00');
  const [minutes, setMinutes] = useState('00');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateTime = useCallback((): void => {
    const date = new Date();
    setHours(formatTwoDigits(date.getHours()));
    setMinutes(formatTwoDigits(date.getMinutes()));
  }, []);

  useEffect(() => {
    const clearTimers = (): void => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    // 次の正分まで待ってから60秒間隔で更新する
    // 1秒ごとにJSスレッドを起こさないことで電池消費とCPUコストを下げる
    const scheduleNextTick = (): void => {
      const now = new Date();
      const msUntilNextMinute =
        (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

      timeoutRef.current = setTimeout(() => {
        updateTime();
        intervalRef.current = setInterval(updateTime, 60_000);
      }, msUntilNextMinute);
    };

    updateTime();
    scheduleNextTick();

    // バックグラウンドから復帰した直後は分が古いままになりうるので即同期する
    const handleAppStateChange = (state: AppStateStatus): void => {
      if (state === 'active') {
        clearTimers();
        updateTime();
        scheduleNextTick();
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );

    return () => {
      clearTimers();
      subscription.remove();
    };
  }, [updateTime]);

  return [hours, minutes];
};
