import { useForegroundPermissions } from 'expo-location';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { isClip } from 'react-native-app-clip';
import { StopCondition } from '~/@types/graphql';
import { STORAGE_KEYS } from '~/constants';
import { storage } from '~/lib/storage';
import {
  autoModeEnabledAtom,
  leftStationsAtom,
} from '~/store/atoms/navigation';
import tuningState from '~/store/atoms/tuning';
import { selectedBoundAtom } from '../store/atoms/station';
import { isJapanese, translate } from '../translation';
import { useBadAccuracy } from './useBadAccuracy';
import { useConnectivity } from './useConnectivity';
import { useLocationPermissionsGranted } from './useLocationPermissionsGranted';
import { useWrongDirectionDetector } from './useWrongDirectionDetector';

const WARNING_PANEL_LEVEL = {
  URGENT: 'URGENT',
  WARNING: 'WARNING',
  INFO: 'INFO',
} as const;

export const useWarningInfo = () => {
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [longPressNoticeDismissed, setLongPressNoticeDismissed] = useState(
    () => storage.getString(STORAGE_KEYS.LONG_PRESS_NOTICE_DISMISSED) === 'true'
  );
  const [isAlwaysPermissionNotGrantedDismissed] = useState(
    () =>
      storage.getString(
        STORAGE_KEYS.ALWAYS_PERMISSION_NOT_GRANTED_WARNING_DISMISSED
      ) === 'true'
  );
  const [screenshotTaken, setScreenshotTaken] = useState(false);

  const selectedBound = useAtomValue(selectedBoundAtom);
  const autoModeEnabled = useAtomValue(autoModeEnabledAtom);
  const leftStations = useAtomValue(leftStationsAtom);
  const { untouchableModeEnabled } = useAtomValue(tuningState);

  const badAccuracy = useBadAccuracy();
  const { isWrongDirection, isLoopLineWrongDirection } =
    useWrongDirectionDetector();
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

    if (isWrongDirection) {
      return {
        level: WARNING_PANEL_LEVEL.URGENT,
        text: translate('wrongDirectionWarning'),
      };
    }
    if (isLoopLineWrongDirection) {
      return {
        level: WARNING_PANEL_LEVEL.WARNING,
        text: translate('wrongDirectionLoopLineWarning'),
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
    isLoopLineWrongDirection,
    isWrongDirection,
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
      setLongPressNoticeDismissed(true);
      storage.set(STORAGE_KEYS.LONG_PRESS_NOTICE_DISMISSED, 'true');
    }
  }, [longPressNoticeDismissed]);

  return { warningInfo, clearWarningInfo };
};
