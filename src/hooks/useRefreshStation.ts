import * as Notifications from 'expo-notifications';
import isPointWithinRadius from 'geolib/es/isPointWithinRadius';
import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Station } from '~/@types/graphql';
import { ARRIVED_GRACE_PERIOD_MS, BAD_ACCURACY_THRESHOLD } from '~/constants';
import {
  getMaxPermitAccuracy,
  isEtaAssistEnabled,
  isForceNotArrivedOnLowAccuracyEnabled,
} from '~/lib/remoteConfig';
import { store } from '~/store';
import { etaFallbackActiveAtom, etaPhaseAtom } from '~/store/atoms/etaFallback';
import {
  locationAccuracyOutlierAtom,
  locationAtom,
} from '~/store/atoms/location';
import navigationState from '../store/atoms/navigation';
import notifyState from '../store/atoms/notify';
import stationState from '../store/atoms/station';
import { isJapanese, translate } from '../translation';
import getIsPass from '../utils/isPass';
import sendNotificationAsync from '../utils/native/ios/sensitiveNotificationMoudle';
import { useApproachingStation } from './useApproachingStation';
import { useCanGoForward } from './useCanGoForward';
import { useNearestStation } from './useNearestStation';
import { useNextStation } from './useNextStation';
import { useStationNumberIndexFunc } from './useStationNumberIndexFunc';
import { useThreshold } from './useThreshold';
import { useWrongDirectionDetector } from './useWrongDirectionDetector';

type NotifyType = 'ARRIVED' | 'APPROACHING';

