import AsyncStorage from '@react-native-async-storage/async-storage';
import { Effect, pipe } from 'effect';
import { useForegroundPermissions } from 'expo-location';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { isClip } from 'react-native-app-clip';
import { StopCondition } from '~/@types/graphql';
import { ASYNC_STORAGE_KEYS } from '~/constants';
import navigationState from '~/store/atoms/navigation';
import tuningState from '~/store/atoms/tuning';
import stationState from '../store/atoms/station';
import { isJapanese, translate } from '../translation';
import { useBadAccuracy } from './useBadAccuracy';
import { useConnectivity } from './useConnectivity';
import { useLocationPermissionsGranted } from './useLocationPermissionsGranted';

const WARNING_PANEL_LEVEL = {
  URGENT: 'URGENT',
  WARNING: 'WARNING',
  INFO: 'INFO',
} as const;

export const useWarningInfo = () => {
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [longPressNoticeDismissed, setLongPressNoticeDismissed] =
    useState(true);
  const [
    isAlwaysPermissionNotGrantedDismissed,
    setIsAlwaysPermissionNotGrantedDismissed,
  ] = useState(true);
  const [screenshotTaken, setScreenshotTaken] = useState(false);

  const { selectedBound } = useAtomValue(stationState);
  const { autoModeEnabled, leftStations } = useAtomValue(navigationState);
  const { untouchableModeEnabled } = useAtomValue(tuningState);

  const badAccuracy = useBadAccuracy();
  const [fgPermStatus] = useForegroundPermissions();
  const bgPermGranted = useLocationPermissionsGranted();

  const isInternetAvailable = useConnectivity();

  const passStations = useMemo(
    () =>
      leftStations
        .slice(0, 8)
        .filter(
          (s) =>
            s.stopCondition === StopCondition.Partial ||
            s.stopCondition === StopCondition.PartialStop
        ),
    [leftStations]
  );

  useEffect(() => {
    if (autoModeEnabled) {
      setWarningDismissed(false);
    }
  }, [autoModeEnabled]);

  useEffect(() => {
    if (!isInternetAvailable) {
      setWarningDismissed(false);
    }
  }, [isInternetAvailable]);

  useEffect(() => {
    pipe(
      Effect.promise(() =>
        AsyncStorage.getItem(ASYNC_STORAGE_KEYS.LONG_PRESS_NOTICE_DISMISSED)
      ),
      Effect.andThen((longPressNoticeDismissed) => {
        setLongPressNoticeDismissed(longPressNoticeDismissed === 'true');
      }),
      Effect.runPromise
    );

    pipe(
      Effect.promise(() =>
        AsyncStorage.getItem(
          ASYNC_STORAGE_KEYS.ALWAYS_PERMISSION_NOT_GRANTED_WARNING_DISMISSED
        )
      ),
      Effect.andThen((isAlwaysPermissionNotGrantedDismissed) => {
        setIsAlwaysPermissionNotGrantedDismissed(
          isAlwaysPermissionNotGrantedDismissed === 'true'
        );
      }),
      Effect.runPromise
    );
  }, []);

  const warningInfo = useMemo(() => {
    if (warningDismissed) {
      return null;
    }

    // NOTE: フォアグラウンドも許可しない設定の場合はそもそもオートモード前提で使われていると思うので警告は不要
    if (fgPermStatus?.granted) {
      if (
        !bgPermGranted &&
        !isAlwaysPermissionNotGrantedDismissed &&
        !!selectedBound &&
        !isClip()
      ) {
        return {
          level: WARNING_PANEL_LEVEL.WARNING,
          text: translate('alwaysPermissionNotGrantedPanelText'),
        };
      }
    }

    if (!longPressNoticeDismissed && selectedBound) {
      return {
        level: WARNING_PANEL_LEVEL.INFO,
        text: translate('longPressNotice'),
      };
    }

    if (autoModeEnabled) {
      return {
        level: WARNING_PANEL_LEVEL.INFO,
        text: translate('autoModeInProgress'),
      };
    }

    if (!isInternetAvailable && selectedBound) {
      return {
        level: WARNING_PANEL_LEVEL.WARNING,
        text: translate('offlineWarningText'),
      };
    }

    if (badAccuracy) {
      return {
        level: WARNING_PANEL_LEVEL.URGENT,
        text: translate('badAccuracy'),
      };
    }
    if (passStations.length > 0 && selectedBound) {
      return {
        level: WARNING_PANEL_LEVEL.INFO,
        text: translate('partiallyPassPanelNotice', {
          stations: isJapanese
            ? passStations.map((s) => s.name).join('、')
            : ` ${passStations.map((s) => s.nameRoman).join(', ')}`,
        }),
      };
    }

    if (screenshotTaken) {
      return {
        level: WARNING_PANEL_LEVEL.INFO,
        text: translate('shareNotice'),
      };
    }

    if (untouchableModeEnabled) {
      return {
        level: WARNING_PANEL_LEVEL.INFO,
        text: translate('untouchableModeEnabledNotice'),
      };
    }
    return null;
  }, [
    autoModeEnabled,
    badAccuracy,
    bgPermGranted,
    fgPermStatus?.granted,
    isAlwaysPermissionNotGrantedDismissed,
    isInternetAvailable,
    longPressNoticeDismissed,
    screenshotTaken,
    selectedBound,
    warningDismissed,
    untouchableModeEnabled,
    passStations,
  ]);

  const clearWarningInfo = useCallback(() => {
    setWarningDismissed(true);
    setScreenshotTaken(false);

    if (!longPressNoticeDismissed) {
      pipe(
        Effect.promise(() =>
          AsyncStorage.setItem(
            ASYNC_STORAGE_KEYS.LONG_PRESS_NOTICE_DISMISSED,
            'true'
          )
        ),
        Effect.runPromise
      );
    }
  }, [longPressNoticeDismissed]);

  return { warningInfo, clearWarningInfo };
};
