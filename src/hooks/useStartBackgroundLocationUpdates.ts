import * as Location from 'expo-location';
import { useAtomValue } from 'jotai';
import { useEffect } from 'react';
import { store } from '~/store';
import {
  backgroundLocationTrackingAtom,
  setLocation,
} from '~/store/atoms/location';
import navigationState from '~/store/atoms/navigation';
import {
  LOCATION_START_MAX_RETRIES,
  LOCATION_START_RETRY_BASE_DELAY_MS,
  LOCATION_TASK_NAME,
  LOCATION_TASK_OPTIONS,
} from '../constants';
import { translate } from '../translation';
import { useLocationPermissionsGranted } from './useLocationPermissionsGranted';

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export const useStartBackgroundLocationUpdates = () => {
  const bgPermGranted = useLocationPermissionsGranted();
  const { autoModeEnabled } = useAtomValue(navigationState);

  useEffect(() => {
    if (autoModeEnabled || !bgPermGranted) {
      return;
    }

    let cancelled = false;

    (async () => {
      for (let attempt = 0; attempt <= LOCATION_START_MAX_RETRIES; attempt++) {
        if (cancelled) {
          return;
        }

        try {
          // Android/iOS共通でexpo-locationのフォアグラウンドサービスを使用
          // Androidではフォアグラウンドサービスにより、バックグラウンドでの位置情報更新の
          // スロットリングを回避し、アプリプロセスの生存を維持する（Android 8以降の制約）
          // ただしexpo-task-managerのJS配信はJobScheduler経由のため、
          // Android 16のクォータ制限の影響を受ける点に注意
          await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
            ...LOCATION_TASK_OPTIONS,
            // NOTE: マップマッチが勝手に行われると電車での経路と大きく異なることがあるはずなので
            // OtherNavigationは必須
            activityType: Location.ActivityType.OtherNavigation,
            showsBackgroundLocationIndicator: true,
            foregroundService: {
              notificationTitle: translate('bgAlertTitle'),
              notificationBody: translate('bgAlertContent'),
              killServiceOnDestroy: false,
            },
          });
          // クリーンアップがstartの完了前に実行された場合、
          // stopが先に走り開始済みの更新が残るため、ここで再度停止する
          if (cancelled) {
            try {
              await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
            } catch (stopError) {
              console.warn(
                'バックグラウンド位置情報の更新停止に失敗しました:',
                stopError
              );
            }
          } else {
            store.set(backgroundLocationTrackingAtom, true);
          }
          return;
        } catch (error) {
          if (attempt < LOCATION_START_MAX_RETRIES) {
            const delay = LOCATION_START_RETRY_BASE_DELAY_MS * 2 ** attempt;
            console.warn(
              `バックグラウンド位置情報の更新開始に失敗しました（リトライ ${attempt + 1}/${LOCATION_START_MAX_RETRIES}）:`,
              error
            );
            await wait(delay);
          } else {
            console.warn(
              'バックグラウンド位置情報の更新開始に失敗しました（リトライ上限到達）:',
              error
            );
          }
        }
      }
    })();

    return () => {
      cancelled = true;
      store.set(backgroundLocationTrackingAtom, false);
      Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch((error) => {
        console.warn(
          'バックグラウンド位置情報の更新停止に失敗しました:',
          error
        );
      });
    };
  }, [autoModeEnabled, bgPermGranted]);

  useEffect(() => {
    let watchPositionSub: Location.LocationSubscription | null = null;
    let cancelled = false;

    if (autoModeEnabled || bgPermGranted) {
      return;
    }

    (async () => {
      try {
        const sub = await Location.watchPositionAsync(
          LOCATION_TASK_OPTIONS,
          setLocation
        );
        if (cancelled) {
          sub.remove();
        } else {
          watchPositionSub = sub;
        }
      } catch (error) {
        console.warn('位置情報の監視開始に失敗しました:', error);
      }
    })();

    return () => {
      cancelled = true;
      watchPositionSub?.remove();
    };
  }, [autoModeEnabled, bgPermGranted]);
};