// GPS精度に応じた閾値補正の上限(m)
const MAX_ACCURACY_BONUS = 150;
// ETA確認による到着圏緩和(R1)の補正上限(m)。GPSとETAの双方が同じ停車駅を
// 指すときに限り、粗い測位でも到着圏へ届くよう通常の上限(150m)より広げる。
const ETA_ARRIVED_BONUS_CAP = 500;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const useRefreshStation = (): void => {
  const setStation = useSetAtom(stationState);
  const setNavigation = useSetAtom(navigationState);
  const location = useAtomValue(locationAtom);
  const isAccuracyOutlier = useAtomValue(locationAccuracyOutlierAtom);
  // ETAフォールバック(R2)活性中は本フックの状態書き込みを停止し、ETA駆動と
  // 凍結座標基準の判定が同一atomを奪い合う2ライター競合を防ぐ。
  const etaFallbackActive = useAtomValue(etaFallbackActiveAtom);
  const latitude = location?.coords.latitude;
  const longitude = location?.coords.longitude;
  const accuracy = location?.coords.accuracy;

  const nextStation = useNextStation();
  const nextStationId = nextStation?.id ?? null;
  // 接近判定は最後に到着した駅起点の次駅ではなく、現在地起点で実際に接近して
  // いる停車駅を基準にすることで、到着取りこぼし等による次駅ずれを自己修復する。
  const approachingStation = useApproachingStation();
  const approachingNotifiedIdRef = useRef<number | null>(null);
  const arrivedNotifiedIdRef = useRef<number | null>(null);
  const lastArrivedTimeRef = useRef<number>(0);
  const lastArrivedStationIdRef = useRef<number | null>(null);
  const { targetStationIds, wrongDirectionNotifyEnabled } =
    useAtomValue(notifyState);

  const nearestStation = useNearestStation();
  const canGoForward = useCanGoForward();
  const getStationNumberIndex = useStationNumberIndexFunc();
  const { arrivedThreshold, approachingThreshold } = useThreshold();
  const { isWrongDirection, isLoopLineWrongDirection } =
    useWrongDirectionDetector();
  // 同一の次駅区間で逆方向通知が複数回鳴るのを防ぐため、通知済みの次駅IDを記憶する。
  // isWrongDirection の単なる false 復帰ではリセットせず、次駅が変わるまで保持する。
  const lastNotifiedWrongDirectionStationIdRef = useRef<number | null>(null);

  // GPS精度に応じた実効閾値を算出する
  // 精度が悪い場合は判定圏を広げることで検知漏れを減らす
  const accuracyBonus = useMemo(() => {
    if (accuracy == null || !Number.isFinite(accuracy) || accuracy <= 0) {
      return 0;
    }
    return Math.min(accuracy * 0.5, MAX_ACCURACY_BONUS);
  }, [accuracy]);

  const effectiveArrivedThreshold = arrivedThreshold + accuracyBonus;
  const effectiveApproachingThreshold = approachingThreshold + accuracyBonus;

  const isArrived = useMemo((): boolean => {
    if (latitude == null || longitude == null || !nearestStation) {
      return true;
    }

    // 現在位置を信用できない状況では到着判定の信頼性が担保できないため、
    // 強制的に未到着(=走行中)とみなす。次の2系統を区別して検査する:
    //   1. 継続測位: handleTrackingLocationが最大許容精度超の測位を棄却して
    //      座標を凍結するため、精度悪化はlocationAtom側には現れない。棄却の事実は
    //      外れ値フラグ(isAccuracyOutlier)から判定する。
    //   2. ワンショット取得・手動選択: フィルタを経由せず粗い精度の測位がlocationAtomに
    //      入りうるため、保持している精度を直接検査する。
    // この強制未到着はRemote Configのフィーチャートグルで無効化でき、無効時は
    // 精度に依らず通常の到着判定を行う。
    if (
      isForceNotArrivedOnLowAccuracyEnabled() &&
      (isAccuracyOutlier ||
        (accuracy != null && accuracy > getMaxPermitAccuracy()))
    ) {
      return false;
    }

    // グレース期間は到着を引き起こした駅にのみ適用する
    // 別の駅に対してtrueを返すと誤って駅が進んでしまう
    const inGracePeriod =
      Date.now() - lastArrivedTimeRef.current < ARRIVED_GRACE_PERIOD_MS;
    if (
      inGracePeriod &&
      nearestStation.id === lastArrivedStationIdRef.current
    ) {
      return true;
    }

    if (nearestStation.latitude == null || nearestStation.longitude == null) {
      return true;
    }

    // R1(到着圏の緩和): 精度劣化(>200m)時に、ETA仮想時計が最寄り停車駅での
    // 停車(DWELLING)を示す場合に限り、その駅の到着圏を広げる。GPSの最寄り駅と
    // ETAが同じ駅を指すときのみ効く確認的な緩和で、精度が良い通常時(≤200m)は
    // この分岐に入らず到着判定は一切変わらない。etaPhaseAtom は毎秒更新されるため
    // 再レンダーを避けて非リアクティブに参照し、測位更新時の再評価で拾う。
    let arrivedRadius = effectiveArrivedThreshold;
    if (
      isEtaAssistEnabled() &&
      accuracy != null &&
      accuracy > BAD_ACCURACY_THRESHOLD
    ) {
      const phase = store.get(etaPhaseAtom);
      if (phase?.kind === 'DWELLING' && phase.stationId === nearestStation.id) {
        arrivedRadius =
          arrivedThreshold + Math.min(accuracy * 0.5, ETA_ARRIVED_BONUS_CAP);
      }
    }

    const arrived = isPointWithinRadius(
      { latitude, longitude },
      {
        latitude: nearestStation.latitude as number,
        longitude: nearestStation.longitude as number,
      },
      arrivedRadius
    );

    if (arrived) {
      lastArrivedTimeRef.current = Date.now();
      lastArrivedStationIdRef.current = nearestStation.id ?? null;
    }
    return arrived;
  }, [
    accuracy,
    isAccuracyOutlier,
    effectiveArrivedThreshold,
    arrivedThreshold,
    latitude,
    longitude,
    nearestStation,
  ]);

  const isApproaching = useMemo((): boolean => {
    if (
      latitude == null ||
      longitude == null ||
      approachingStation == null ||
      approachingStation.latitude == null ||
      approachingStation.longitude == null
    ) {
      return false;
    }

    return isPointWithinRadius(
      { latitude, longitude },
      {
        latitude: approachingStation.latitude as number,
        longitude: approachingStation.longitude as number,
      },
      effectiveApproachingThreshold
    );
  }, [effectiveApproachingThreshold, latitude, longitude, approachingStation]);

  const sendApproachingNotification = useCallback(
    async (s: Station, notifyType: NotifyType) => {
      const stationNumberIndex = getStationNumberIndex(s);
      const stationNumber =
        s.stationNumbers?.[stationNumberIndex]?.stationNumber;
      const stationNumberMaybeEmpty = `${
        stationNumber ? `(${stationNumber})` : ''
      }`;
      const approachingText = isJapanese
        ? `まもなく、${s.name}${stationNumberMaybeEmpty}に到着します。`
        : `Arriving at ${s.nameRoman}${stationNumberMaybeEmpty}.`;
      const arrivedText = isJapanese
        ? `ただいま、${s.name}${stationNumberMaybeEmpty}に到着しました。`
        : `Now stopping at ${s.nameRoman}${stationNumberMaybeEmpty}.`;

      await sendNotificationAsync({
        title: isJapanese ? 'お知らせ' : 'Announcement',
        body: notifyType === 'APPROACHING' ? approachingText : arrivedText,
      });
    },
    [getStationNumberIndex]
  );

  useEffect(() => {
    if (!canGoForward || etaFallbackActive) {
      return;
    }

    // 接近通知はヘッダーの「まもなく」と同じく現在地基準の接近駅(次に到着する停車駅)を
    // 基準にする。通知される駅名・発火対象がヘッダー表示と一致し、発車直後の駅や通過駅で
    // 誤って鳴らない。到着判定の取りこぼし時も接近駅側へ自己修復する。
    if (
      isApproaching &&
      approachingStation?.id != null &&
      targetStationIds.includes(approachingStation.id) &&
      approachingStation.id !== approachingNotifiedIdRef.current
    ) {
      void sendApproachingNotification(approachingStation, 'APPROACHING').catch(
        () => {}
      );
      approachingNotifiedIdRef.current = approachingStation.id;
    }

    // 到着通知は実際に到着した最寄り駅を基準にする
    if (
      isArrived &&
      nearestStation?.id != null &&
      targetStationIds.includes(nearestStation.id) &&
      nearestStation.id !== arrivedNotifiedIdRef.current
    ) {
      void sendApproachingNotification(nearestStation, 'ARRIVED').catch(
        () => {}
      );
      arrivedNotifiedIdRef.current = nearestStation.id;
    }
  }, [
    canGoForward,
    etaFallbackActive,
    isApproaching,
    isArrived,
    approachingStation,
    nearestStation,
    sendApproachingNotification,
    targetStationIds,
  ]);

  useEffect(() => {
    // 次駅が変わった場合は通知済みフラグをクリアし、新しい区間で再通知できるようにする
    if (
      lastNotifiedWrongDirectionStationIdRef.current !== null &&
      lastNotifiedWrongDirectionStationIdRef.current !== nextStationId
    ) {
      lastNotifiedWrongDirectionStationIdRef.current = null;
    }

    if (
      !wrongDirectionNotifyEnabled ||
      (!isWrongDirection && !isLoopLineWrongDirection) ||
      nextStationId == null ||
      lastNotifiedWrongDirectionStationIdRef.current === nextStationId
    ) {
      return;
    }

    const bodyKey = isLoopLineWrongDirection
      ? 'wrongDirectionLoopLineWarning'
      : 'wrongDirectionWarning';
    sendNotificationAsync({
      title: translate('wrongDirectionNotificationTitle'),
      body: translate(bodyKey),
    }).catch(() => {});
    lastNotifiedWrongDirectionStationIdRef.current = nextStationId;
  }, [
    isWrongDirection,
    isLoopLineWrongDirection,
    nextStationId,
    wrongDirectionNotifyEnabled,
  ]);

  useEffect(() => {
    if (!nearestStation || etaFallbackActive) {
      return;
    }

    // 値が変わらない場合はprevをそのまま返し、新オブジェクト生成による
    // 全購読者への不要な再レンダー通知を避ける
    setStation((prev) => {
      const approaching =
        !isArrived && !getIsPass(nearestStation) && isApproaching;
      const station =
        isArrived && prev.station?.id !== nearestStation.id
          ? nearestStation
          : prev.station;
      if (
        prev.approaching === approaching &&
        prev.arrived === isArrived &&
        prev.station === station
      ) {
        return prev;
      }
      return { ...prev, approaching, arrived: isArrived, station };
    });

    if (isArrived && !getIsPass(nearestStation)) {
      setNavigation((prev) =>
        prev.stationForHeader?.id !== nearestStation.id
          ? { ...prev, stationForHeader: nearestStation }
          : prev
      );
    }
  }, [
    etaFallbackActive,
    isApproaching,
    isArrived,
    nearestStation,
    setNavigation,
    setStation,
  ]);
};
