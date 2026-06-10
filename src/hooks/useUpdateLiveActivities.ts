import { useAtomValue } from 'jotai';
import { useEffect, useMemo, useState } from 'react';
import type { Station } from '~/@types/graphql';
import { getLocalizedLineName, isBusLine } from '~/utils/line';
import { parenthesisRegexp } from '../constants';
import { directionToDirectionName } from '../models/Bound';
import {
  approachingAtom,
  arrivedAtom,
  selectedBoundAtom,
  selectedDirectionAtom,
  stationsAtom,
} from '../store/atoms/station';
import { isJapanese } from '../translation';
import getIsPass from '../utils/isPass';
import {
  startLiveUpdate,
  stopLiveUpdate,
  updateLiveUpdate,
} from '../utils/native/android/liveUpdateModule';
import {
  startLiveActivity,
  stopLiveActivity,
  updateLiveActivity,
} from '../utils/native/ios/liveActivityModule';
import { useBounds } from './useBounds';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentStation } from './useCurrentStation';
import { useCurrentTrainType } from './useCurrentTrainType';
import { useDisplayNextStation } from './useDisplayNextStation';
import { useIsNextLastStop } from './useIsNextLastStop';
import { useIsPassing } from './useIsPassing';
import { useLoopLine } from './useLoopLine';
import { useNextStation } from './useNextStation';
import { useStationNumberIndexFunc } from './useStationNumberIndexFunc';

/**
 * ライブアクティビティの「まもなく(次駅)」として見せる駅を決める。
 *
 * 左(停車駅)は記録基準(useCurrentStation)、右(まもなく)はGPS基準
 * (useDisplayNextStation→useApproachingStation)で算出するため基準が異なる。
 * 到着↔発車の遷移や native ウィジェットのフィールド保持により、右が停車駅と
 * 同一駅へ collapse して「X → まもなく X」と無意味表示になることがある。
 * その collapse 時だけ記録基準の次駅へフォールバックして回避する。
 * 通常時・GPS自己修復時(右≠左)は displayNextStation をそのまま返す。
 */
export const pickLiveActivityNextStation = (
  displayNextStation: Station | undefined,
  recordNextStation: Station | undefined,
  stoppedStation: Station | undefined
): Station | undefined =>
  displayNextStation &&
  stoppedStation &&
  displayNextStation.groupId === stoppedStation.groupId
    ? recordNextStation
    : displayNextStation;

