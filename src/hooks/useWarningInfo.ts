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

// タップして閉じた警告を種別ごとに記録するためのキー。
// 単一の真偽値で「閉じた」を管理していると、別の警告を出すためのリセットが
// 閉じたはずの警告まで復活させてしまう(例: 一時的なオフライン検知のたびに
// オートモード中の常設通知が再表示される)ため、種別単位で保持する。
const WARNING_KIND = {
  ALWAYS_PERMISSION_NOT_GRANTED: 'ALWAYS_PERMISSION_NOT_GRANTED',
  LONG_PRESS_NOTICE: 'LONG_PRESS_NOTICE',
  AUTO_MODE: 'AUTO_MODE',
  OFFLINE: 'OFFLINE',
  WRONG_DIRECTION: 'WRONG_DIRECTION',
  WRONG_DIRECTION_LOOP_LINE: 'WRONG_DIRECTION_LOOP_LINE',
  BAD_ACCURACY: 'BAD_ACCURACY',
  PARTIALLY_PASS: 'PARTIALLY_PASS',
  SHARE_NOTICE: 'SHARE_NOTICE',
  UNTOUCHABLE_MODE: 'UNTOUCHABLE_MODE',
} as const;

type WarningKind = (typeof WARNING_KIND)[keyof typeof WARNING_KIND];
type WarningLevel =
  (typeof WARNING_PANEL_LEVEL)[keyof typeof WARNING_PANEL_LEVEL];

type WarningCandidate = {
  kind: WarningKind;
  level: WarningLevel;
  // 表示対象に選ばれた1件だけ翻訳を引くための遅延評価
  getText: () => string;
};

export const useWarningInfo = () => {
  const [dismissedKinds, setDismissedKinds] = useState<readonly WarningKind[]>(
    []
  );
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

  // 現在成立している警告を優先度順に並べる。表示するのはこの中で
  // まだ閉じられていない先頭の1件。
  const candidates = useMemo<readonly WarningCandidate[]>(() => {
    const list: WarningCandidate[] = [];

    // NOTE: フォアグラウンドも許可しない設定の場合はそもそもオートモード前提で使われていると思うので警告は不要
    if (
      fgPermStatus?.granted &&
      !bgPermGranted &&
      !isAlwaysPermissionNotGrantedDismissed &&
      !!selectedBound &&
      !isClip()
    ) {
      list.push({
        kind: WARNING_KIND.ALWAYS_PERMISSION_NOT_GRANTED,
        level: WARNING_PANEL_LEVEL.WARNING,
        getText: () => translate('alwaysPermissionNotGrantedPanelText'),
      });
    }

    if (!longPressNoticeDismissed && selectedBound) {
      list.push({
        kind: WARNING_KIND.LONG_PRESS_NOTICE,
        level: WARNING_PANEL_LEVEL.INFO,
        getText: () => translate('longPressNotice'),
      });
    }

    if (autoModeEnabled) {
      list.push({
        kind: WARNING_KIND.AUTO_MODE,
        level: WARNING_PANEL_LEVEL.INFO,
        getText: () => translate('autoModeInProgress'),
      });
    }

    if (!isInternetAvailable && selectedBound) {
      list.push({
        kind: WARNING_KIND.OFFLINE,
        level: WARNING_PANEL_LEVEL.WARNING,
        getText: () => translate('offlineWarningText'),
      });
    }

    if (isWrongDirection) {
      list.push({
        kind: WARNING_KIND.WRONG_DIRECTION,
        level: WARNING_PANEL_LEVEL.URGENT,
        getText: () => translate('wrongDirectionWarning'),
      });
    }

    if (isLoopLineWrongDirection) {
      list.push({
        kind: WARNING_KIND.WRONG_DIRECTION_LOOP_LINE,
        level: WARNING_PANEL_LEVEL.WARNING,
        getText: () => translate('wrongDirectionLoopLineWarning'),
      });
    }

    if (badAccuracy) {
      list.push({
        kind: WARNING_KIND.BAD_ACCURACY,
        level: WARNING_PANEL_LEVEL.URGENT,
        getText: () => translate('badAccuracy'),
      });
    }

    if (passStations.length > 0 && selectedBound) {
      list.push({
        kind: WARNING_KIND.PARTIALLY_PASS,
        level: WARNING_PANEL_LEVEL.INFO,
        getText: () =>
          translate('partiallyPassPanelNotice', {
            stations: isJapanese
              ? passStations.map((s) => s.name).join('、')
              : ` ${passStations.map((s) => s.nameRoman).join(', ')}`,
          }),
      });
    }

    if (screenshotTaken) {
      list.push({
        kind: WARNING_KIND.SHARE_NOTICE,
        level: WARNING_PANEL_LEVEL.INFO,
        getText: () => translate('shareNotice'),
      });
    }

    if (untouchableModeEnabled) {
      list.push({
        kind: WARNING_KIND.UNTOUCHABLE_MODE,
        level: WARNING_PANEL_LEVEL.INFO,
        getText: () => translate('untouchableModeEnabledNotice'),
      });
    }

    return list;
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
    untouchableModeEnabled,
    passStations,
  ]);

  // 条件が解消された警告は「閉じた」記録を捨て、再発時に改めて表示できるようにする。
  // オートモードのように条件が継続する通知は記録が残り続けるため、一度閉じたら
  // オートモードを切り替え直すまで再表示されない。
  useEffect(() => {
    setDismissedKinds((prev) => {
      const next = prev.filter((kind) =>
        candidates.some((candidate) => candidate.kind === kind)
      );
      return next.length === prev.length ? prev : next;
    });
  }, [candidates]);

  const currentWarning = useMemo(
    () =>
      candidates.find(
        (candidate) => !dismissedKinds.includes(candidate.kind)
      ) ?? null,
    [candidates, dismissedKinds]
  );

  const warningInfo = useMemo(
    () =>
      currentWarning
        ? { level: currentWarning.level, text: currentWarning.getText() }
        : null,
    [currentWarning]
  );

  const clearWarningInfo = useCallback(() => {
    const dismissedKind = currentWarning?.kind;
    if (dismissedKind) {
      setDismissedKinds((prev) =>
        prev.includes(dismissedKind) ? prev : [...prev, dismissedKind]
      );
    }
    setScreenshotTaken(false);

    if (!longPressNoticeDismissed) {
      setLongPressNoticeDismissed(true);
      storage.set(STORAGE_KEYS.LONG_PRESS_NOTICE_DISMISSED, 'true');
    }
  }, [currentWarning, longPressNoticeDismissed]);

  return { warningInfo, clearWarningInfo };
};