export const useUpdateLiveActivities = (): void => {
  const [started, setStarted] = useState(false);
  const arrivedFromState = useAtomValue(arrivedAtom);
  const approachingFromState = useAtomValue(approachingAtom);
  const selectedBound = useAtomValue(selectedBoundAtom);
  const selectedDirection = useAtomValue(selectedDirectionAtom);
  const stations = useAtomValue(stationsAtom);

  const currentLine = useCurrentLine();
  const previousStation = useCurrentStation(true);
  const currentStation = useCurrentStation(false, true);
  // まもなく表示時は現在地基準で実際に接近している駅を次駅として通知する
  const displayNextStation = useDisplayNextStation();
  // collapse 時のフォールバック用に記録基準の次駅も保持する(下の nextStation で使用)
  const recordNextStation = useNextStation();
  const { directionalStops } = useBounds(stations);
  const isNextLastStop = useIsNextLastStop();
  const getStationNumberIndex = useStationNumberIndexFunc();
  const trainType = useCurrentTrainType();
  const {
    isLoopLine: isFullLoopLine,
    isPartiallyLoopLine,
    isYamanoteLine,
    isOsakaLoopLine,
  } = useLoopLine();
  const isPassing = useIsPassing();

  const trainTypeName = useMemo(() => {
    // 現状種別が存在するバス路線を扱っていないので、種別名は表示しない
    if (isBusLine(currentLine)) {
      return '';
    }

    // 山手線か大阪環状線の直通がない種別が選択されていて、日本語環境でもない場合
    // 英語だとInbound/Outboundとなり本質と違うので空の文字列を渡して表示しないようにしている
    // 名古屋市営地下鉄名城線は主要行き先を登録していないので、Clockwise/Counterclockwiseのままにしている
    if ((isYamanoteLine || isOsakaLoopLine) && !isJapanese) {
      return '';
    }
    if (selectedDirection && isFullLoopLine) {
      return directionToDirectionName(currentStation?.line, selectedDirection);
    }
    if (isJapanese) {
      return (trainType?.name ?? '各駅停車')
        .replace(parenthesisRegexp, '')
        .replace(/\n/, '');
    }
    return (trainType?.nameRoman ?? 'Local')
      .replace(parenthesisRegexp, '')
      .replace(/\n/, '');
  }, [
    currentLine,
    currentStation?.line,
    isFullLoopLine,
    isOsakaLoopLine,
    isYamanoteLine,
    selectedDirection,
    trainType?.name,
    trainType?.nameRoman,
  ]);

  const boundStationName = useMemo(() => {
    const names = directionalStops
      .map((s) => (isJapanese ? s.name : s.nameRoman))
      .join(isJapanese ? '・' : '/');

    return isJapanese ? `${names}方面` : names;
  }, [directionalStops]);

  const boundStationNumber = useMemo(() => {
    return directionalStops
      .map((s) => {
        const stationIndex = getStationNumberIndex(s);
        return s?.stationNumbers?.[stationIndex]?.stationNumber;
      })
      .join('/');
  }, [directionalStops, getStationNumberIndex]);

  const stoppedStation = useMemo(
    () =>
      arrivedFromState && !approachingFromState && !getIsPass(currentStation)
        ? currentStation
        : previousStation,
    [approachingFromState, arrivedFromState, currentStation, previousStation]
  );
  const stationName = useMemo(
    () => (isJapanese ? stoppedStation?.name : stoppedStation?.nameRoman) ?? '',
    [stoppedStation?.name, stoppedStation?.nameRoman]
  );

  // 右(まもなく)が左(停車駅)と同一駅へ collapse する遷移時だけ記録基準の次駅へ
  // フォールバックし、「X → まもなく X」を防ぐ(通常時・GPS自己修復時は不変)。
  const nextStation = useMemo(
    () =>
      pickLiveActivityNextStation(
        displayNextStation,
        recordNextStation,
        stoppedStation
      ),
    [displayNextStation, recordNextStation, stoppedStation]
  );

  const nextStationName = useMemo(
    () => (isJapanese ? nextStation?.name : nextStation?.nameRoman) ?? '',
    [nextStation?.name, nextStation?.nameRoman]
  );

  const stoppedStationNumberingIndex = useMemo(
    () => getStationNumberIndex(stoppedStation),
    [getStationNumberIndex, stoppedStation]
  );
  const stationNumber = useMemo(
    () =>
      stoppedStation?.stationNumbers?.[stoppedStationNumberingIndex]
        ?.stationNumber ?? '',
    [stoppedStation?.stationNumbers, stoppedStationNumberingIndex]
  );

  const nextStationNumberingIndex = useMemo(
    () => getStationNumberIndex(nextStation),
    [getStationNumberIndex, nextStation]
  );
  const nextStationNumber = useMemo(() => {
    return (
      nextStation?.stationNumbers?.[nextStationNumberingIndex]?.stationNumber ??
      ''
    );
  }, [nextStation?.stationNumbers, nextStationNumberingIndex]);

  const stopped = useMemo(
    () => arrivedFromState && !isPassing,
    [arrivedFromState, isPassing]
  );

  const lineColor = useMemo(
    () => currentLine?.color ?? '#000000',
    [currentLine?.color]
  );
  const lineName = useMemo(
    () => getLocalizedLineName(currentLine, isJapanese),
    [currentLine]
  );

  const passingStationName = useMemo(
    () =>
      !isPassing
        ? ''
        : ((isJapanese ? currentStation?.name : currentStation?.nameRoman) ??
          ''),
    [currentStation?.name, currentStation?.nameRoman, isPassing]
  );

  const currentStationNumberingIndex = useMemo(
    () => getStationNumberIndex(currentStation),
    [currentStation, getStationNumberIndex]
  );

  const passingStationNumber = useMemo(
    () =>
      !isPassing
        ? ''
        : (currentStation?.stationNumbers?.[currentStationNumberingIndex]
            ?.stationNumber ?? ''),
    [currentStation?.stationNumbers, currentStationNumberingIndex, isPassing]
  );

  const isLoopLine = useMemo(
    () => isFullLoopLine || isPartiallyLoopLine,
    [isFullLoopLine, isPartiallyLoopLine]
  );

  const approaching = useMemo(
    () => approachingFromState,
    [approachingFromState]
  );

  const progress = useMemo(() => {
    if (stopped) {
      return 1.0;
    }
    if (approaching) {
      return 0.8;
    }
    return 0.3;
  }, [stopped, approaching]);

  const activityState = useMemo(
    () => ({
      stationName,
      nextStationName,
      stationNumber,
      nextStationNumber,
      approaching,
      stopped,
      boundStationName,
      boundStationNumber,
      trainTypeName,
      isLoopLine,
      isNextLastStop,
      lineColor,
      lineName,
      passingStationName,
      passingStationNumber,
      progress,
    }),
    [
      approaching,
      boundStationName,
      boundStationNumber,
      isLoopLine,
      isNextLastStop,
      lineColor,
      lineName,
      nextStationName,
      nextStationNumber,
      passingStationName,
      passingStationNumber,
      progress,
      stationName,
      stationNumber,
      stopped,
      trainTypeName,
    ]
  );

  useEffect(() => {
    if (selectedBound && !started) {
      startLiveActivity(activityState);
      startLiveUpdate(activityState);
      setStarted(true);
    }
  }, [activityState, selectedBound, started]);

  useEffect(() => {
    return () => {
      stopLiveActivity();
      stopLiveUpdate();
      setStarted(false);
    };
  }, []);

  useEffect(() => {
    if (started) {
      updateLiveActivity(activityState);
      updateLiveUpdate(activityState);
    }
  }, [activityState, started]);
};
